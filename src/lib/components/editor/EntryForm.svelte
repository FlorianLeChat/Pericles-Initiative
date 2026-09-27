<script lang="ts">
    /**
     * Creation and edition form of a page.
     *
     * @author Claude
     */
    import Check from "@lucide/svelte/icons/check";
    import Trash2 from "@lucide/svelte/icons/trash-2";
    import Accordion from "flowbite-svelte/Accordion.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Textarea from "flowbite-svelte/Textarea.svelte";
    import Toast from "flowbite-svelte/Toast.svelte";
    import { beforeNavigate, goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import type { ResolvedPathname } from "$app/types";
    import { untrack } from "svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { PAIRED_ACTION } from "$lib/config/forms";
    import { motionDuration } from "$lib/config/motion";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { Entry, EntryDate, EntryStatus, InfoboxField } from "$lib/types";
    import { pluralize } from "$lib/utilities/plural";
    import { slugify } from "$lib/utilities/slug";
    import ChipsInput from "./ChipsInput.svelte";
    import DatesEditor from "./DatesEditor.svelte";
    import EntryImageFields from "./EntryImageFields.svelte";
    import InfoboxEditor from "./InfoboxEditor.svelte";
    import MarkdownEditor from "./MarkdownEditor.svelte";
    import OptionPanel from "./OptionPanel.svelte";
    import StatusPicker from "./StatusPicker.svelte";

    /** How long the confirmation of a save stays on screen, in milliseconds. */
    const CONFIRMATION_DELAY = 2500;

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
        status: entry?.status ?? ( "publie" as EntryStatus ),
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
    let saved = $state( false );
    let leaveOpen = $state( false );
    let leaving = $state( false );

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
    const dirty = $derived.by( () =>
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
     * Tells whether an infobox row carries anything at all.
     *
     * An empty row is a row the author started and left, so it is neither saved
     * nor counted in the header of its panel.
     *
     * @param field Row of the infobox.
     * @returns True when either the label or the value holds something.
     * @author Claude
     */
    const isFilled = ( field: InfoboxField ): boolean => field.label.trim() !== "" || field.value.trim() !== "";

    /**
     * Tells whether a date row carries a date at all.
     *
     * Stricter than `isFilled` on purpose: an intitulé alone places nothing on
     * the chronology and prints an empty row in the infobox, whereas a date with
     * no intitulé reads perfectly well under its default heading.
     *
     * @param date Date of reference.
     * @returns True when the date itself holds something.
     * @author Claude
     */
    const isDated = ( date: EntryDate ): boolean => date.value.trim() !== "";

    /*
     * What each closed panel of the options says of itself. The panels arrive
     * closed, so a value nobody can see is a value nobody checks before saving,
     * and «Aucune» agrees with the noun of its own group rather than with a
     * shared default.
     */
    const categoriesSummary = $derived(
        categories.length === 0
            ? m.entry_form_categories_none()
            : pluralize( categories.length, { one: m.common_count_categorie_one, other: m.common_count_categorie_other } )
    );
    const infoboxSummary = $derived.by( () =>
    {
        const rows = infobox.filter( isFilled ).length;

        return rows === 0
            ? m.entry_form_infobox_none()
            : pluralize( rows, { one: m.entry_form_infobox_count_one, other: m.entry_form_infobox_count_other } );
    } );
    const datesSummary = $derived.by( () =>
    {
        const rows = dates.filter( isDated ).length;

        return rows === 0
            ? m.entry_form_dates_none()
            : pluralize( rows, { one: m.entry_form_dates_count_one, other: m.entry_form_dates_count_other } );
    } );
    const aliasesSummary = $derived(
        aliases.length === 0
            ? m.entry_form_aliases_none()
            : pluralize( aliases.length, { one: m.entry_form_aliases_count_one, other: m.entry_form_aliases_count_other } )
    );

    /** Another page already uses this slug, so a suffix will be added on save. */
    const slugTaken = $derived.by( () =>
    {
        if ( leaving )
        {
            return false;
        }

        const candidate = slug.trim();
        if ( !candidate )
        {
            return false;
        }

        const owner = wiki.bySlug( candidate );
        return owner !== undefined && owner.id !== current?.id;
    } );

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
        const stored = wiki.saveEntry( {
            id: current?.id,
            createdAt: current?.createdAt,
            title: title.trim(),
            slug: slug.trim() || slugify( title ),
            summary: summary.trim(),
            body,
            categories: [ ...categories ],
            infobox: infobox.filter( isFilled ),
            image: imageSrc.trim()
                ? { src: imageSrc.trim(), alt: imageAlt.trim(), caption: imageCaption.trim() || undefined }
                : null,
            dates: dates.filter( isDated ),
            aliases: [ ...aliases ],
            status
        } );

        current = stored;
        slug = stored.slug;
        slugLocked = true;
        baseline = fields();

        return stored;
    };

    /**
     * Saves the page and opens it.
     *
     * @author Claude
     */
    const save = (): void =>
    {
        if ( !canSave )
        {
            return;
        }

        const stored = store();

        leaving = true;
        void goto( resolve( `/wiki/${ stored.slug }/` ) );
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
        if ( !canSave )
        {
            return;
        }

        store();
        saved = true;
    };

    /**
     * Saves on Ctrl+S, the shortcut every editor answers to.
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

    /*
     * The confirmation goes on its own, rather than waiting for a dismissal that
     * would be one more thing to do in the middle of writing.
     */
    $effect( () =>
    {
        if ( !saved )
        {
            return;
        }

        const timer = setTimeout( () => ( saved = false ), CONFIRMATION_DELAY );

        return () => clearTimeout( timer );
    } );

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
        leaving = true;
        void goto( resolve( "/wiki" ) );
    };

    /**
     * Adds or removes a category.
     *
     * @param slugToToggle Category slug.
     * @author Claude
     */
    const toggleCategory = ( slugToToggle: string ): void =>
    {
        categories = categories.includes( slugToToggle )
            ? categories.filter( ( item ) => item !== slugToToggle )
            : [ ...categories, slugToToggle ];
    };
</script>

<svelte:window onkeydown={onKeydown} />

<form
    class="mx-auto max-w-6xl px-4 py-8 sm:px-6"
    onsubmit={( event ) =>
    {
        event.preventDefault();
        save();
    }}
>
    <div
        class="border-paper-200 dark:border-ink-800 dark:bg-ink-950/80 bg-paper-50/90 sticky top-16 z-30 -mx-4 mb-8
               flex items-center gap-2 border-b px-4 py-3 backdrop-blur sm:-mx-6 sm:gap-3 sm:px-6"
    >
        <div class="hidden min-w-0 flex-1 sm:block">
            <p class="text-muted text-xs tracking-wide uppercase">
                {current ? m.entry_form_edit_heading() : m.entry_form_create_heading()}
            </p>

            <p class="truncate text-sm font-medium">{title.trim() || m.entry_form_untitled()}</p>
        </div>

        <div class="ml-auto flex w-full shrink-0 items-center gap-2 sm:w-auto">
            {#if current}
                <Button
                    color="red"
                    size="sm"
                    class="h-9 shrink-0 px-2 sm:px-3"
                    onclick={() => ( deleteOpen = true )}
                    aria-label={m.entry_form_delete_aria()}
                >
                    <Trash2 class="h-4 w-4 sm:hidden" />

                    <span class="hidden sm:inline">{m.common_delete()}</span>
                </Button>
            {/if}

            <Button
                href={resolve( current ? `/wiki/${ current.slug }/` : "/wiki" )}
                color="alternative"
                size="sm"
                class="h-9 {PAIRED_ACTION}"
            >
                {m.common_cancel()}
            </Button>

            <Button type="submit" color="primary" size="sm" class="h-9 {PAIRED_ACTION}" disabled={!canSave}>
                {m.common_save()}
            </Button>
        </div>
    </div>

    <div class="space-y-4">
        <div>
            <Label for="entry-title" class="field-label">{m.entry_form_title_label()}</Label>

            <Input
                id="entry-title"
                bind:value={title}
                type="text"
                class="font-serif text-xl"
                placeholder={m.entry_form_title_placeholder()}
                required
            />
        </div>

        <div>
            <Label for="entry-slug" class="field-label">
                {m.entry_form_slug_label()}
                {#if !slugLocked}
                    <span class="text-muted font-normal">{m.entry_form_slug_follows_title()}</span>
                {/if}
            </Label>

            <div class="flex items-center gap-2">
                <span class="text-muted shrink-0 font-mono text-sm">/wiki/</span>

                <Input
                    id="entry-slug"
                    bind:value={slug}
                    oninput={() => ( slugLocked = true )}
                    onblur={() => ( slug = slug.trim() ? slugify( slug ) : "" )}
                    type="text"
                    class="font-mono"
                    color={slugTaken ? "red" : "default"}
                    aria-invalid={slugTaken}
                    aria-describedby={slugTaken ? "entry-slug-taken" : undefined}
                    placeholder={m.entry_form_slug_placeholder()}
                />
            </div>

            {#if slugTaken}
                <Helper id="entry-slug-taken" color="red" class="mt-1.5 text-xs">
                    {m.entry_form_slug_taken_hint()}
                </Helper>
            {/if}
        </div>

        <div>
            <Label for="entry-summary" class="field-label">{m.entry_form_summary_label()}</Label>

            <Textarea
                id="entry-summary"
                bind:value={summary}
                rows={2}
                class="w-full resize-y"
                placeholder={m.entry_form_summary_placeholder()}
            />
        </div>
    </div>

    <div class="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="min-w-0">
            <p class="field-label">{m.entry_form_body_label()}</p>

            <MarkdownEditor value={body} onchange={( markdown ) => ( body = markdown )} />
        </div>

        <aside>
            <Accordion multiple flush class="surface overflow-hidden">
                <StatusPicker bind:status />

                <OptionPanel label={m.common_categories_label()} value={categoriesSummary}>
                    {#if wiki.categories.length === 0}
                        <p class="text-muted text-sm">
                            {m.entry_form_no_categories()}
                            <a href={resolve( "/categories/manage" )} class="wiki-link">{m.entry_form_create_category_link()}</a>.
                        </p>
                    {:else}
                        <fieldset class="space-y-1.5">
                            <legend class="sr-only">{m.entry_form_categories_legend()}</legend>

                            {#each wiki.categories as item ( item.slug )}
                                <Checkbox
                                    classes={{ div: "flex min-h-9 items-center text-sm" }}
                                    checked={categories.includes( item.slug )}
                                    onchange={() => toggleCategory( item.slug )}
                                >
                                    {item.name}
                                </Checkbox>
                            {/each}
                        </fieldset>
                    {/if}
                </OptionPanel>

                <OptionPanel label={m.entry_form_dates_label()} value={datesSummary}>
                    <DatesEditor bind:dates />

                    <p class="text-muted mt-2 text-xs leading-relaxed">
                        {m.entry_form_dates_hint()}
                    </p>
                </OptionPanel>

                <OptionPanel label={m.entry_form_infobox_label()} value={infoboxSummary}>
                    <InfoboxEditor bind:fields={infobox} />
                </OptionPanel>

                <EntryImageFields bind:src={imageSrc} bind:alt={imageAlt} bind:caption={imageCaption} />

                <OptionPanel label={m.entry_form_aliases_label()} value={aliasesSummary}>
                    <ChipsInput bind:values={aliases} id="entry-aliases" placeholder={m.entry_form_aliases_placeholder()} />

                    <p class="text-muted mt-2 text-xs leading-relaxed">
                        {m.entry_form_aliases_hint()}
                    </p>
                </OptionPanel>
            </Accordion>
        </aside>
    </div>
</form>

<ConfirmDialog
    bind:open={leaveOpen}
    title={m.entry_form_unsaved_title()}
    message={m.entry_form_unsaved_message()}
    confirmLabel={m.entry_form_unsaved_leave()}
    danger
    onconfirm={leave}
/>

{#if saved}
    <div class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-end sm:inset-x-6">
        <Toast
            dismissable={false}
            color="green"
            params={{ duration: motionDuration() }}
            class="surface text-ink-800 dark:text-paper-200 max-w-xs rounded-2xl p-3 text-xs shadow-lg
                   max-sm:w-full max-sm:max-w-none"
            role="status"
            aria-live="polite"
        >
            <div class="flex items-center gap-2.5">
                <Check class="text-accent-600 dark:text-accent-400 h-4 w-4 shrink-0" />

                <span>{m.entry_form_saved()}</span>
            </div>
        </Toast>
    </div>
{/if}

{#if current}
    <ConfirmDialog
        bind:open={deleteOpen}
        title={m.entry_form_delete_confirm_title()}
        message={m.entry_form_delete_confirm_message()}
        confirmLabel={m.common_delete()}
        danger
        onconfirm={remove}
    />
{/if}
