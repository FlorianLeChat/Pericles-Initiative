/**
 * Shared entry points into the application, for every spec.
 *
 * The site has no seed and no backend: what a browser shows is what its
 * `localStorage` holds. Reaching a page with content therefore means writing that
 * content into storage before the first paint, which every spec does through the
 * `wiki` fixture rather than repeating the same dance.
 *
 * Nothing in `src/` knows this suite exists. The fixture writes the very key the
 * application writes, in the very shape it writes it, so a spec proves the real
 * loading path rather than a test only one.
 *
 * @author Claude
 */

import { expect, test as base, type Locator, type Page } from "@playwright/test";
import type { Dataset, Entry, Overlay } from "$lib/types";
import { sampleDataset, toOverlay } from "./dataset";

/** Where the application keeps the content written from this browser. */
export const OVERLAY_KEY = "pericles:overlay";

/** Where the application remembers the chosen theme. */
export const THEME_KEY = "pericles:theme";

/** Where the application keeps the connection to the optional backup service. */
export const REMOTE_KEY = "pericles:remote";

/**
 * Marker telling the seeding script the content is already in place.
 *
 * An init script runs again on every navigation, so without this a reload would
 * put the fixture back over whatever the test had just written, and no spec
 * could prove that an edit survives a cold start.
 */
const SEEDED_KEY = "pericles:e2e-seeded";

/** Width below which the header hides its navigation behind the burger menu. */
const NARROW_VIEWPORT = 1024;

export interface WikiHelper {
    /** Opens a path on the sample wiki. */
    open: ( path?: string ) => Promise<void>;
    /** Opens a path on a browser holding nothing, which is how a first visitor arrives. */
    openEmpty: ( path?: string ) => Promise<void>;
    /** Opens a path on a wiki the spec composed itself. */
    openWith: ( dataset: Dataset, path?: string ) => Promise<void>;
    /** Follows a link of the main navigation, through the burger menu on a narrow screen. */
    navigate: ( label: string ) => Promise<void>;
    /** Answers a confirmation dialog, and waits for it to be gone. */
    confirm: ( title: string, label: string ) => Promise<void>;
    /** Reads back what this browser stored, or null when it stored nothing. */
    storedOverlay: () => Promise<Overlay | null>;
    /** Reads back a single stored page, by slug. */
    storedEntry: ( slug: string ) => Promise<Entry | undefined>;
}

/**
 * Tells whether the running project uses a phone sized viewport.
 *
 * The header shows its navigation from the `lg` breakpoint up and hides it behind
 * a burger below, so a spec touching navigation has to know which one it is
 * looking at.
 *
 * @param page Page under test.
 * @returns True when the burger menu is the only way into the navigation.
 * @author Claude
 */
export const isNarrow = ( page: Page ): boolean => ( page.viewportSize()?.width ?? 0 ) < NARROW_VIEWPORT;

/**
 * Waits for the mobile navigation drawer to have left the page.
 *
 * The drawer is a `<dialog>` opened with `showModal`, and it slides away rather
 * than vanishing. Until that is over it is still modal, so the page underneath
 * is inert and anything aimed at it, a tap or a filled field, is dropped without
 * a word. Every path that closes the drawer therefore has to wait for it.
 *
 * @param page Page under test.
 * @returns Resolves once the drawer is gone.
 * @author Claude
 */
export const waitForDrawer = async ( page: Page ): Promise<void> =>
{
    await expect( page.getByRole( "dialog", { name: "Navigation du site" } ) ).toBeHidden();
};

/**
 * Locates one figure of the home page hero, by its label.
 *
 * @param page Page under test.
 * @param label Label of the figure, such as `Fiches`.
 * @returns The element holding the number.
 * @author Claude
 */
export const heroFigure = ( page: Page, label: string ): Locator =>
    page.locator( `main dl > div:has(dt:text-is("${ label }")) dd` );

/**
 * Builds the helper handed to every spec.
 *
 * @param page Page under test.
 * @returns The helper.
 * @author Claude
 */
const createHelper = ( page: Page ): WikiHelper =>
{
    const openWith = async ( dataset: Dataset, path = "/" ): Promise<void> =>
    {
        await page.addInitScript(
            ( payload: { key: string; flag: string; value: string } ) =>
            {
                try
                {
                    if ( window.localStorage.getItem( payload.flag ) === null )
                    {
                        window.localStorage.setItem( payload.flag, "1" );
                        window.localStorage.setItem( payload.key, payload.value );
                    }
                }
                catch
                {
                    // `about:blank` has no storage of its own, and needs none: the
                    // script runs again on the page actually under test.
                }
            },
            { key: OVERLAY_KEY, flag: SEEDED_KEY, value: JSON.stringify( toOverlay( dataset ) ) }
        );

        await page.goto( path );

        // The overlay is only read once hydrated, so the static HTML carries the
        // empty wiki for a moment. Waiting on the name proves it has been applied.
        await expect( page.getByRole( "banner" ) ).toContainText( dataset.meta.universe );
    };

    const open = async ( path = "/" ): Promise<void> =>
    {
        await openWith( sampleDataset(), path );
    };

    const openEmpty = async ( path = "/" ): Promise<void> =>
    {
        await page.goto( path );
        await expect( page.getByRole( "banner" ) ).toContainText( "Univers sans nom" );
    };

    const navigate = async ( label: string ): Promise<void> =>
    {
        const mobile = isNarrow( page );

        if ( mobile )
        {
            await page.getByRole( "button", { name: "Ouvrir la navigation" } ).click();
        }

        const menu = page.getByRole( "navigation", { name: mobile ? "Navigation mobile" : "Navigation principale" } );

        await menu.getByRole( "link", { name: label, exact: true } ).click();

        if ( mobile )
        {
            await waitForDrawer( page );
        }
    };

    /**
     * Presses a button of a confirmation dialog, then waits for the dialog to go.
     *
     * The wait is the point of this helper. These dialogs are real `<dialog>`
     * elements opened with `showModal`, and they fade out rather than vanish, so
     * for the length of that fade the page behind them is still inert: a click or
     * a fill aimed at it in that window lands on nothing, silently, and the spec
     * carries on against a page that never received it.
     *
     * @param title Accessible name of the dialog.
     * @param label Name of the button to press.
     * @returns Resolves once the dialog has left the page.
     * @author Claude
     */
    const confirm = async ( title: string, label: string ): Promise<void> =>
    {
        const dialog = page.getByRole( "dialog", { name: title } );

        await dialog.getByRole( "button", { name: label, exact: true } ).click();
        await expect( dialog ).toBeHidden();
    };

    const storedOverlay = async (): Promise<Overlay | null> =>
    {
        const raw = await page.evaluate( ( key ) => window.localStorage.getItem( key ), OVERLAY_KEY );

        return raw === null ? null : ( JSON.parse( raw ) as Overlay );
    };

    const storedEntry = async ( slug: string ): Promise<Entry | undefined> =>
    {
        const overlay = await storedOverlay();

        return Object.values( overlay?.entries ?? {} ).find( ( entry ) => entry.slug === slug );
    };

    return { open, openEmpty, openWith, navigate, confirm, storedOverlay, storedEntry };
};

export const test = base.extend<{ wiki: WikiHelper }>( {
    wiki: async ( { page }, use ) =>
    {
        await use( createHelper( page ) );
    }
} );

export { expect };
