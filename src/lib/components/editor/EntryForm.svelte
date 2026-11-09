<script lang="ts">
    /**
     * Creation and edition form of a page.
     *
     * @author Claude
     */
    import { untrack } from "svelte";
    import { resolve } from "$app/paths";
    import X from "@lucide/svelte/icons/x";
    import Kbd from "flowbite-svelte/Kbd.svelte";
    import * as m from "#lib/locales/messages.js";
    import Check from "@lucide/svelte/icons/check";
    import InfoboxCard from "./InfoboxCard.svelte";
    import WritingHelp from "./WritingHelp.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import EntryHeading from "./EntryHeading.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import type { ResolvedPathname } from "$app/types";
    import EntrySettings from "./EntrySettings.svelte";
    import { sound } from "#lib/state/sound.svelte.ts";
    import TemplatePicker from "./TemplatePicker.svelte";
    import { pluralize } from "#lib/utilities/plural.ts";
    import MarkdownEditor from "./MarkdownEditor.svelte";
    import { createId } from "#lib/utilities/dataset.ts";
    import { beforeNavigate, goto } from "$app/navigation";
    import { platform } from "#lib/state/platform.svelte.ts";
    import { slugify, uniqueSlug } from "#lib/utilities/slug.ts";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import type { Entry, EntryDate, EntryStatus, InfoboxField } from "#lib/types.ts";
    import { countWords, describeLength, dropEmptySections } from "#lib/utilities/markdown.ts";
    import { BLANK_TEMPLATE, templateBody, type PageTemplate } from "#lib/config/templates.ts";

    interface Props {
        /** Page being edited, absent when creating one. */
        entry?: Entry;
        /** Slug imposed by the caller, typically coming from a red link. */
        initialSlug?: string;
        initialTitle?: string;
    }

    let { entry, initialSlug = "", initialTitle = "" }: Props = $props();

    /**
     * The page the form is currently the editor of.
     *
     * Seeded from the prop, and replaced by what `Ctrl+S` writes: saving a new
     * page without leaving makes the form the editor of the page it just
     * created, so a second save updates it rather than writing a second one.
     */
    let current = $state( untrack( () => entry ) );

    /**
     * The form is a snapshot: it is seeded once from the props, and the parent
     * remounts it with `{#key}` when another page has to be edited. Reading the
     * props untracked states that intent instead of tripping over it.
     */
    const initial = untrack( () => ( {
        title: entry?.title ?? initialTitle,
        slug: entry?.slug ?? initialSlug,
        summary: entry?.summary ?? "",
        body: entry?.body ?? "",
        categories: [ ...( entry?.categories ?? [] ) ],
        infobox: ( entry?.infobox ?? [] ).map( ( field ) => ( { ...field } ) ),
        imageSrc: entry?.image?.src ?? "",
        imageAlt: entry?.image?.alt ?? "",
        imageCaption: entry?.image?.caption ?? "",
        dates: ( entry?.dates ?? [] ).map( ( date ) => ( { ...date } ) ),
        aliases: [ ...( entry?.aliases ?? [] ) ],
        status: entry?.status ?? ( "brouillon" as EntryStatus ),
        /** The slug stops following the title as soon as it is known. */
        slugLocked: Boolean( entry ?? initialSlug )
    } ) );

    let title = $state( initial.title );
    let slug = $state( initial.slug );
    let summary = $state( initial.summary );
    let body = $state( initial.body );
    let categories = $state<string[]>( initial.categories );
    let infobox = $state<InfoboxField[]>( initial.infobox );
    let imageSrc = $state( initial.imageSrc );
    let imageAlt = $state( initial.imageAlt );
    let imageCaption = $state( initial.imageCaption );
    let dates = $state<EntryDate[]>( initial.dates );
    let aliases = $state<string[]>( initial.aliases );
    let status = $state<EntryStatus>( initial.status );
    let slugLocked = $state( initial.slugLocked );

    /**
     * Values the form is compared against to tell whether anything was changed.
     *
     * It starts as the seed above and moves to whatever was last written, which
     * is what lets a save leave the form clean without remounting it.
     */
    let baseline = $state( initial );

    let deleteOpen = $state( false );
    let relink = $state( true );
    let saved = $state( false );
    let leaveOpen = $state( false );
    let leaving = $state( false );

    /** Template the page is being written from, offered only while it is created. */
    let template = $state<PageTemplate>( BLANK_TEMPLATE );

    /** Template waiting for the writer to agree that it replaces what is written. */
    let pendingTemplate: PageTemplate | null = null;
    let templateConfirmOpen = $state( false );

    /**
     * Counters bumped to remount what cannot follow on its own.
     *
     * Milkdown reads its Markdown once, so a template writing a new body has to
     * start a new editor; a radio the writer clicked but whose change was then
     * refused stays checked in the browser, so the row is drawn again.
     */
    let bodyRevision = $state( 0 );
    let pickerRevision = $state( 0 );

    /** Where the reader was going when the guard stopped them. */
    let destination: URL | null = null;

    /**
     * Reads a url the router was navigating to as an already resolved path.
     *
     * `resolve` exists to prepend the base path, and the site is deployed under
     * one, so a url coming out of a navigation already carries it: resolving it
     * again would write the base twice. The assertion says as much, in the one
     * place that knows where the url came from.
     *
     * @param url Url the navigation was aimed at.
     * @returns Its path and query string, as a resolved path.
     * @author Claude
     */
    const resolvedPath = ( url: URL ): ResolvedPathname => `${ url.pathname }${ url.search }` as ResolvedPathname;

    /**
     * Reads the current values of every field.
     *
     * @returns The values, copied deeply enough to survive a later edit.
     * @author Claude
     */
    const fields = (): typeof initial => ( {
        title,
        slug,
        summary,
        body,
        categories: [ ...categories ],
        infobox: infobox.map( ( field ) => ( { ...field } ) ),
        imageSrc,
        imageAlt,
        imageCaption,
        dates: dates.map( ( date ) => ( { ...date } ) ),
        aliases: [ ...aliases ],
        status,
        slugLocked
    } );

    /**
     * Compares two lists item by item, in order.
     *
     * @param left First list.
     * @param right Second list.
     * @param same Tells whether two items at the same position are equal.
     * @returns True when both lists hold the same items in the same order.
     * @author Claude
     */
    const sameList = <T>( left: T[], right: T[], same: ( a: T, b: T ) => boolean ): boolean =>
        left.length === right.length && left.every( ( item, index ) => same( item, right[ index ] ) );

    /*
     * The form used to be serialised to JSON and compared to a serialisation of
     * its initial values, which copied the whole body of the page on every
     * keystroke. Comparing the fields instead stops at the first difference, and
     * a body left untouched is the same string rather than a new one.
     */
    const dirty = $derived.by(
        () =>
            title !== baseline.title
            || slug !== baseline.slug
            || summary !== baseline.summary
            || body !== baseline.body
            || imageSrc !== baseline.imageSrc
            || imageAlt !== baseline.imageAlt
            || imageCaption !== baseline.imageCaption
            || status !== baseline.status
            || slugLocked !== baseline.slugLocked
            || !sameList( categories, baseline.categories, ( a, b ) => a === b )
            || !sameList( aliases, baseline.aliases, ( a, b ) => a === b )
            || !sameList( infobox, baseline.infobox, ( a, b ) => a.label === b.label && a.value === b.value )
            || !sameList( dates, baseline.dates, ( a, b ) => a.id === b.id && a.label === b.label && a.value === b.value )
    );
    const canSave = $derived( title.trim().length > 0 );

    /**
     * Whether a save was asked for while the title was empty.
     *
     * The buttons stay enabled rather than greyed out: a disabled button says
     * nothing about why, whereas an attempt can be answered under the title.
     */
    let saveAttempted = $state( false );
    const titleMissing = $derived( saveAttempted && !canSave );

    let titleField: HTMLTextAreaElement | undefined = $state();

    const isDraft = $derived( status === "brouillon" );

    /** Whether the last thing that happened is a save, which nothing has changed since. */
    const justSaved = $derived( saved && !dirty );

    /** What the bar says of the work, in place of a heading repeating the title below it. */
    const stateLine = $derived.by( () =>
    {
        if ( dirty )
        {
            return m.entry_form_state_unsaved();
        }

        if ( justSaved )
        {
            return m.entry_form_saved();
        }

        return current ? m.entry_form_state_clean() : m.entry_form_create_heading();
    } );

    /** The body as it will be stored, without the sections a template wrote and nobody filled. */
    const storedBody = $derived(
        template.sections.length > 0 ? dropEmptySections( body, template.sections.map( ( heading ) => heading() ) ) : body
    );

    const words = $derived( countWords( storedBody ) );
    const extent = $derived( describeLength( words ) );

    /**
     * Tells whether an infobox row says anything.
     *
     * A row with no value is a row the author started and left, or one a template
     * offered and nobody needed: either way it would print an intitulé over
     * nothing, so it is not saved.
     *
     * @param field Row of the infobox.
     * @returns True when the value holds something.
     * @author Claude
     */
    const isFilled = ( field: InfoboxField ): boolean => field.value.trim() !== "";

    /**
     * Tells whether a date row carries a date at all.
     *
     * Like `isFilled`, an intitulé alone is not enough: it places nothing on the
     * chronology, whereas a date with no intitulé reads perfectly well under its
     * default heading.
     *
     * @param date Date of reference.
     * @returns True when the date itself holds something.
     * @author Claude
     */
    const isDated = ( date: EntryDate ): boolean => date.value.trim() !== "";

    /** The address as typed, which is what every check below reads. */
    const candidateSlug = $derived( slug.trim() );

    /** Address the page is leaving, empty while it is not moving anywhere. */
    const previousSlug = $derived( current && current.slug !== candidateSlug ? current.slug : "" );

    /** Pages whose links would turn red were the address to change without them. */
    const citations = $derived( previousSlug ? wiki.backlinksOf( previousSlug ).length : 0 );

    /** Pages whose links to this one would turn red were it deleted. */
    const citedBy = $derived( current ? wiki.backlinksOf( current.slug ).length : 0 );

    const relinkLabel = $derived(
        pluralize( citations, { one: m.entry_form_relink_one, other: m.entry_form_relink_other } )
    );

    /** Another page already uses this slug, so a suffix will be added on save. */
    const slugTaken = $derived.by( () =>
    {
        if ( leaving )
        {
            return false;
        }

        if ( !candidateSlug )
        {
            return false;
        }

        const owner = wiki.bySlug( candidateSlug );
        return owner !== undefined && owner.id !== current?.id;
    } );

    /**
     * Addresses that are not this page's to take.
     *
     * Read from the corpus exactly as `saveEntry` reads it when it settles the
     * address for real, the page's own address left out: that one is free for
     * the page already holding it. The list is derived, so it is rebuilt when
     * the corpus moves rather than on every keystroke in the field.
     */
    const takenSlugs = $derived( wiki.entries.filter( ( item ) => item.id !== current?.id ).map( ( item ) => item.slug ) );

    /** The address the page would end up under, once the collision is settled. */
    const settledSlug = $derived( slugTaken ? uniqueSlug( candidateSlug, takenSlugs ) : "" );

    $effect( () =>
    {
        if ( !slugLocked )
        {
            slug = title.trim() ? slugify( title ) : "";
        }
    } );

    beforeNavigate( ( navigation ) =>
    {
        if ( !dirty || leaving || leaveOpen )
        {
            return;
        }

        navigation.cancel();

        /*
         * A navigation unloading the document, a reload or a link out of the
         * site, cannot wait for a dialog of ours: the browser suspends the page
         * and offers only its own prompt, which cancelling is precisely what
         * raises. Everything else is held back and replayed once answered.
         *
         * A step through the history is replayed as a plain navigation rather
         * than as a step: cancelling has already put the cancelled entry back,
         * so the reader reaches the page they asked for, at the cost of one more
         * entry in the history.
         */
        if ( navigation.willUnload )
        {
            return;
        }

        destination = navigation.to?.url ?? null;
        leaveOpen = true;
    } );

    /**
     * Leaves the editor for the page the guard held back, dropping the changes.
     *
     * @author Claude
     */
    const leave = (): void =>
    {
        if ( !destination )
        {
            return;
        }

        leaving = true;
        void goto( resolvedPath( destination ) );
    };

    /**
     * Saves the page, then goes where the guard stopped the writer.
     *
     * A destination that was this page under the address it is leaving is
     * followed to the new one, or the writer would land on a red link to the page
     * they have just saved.
     *
     * @author Claude
     */
    const saveAndLeave = (): void =>
    {
        if ( !destination || !ready() )
        {
            return;
        }

        const before = current ? resolve( `entries/${ current.slug }/` ) : "";
        const stored = store();
        const followed = before !== "" && destination.pathname === before;

        leaving = true;
        void goto( followed ? resolve( `entries/${ stored.slug }/` ) : resolvedPath( destination ) );
    };

    /**
     * Writes the page, and makes the form the editor of what was written.
     *
     * The address actually taken is read back into the field: `saveEntry` appends
     * a number when the slug collides, and a form still showing the address it
     * asked for would be lying about where the page now lives.
     *
     * @returns The stored page.
     * @author Claude
     */
    const store = (): Entry =>
    {
        const moving = relink ? previousSlug : "";
        const publishing = status === "publie" && current?.status !== "publie";
        const stored = wiki.saveEntry( {
            id: current?.id,
            createdAt: current?.createdAt,
            title: title.trim(),
            slug: slug.trim() || slugify( title ),
            summary: summary.trim(),
            body: storedBody,
            categories: [ ...categories ],
            infobox: infobox.filter( isFilled ),
            image: imageSrc.trim()
                ? { src: imageSrc.trim(), alt: imageAlt.trim(), caption: imageCaption.trim() || undefined }
                : null,
            dates: dates.filter( isDated ),
            aliases: [ ...aliases ],
            status
        } );

        sound.cue( "success", { emphasis: publishing ? "strong" : "normal" } );

        current = stored;
        slug = stored.slug;
        slugLocked = true;
        baseline = fields();

        if ( moving && moving !== stored.slug )
        {
            wiki.retargetLinks( moving, stored.slug );
        }

        return stored;
    };

    /**
     * Takes the body as the editor writes it for the page it was given, both as
     * the body and as what the body is compared against.
     *
     * The editor serialises Markdown its own way, so the stored body and its
     * rewriting differ on a page nobody has touched yet. Adopting the rewriting
     * as the baseline is what keeps opening a page from reading as a change; a
     * body already edited in the meantime is left as it is.
     *
     * @param markdown Markdown of the untouched document.
     * @author Claude
     */
    const adoptBody = ( markdown: string ): void =>
    {
        if ( body !== baseline.body )
        {
            return;
        }

        body = markdown;
        baseline = { ...baseline, body: markdown };
    };

    /**
     * Writes a template into the card and the body.
     *
     * What the template writes is not the writer's change, so it moves the
     * baseline with it: picking a template and leaving straight away loses
     * nothing, and must not be held back by the guard.
     *
     * @param next Template to apply.
     * @author Claude
     */
    const applyTemplate = ( next: PageTemplate ): void =>
    {
        dates = next.dates.map( ( label ) => ( { id: createId(), label: label(), value: "" } ) );
        infobox = next.rows.map( ( label ) => ( { label: label(), value: "" } ) );
        body = templateBody( next );
        template = next;
        bodyRevision += 1;

        baseline = {
            ...baseline,
            body,
            dates: dates.map( ( date ) => ( { ...date } ) ),
            infobox: infobox.map( ( field ) => ( { ...field } ) )
        };
    };

    /**
     * Applies the template the writer picked, once they agree to lose what it replaces.
     *
     * @param next Template picked.
     * @author Claude
     */
    const chooseTemplate = ( next: PageTemplate ): void =>
    {
        const written = dates.some( isDated )
          || infobox.some( isFilled )
          || body.trim() !== baseline.body.trim();

        if ( !written )
        {
            applyTemplate( next );
            return;
        }

        pendingTemplate = next;
        pickerRevision += 1;
        templateConfirmOpen = true;
    };

    /**
     * Tells whether the page can be written, and points at the title when it cannot.
     *
     * @returns True when the title holds something.
     * @author Claude
     */
    const ready = (): boolean =>
    {
        if ( canSave )
        {
            return true;
        }

        saveAttempted = true;
        titleField?.focus();
        return false;
    };

    /**
     * Saves the page and opens it.
     *
     * @author Claude
     */
    const save = (): void =>
    {
        if ( !ready() )
        {
            return;
        }

        const stored = store();

        leaving = true;
        void goto( resolve( `entries/${ stored.slug }/` ) );
    };

    /**
     * Saves the page without leaving the editor.
     *
     * The address of the page is deliberately left alone: the url would have to
     * change with it, and rewriting it under a creation remounts the form
     * through the `{#key}` of the route, which is the work being saved.
     *
     * @author Claude
     */
    const saveInPlace = (): void =>
    {
        if ( !ready() )
        {
            return;
        }

        store();
        saved = true;
    };

    /**
     * Publishes a draft and opens it.
     *
     * The status only moves once the page can be written, or a refused save
     * would leave a page that is still a draft announcing itself as published.
     *
     * @author Claude
     */
    const publish = (): void =>
    {
        if ( !ready() )
        {
            return;
        }

        status = "publie";
        save();
    };

    /**
     * Saves on Ctrl+S, the shortcut every editor answers to. The save button
     * carries its keycap, Ctrl S or ⌘ S after the platform, hidden under a coarse
     * pointer, which has no keyboard to press it on, so the shortcut is learnt
     * from the button rather than guessed.
     *
     * @param event Keyboard event on the window.
     * @author Claude
     */
    const onKeydown = ( event: KeyboardEvent ): void =>
    {
        if ( ( event.ctrlKey || event.metaKey ) && event.key.toLowerCase() === "s" )
        {
            event.preventDefault();
            saveInPlace();
        }
    };

    /**
     * Deletes the page and goes back to the index.
     *
     * @author Claude
     */
    const remove = (): void =>
    {
        if ( !current )
        {
            return;
        }

        wiki.deleteEntry( current.id );
        sound.cue( "close", { emphasis: "strong" } );
        leaving = true;
        void goto( resolve( "/entries" ) );
    };
</script>

<svelte:window onkeydown={onKeydown} />

<h1 class="sr-only">{current ? m.entry_form_edit_heading() : m.entry_form_create_heading()}</h1>

<form
    class="mx-auto max-w-7xl px-4 pb-12 sm:px-6"
    novalidate
    onsubmit={( event ) =>
    {
        event.preventDefault();
        save();
    }}
>
    <div
        data-sticky-top
        class="border-paper-200 dark:border-ink-700 dark:bg-ink-950/80 bg-paper-50/90 sticky top-16 z-30 mb-8 flex
               items-center gap-2 border-b py-3 backdrop-blur sm:gap-3"
    >
        <p
            class="text-muted flex min-w-0 flex-1 flex-col text-xs leading-tight sm:flex-row sm:items-center sm:gap-1.5
                   sm:text-sm"
            role="status"
        >
            {#if isDraft}
                <span class="text-signal-700 dark:text-dark-signal-700 font-medium">{m.status_picker_draft()}</span>
                <span class="hidden sm:inline" aria-hidden="true">·</span>
            {/if}

            <span class="flex min-w-0 items-center gap-1">
                {#if justSaved}
                    <Check class="text-accent-600 dark:text-accent-400 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                {/if}

                {#if dirty}
                    <span class="truncate sm:hidden">{m.entry_form_state_unsaved_short()}</span>
                    <span class="hidden truncate sm:inline">{stateLine}</span>
                {:else}
                    <span class="truncate">{stateLine}</span>
                {/if}
            </span>
        </p>

        <Button
            href={current ? resolve( `entries/${ current.slug }/` ) : resolve( "entries/" )}
            color="alternative"
            size="sm"
            class="order-first h-11 w-11 shrink-0 p-0 sm:order-none sm:h-9 sm:w-auto sm:px-3"
        >
            <X class="h-4 w-4 sm:hidden" />
            <span class="sr-only sm:not-sr-only">{m.entry_form_close()}</span>
        </Button>

        <Button
            type="submit"
            color={isDraft ? "alternative" : "primary"}
            size="sm"
            class="h-11 shrink-0 gap-2 sm:h-9"
            aria-keyshortcuts="Control+S Meta+S"
        >
            {m.common_save()}
            <Kbd class="pointer-coarse:hidden px-1 py-0.5 text-xs font-normal" aria-hidden="true">
                {platform.apple ? m.entry_form_save_shortcut_apple() : m.entry_form_save_shortcut()}
            </Kbd>
        </Button>

        {#if isDraft}
            <Button color="primary" size="sm" class="h-11 shrink-0 sm:h-9" onclick={publish}>
                {m.entry_form_publish()}
            </Button>
        {/if}
    </div>

    <div class="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div class="min-w-0">
            {#if !current}
                {#key pickerRevision}
                    <TemplatePicker chosen={template.id} onchoose={chooseTemplate} />
                {/key}
            {/if}

            <EntryHeading
                bind:title
                bind:summary
                bind:titleField
                {titleMissing}
                titlePlaceholder={template.titlePlaceholder()}
                summaryPlaceholder={template.summaryPlaceholder()}
                {settledSlug}
                onsettle={() =>
                {
                    slug = settledSlug;
                    slugLocked = true;
                }}
            />

            <div class="mt-8">
                {#key bodyRevision}
                    <MarkdownEditor
                        value={body}
                        onchange={( markdown ) => ( body = markdown )}
                        onready={adoptBody}
                        generatorKind={template.generator}
                    />
                {/key}

                <p class="text-muted mt-2 text-xs">{extent}</p>
            </div>
        </div>

        <div class="space-y-4">
            <InfoboxCard
                {title}
                bind:imageSrc
                bind:imageAlt
                bind:imageCaption
                bind:dates
                bind:infobox
                bind:categories
            />

            <EntrySettings
                bind:status
                bind:slug
                bind:slugLocked
                bind:aliases
                bind:relink
                {citations}
                {relinkLabel}
                {slugTaken}
                ondelete={current ? () => ( deleteOpen = true ) : undefined}
            />

            <WritingHelp />
        </div>
    </div>
</form>

<ConfirmDialog
    bind:open={leaveOpen}
    title={m.entry_form_unsaved_title()}
    message={m.entry_form_unsaved_message()}
    confirmLabel={m.entry_form_unsaved_save()}
    cancelLabel={m.entry_form_unsaved_stay()}
    onconfirm={saveAndLeave}
    secondaryLabel={m.entry_form_unsaved_leave()}
    onsecondary={leave}
/>

<ConfirmDialog
    bind:open={templateConfirmOpen}
    title={m.template_switch_title()}
    message={m.template_switch_message()}
    confirmLabel={m.template_switch_confirm()}
    danger
    onconfirm={() =>
    {
        if ( pendingTemplate )
        {
            applyTemplate( pendingTemplate );
        }
    }}
/>

{#if current}
    <ConfirmDialog
        bind:open={deleteOpen}
        title={m.entry_form_delete_confirm_title()}
        message={m.entry_form_delete_confirm_message()}
        confirmLabel={m.common_delete()}
        danger
        onconfirm={remove}
    >
        {#if citedBy > 0}
            <p class="mt-2">
                {pluralize( citedBy, { one: m.entry_form_delete_cited_one, other: m.entry_form_delete_cited_other } )}
            </p>
        {/if}

        <p class="mt-2">{m.entry_form_delete_backup()}</p>
    </ConfirmDialog>
{/if}
