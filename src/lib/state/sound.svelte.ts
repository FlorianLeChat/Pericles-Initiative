/**
 * Whether this device plays the sounds of the interface.
 *
 * The cues come from `cuelume`, which synthesises them with Web Audio rather
 * than loading recordings. They stay silent until a reader turns them on from
 * `/settings`: the wiki is consulted at the table, during a session, and a
 * device chiming on its own in the middle of a scene is the opposite of what a
 * player looks it up for.
 *
 * Like the use of the device, it is a preference of this browser, not of the
 * wiki: it never enters the overlay and never leaves with an export.
 *
 * The library is imported only once sound is on, or about to be chosen, so a
 * reader who never turns it on downloads none of it. Components never import
 * it either: the controls carry `data-cuelume-*` attributes, inert until `bind`
 * runs, and the outcomes of an action go through `cue`, which does nothing
 * while the device is silent.
 *
 * @author Claude
 */

import { browser } from "$app/env";
import type { Attachment } from "svelte/attachments";
import type { Emphasis, PlayOptions, SoundName, ThemeName } from "cuelume";
import { DEFAULT_SOUND_THEME, soundThemeOf } from "#lib/config/sounds.ts";

type Cuelume = typeof import( "cuelume" );

/** Key of `localStorage` remembering the choice, absent while the device is silent. */
const STORAGE_KEY = "pericles:sound";

/** Key of `localStorage` remembering the material, absent while it is the default one. */
const THEME_KEY = "pericles:sound-theme";

/** Stored value marking a device that plays the sounds. */
const SOUND_VALUE = "on";

/** For this long after an outcome, in milliseconds, a dialog moving makes no sound of its own. */
const OUTCOME_PRECEDENCE = 150;

/** An element `bind` already sounds on a click, or one inside it. */
const CUED_ELEMENT = [
    "[data-cuelume-tap]",
    "[data-cuelume-select]",
    "[data-cuelume-toggle]",
    "[data-cuelume-open]",
    "[data-cuelume-close]",
    "[data-cuelume-navigate]"
].join( ", " );

class SoundStore
{
    /**
     * True when this device plays the sounds.
     *
     * False while prerendering and until `load` has run, like the use of the
     * device, so nothing about it ever reaches the static HTML.
     */
    enabled = $state( false );

    /** Material the cues are played in, chosen on `/settings` beside the sounds themselves. */
    theme = $state<ThemeName>( DEFAULT_SOUND_THEME );

    /** The library once asked for, shared by every caller, or null while never asked for. */
    #module: Promise<Cuelume | null> | null = null;

    /** When `cue` last reported an outcome, in milliseconds of `performance.now()`. */
    #lastOutcome = -Infinity;

    /** True once the document taps the links it is clicked on, see `#listenToLinks`. */
    #listeningToLinks = false;

    /**
     * Reads the stored choice, and wires the sounds when they are on.
     *
     * Called from the root layout once mounted. No audio starts here: the
     * browser refuses it before an interaction, and the library resumes it on
     * the first bound gesture.
     *
     * @author Claude
     */
    load(): void
    {
        if ( !browser )
        {
            return;
        }

        try
        {
            this.enabled = localStorage.getItem( STORAGE_KEY ) === SOUND_VALUE;
            this.theme = soundThemeOf( localStorage.getItem( THEME_KEY ) );
        }
        catch
        {
            this.enabled = false;
        }

        if ( this.enabled )
        {
            void this.#start();
        }
    }

    /**
     * Fetches the library ahead of a choice, without turning anything on.
     *
     * The settings page calls it when it mounts: `unlock` only starts audio
     * from inside the gesture that asked for it, and a download still running
     * when the reader picks «Sons activés» could outlast that gesture.
     *
     * @author Claude
     */
    preload(): void
    {
        if ( browser )
        {
            void this.#import();
        }
    }

    /**
     * Applies a choice at once and remembers it.
     *
     * Turning sound on plays one quiet confirmation, so the reader hears what
     * they just chose, and whether this browser lets the page sound at all.
     *
     * @param enabled True to play the sounds on this device, false to silence them.
     * @returns Resolves once the library has taken the choice into account.
     * @author Claude
     */
    async set( enabled: boolean ): Promise<void>
    {
        this.enabled = enabled;

        try
        {
            if ( enabled )
            {
                localStorage.setItem( STORAGE_KEY, SOUND_VALUE );
            }
            else
            {
                localStorage.removeItem( STORAGE_KEY );
            }
        }
        catch
        {
            /* storage unavailable, the choice holds until the page is left */
        }

        if ( enabled )
        {
            const cuelume = await this.#start();
            const unlocked = await cuelume?.unlock();

            if ( unlocked )
            {
                cuelume?.play( "success", { emphasis: "subtle" } );
            }

            return;
        }

        const cuelume = this.#module ? await this.#module : null;

        cuelume?.setEnabled( false );
    }

    /**
     * Switches the material of the cues and remembers it.
     *
     * A preview follows the choice, the opening of a panel, since that is the
     * cue a reader hears most and the one a material changes the most: picking
     * a material by its name alone would be picking blind.
     *
     * @param theme Material to play the cues in from now on.
     * @param preview Whether to play the preview, false when the choice is reset rather than made.
     * @returns Resolves once the library plays in the new material.
     * @author Claude
     */
    async setTheme( theme: ThemeName, preview = true ): Promise<void>
    {
        this.theme = theme;

        try
        {
            if ( theme === DEFAULT_SOUND_THEME )
            {
                localStorage.removeItem( THEME_KEY );
            }
            else
            {
                localStorage.setItem( THEME_KEY, theme );
            }
        }
        catch
        {
            /* storage unavailable, the material holds until the page is left */
        }

        const cuelume = this.#module ? await this.#module : null;

        cuelume?.setTheme( theme );

        if ( preview && this.enabled )
        {
            cuelume?.play( "open" );
        }
    }

    /**
     * Plays the cue reporting the outcome of an action, when this device plays sounds.
     *
     * For what no control of the markup can say on its own: a page that was
     * saved, a restore that failed, an export that is ready.
     *
     * @param name Cue to play, chosen by the job it reports.
     * @param options Emphasis, direction or volume of this play only.
     * @author Claude
     */
    cue( name: SoundName, options?: PlayOptions ): void
    {
        if ( !this.enabled || !this.#module )
        {
            return;
        }

        this.#lastOutcome = performance.now();
        void this.#module.then( ( cuelume ) => cuelume?.play( name, options ) );
    }

    /**
     * Sounds a `<dialog>` opening and closing, whatever opened or closed it.
     *
     * A dialog is opened by a button, a shortcut or a link of the palette, and
     * closed by its own buttons, by Escape or by the page behind it, so the cue
     * follows the `open` attribute of the element rather than any one of those
     * triggers. Passed to Flowbite's `Modal` and `Drawer`, which spread it onto
     * their `<dialog>`. Flowbite mounts that element only while it is open and
     * closes it on its way out, so a dialog torn down while it was heard open
     * sounds its closing from the cleanup: the attribute changing then is too late
     * to be observed.
     *
     * The closing cue waits for the end of the task and yields to an outcome
     * played by `cue` in the meantime: a confirmation closing on a deletion
     * sounds the deletion, once, rather than the deletion over a closing panel.
     *
     * @param emphasis How much the panel matters, `subtle` for one that opens often.
     * @returns The attachment to spread onto the dialog.
     * @author Claude
     */
    dialog( emphasis: Emphasis = "normal" ): Attachment<HTMLElement>
    {
        return ( node ) =>
        {
            let shown = false;

            const observer = new MutationObserver( () =>
            {
                const nowShown = node.hasAttribute( "open" );

                if ( nowShown !== shown )
                {
                    shown = nowShown;
                    this.#ambient( nowShown ? "open" : "close", { emphasis } );
                }
            } );

            observer.observe( node, { attributes: true, attributeFilter: [ "open" ] } );

            return () =>
            {
                observer.takeRecords();
                observer.disconnect();

                if ( shown )
                {
                    this.#ambient( "close", { emphasis } );
                }
            };
        };
    }

    /**
     * Plays a cue no gesture asked for by name, unless an outcome was just reported.
     *
     * @param name Cue to play.
     * @param options Emphasis of this play.
     * @author Claude
     */
    #ambient( name: SoundName, options: PlayOptions ): void
    {
        if ( !this.enabled || !this.#module )
        {
            return;
        }

        setTimeout( () =>
        {
            const outcomeJustPlayed = performance.now() - this.#lastOutcome < OUTCOME_PRECEDENCE;

            if ( !outcomeJustPlayed )
            {
                void this.#module?.then( ( cuelume ) => cuelume?.play( name, options ) );
            }
        } );
    }

    /**
     * Imports the library once, and forgets a failed import so a later call may retry.
     *
     * @returns The library, or null when it could not be fetched.
     * @author Claude
     */
    #import(): Promise<Cuelume | null>
    {
        this.#module ??= import( "cuelume" ).catch( () =>
        {
            this.#module = null;

            return null;
        } );

        return this.#module;
    }

    /**
     * Turns the library on and wires every `data-cuelume-*` control of the document.
     *
     * `bind` is idempotent and follows the elements added later, so calling it
     * again after silencing and turning back on costs nothing.
     *
     * @returns The library, or null when it could not be fetched.
     * @author Claude
     */
    async #start(): Promise<Cuelume | null>
    {
        const cuelume = await this.#import();

        if ( cuelume && this.enabled )
        {
            cuelume.setEnabled( true );
            cuelume.setTheme( this.theme );
            cuelume.bind();
            this.#listenToLinks();
        }

        return cuelume;
    }

    /**
     * Taps every link the reader follows, once, for the rest of the visit.
     *
     * Links are the most common gesture of a wiki, in the header, the drawer,
     * the tools, the breadcrumb, the cards of a listing and the body of a page,
     * and marking each of them by hand would leave the next one silent. One
     * listener on the document covers them all, the ones a page renders later
     * included. It plays through `cue`, which stays silent once the device is,
     * and which a panel closing on the same click yields to. A link already
     * carrying a cue of its own keeps it rather than sounding twice.
     *
     * @author Claude
     */
    #listenToLinks(): void
    {
        if ( this.#listeningToLinks )
        {
            return;
        }

        this.#listeningToLinks = true;

        document.addEventListener( "click", ( event ) =>
        {
            const target = event.target instanceof Element ? event.target : null;
            const link = target?.closest( "a[href]" );
            const alreadyCued = link?.closest( CUED_ELEMENT ) !== null;

            if ( link && !alreadyCued )
            {
                this.cue( "tap" );
            }
        }, { capture: true } );
    }
}

export const sound = new SoundStore();
