<script lang="ts">
    /**
     * Inventory of what this browser stores.
     *
     * Deliberately not phrased as pending changes: with an empty seed the overlay
     * is the whole content of the wiki, and no backup ever empties it. So this
     * panel answers «what does this browser hold, and how much room does it take»,
     * while «is my backup up to date» belongs to the backup panel.
     *
     * It says so in one line, the counts of pages, categories and feed entries
     * beside the room taken against the room there is, roughly five megabytes,
     * and folds the rest under a `<details>`: the page sits below the backups
     * once the wiki holds anything, and a wall of page links between the title
     * and the download told a reader less than the count does. The pages
     * themselves are left to the encyclopedia, which lists them all with filters.
     * An empty browser says nothing of room: the identity of an unnamed wiki
     * still weighs a few bytes, and «132 o utilisés» beside «nothing is stored
     * here yet» read as a contradiction.
     *
     * Stored categories are drawn as the chips they are everywhere else, in their
     * fixed hue and leading to their page, rather than as grey pills of their own.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import { TOUCH_HEIGHT } from "#lib/config/forms.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { formatDateTime } from "#lib/utilities/date.ts";
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import { formatSize, storedSize } from "#lib/utilities/size.ts";
    import CategoryChip from "#lib/components/wiki/CategoryChip.svelte";
    import { STORAGE_QUOTA, STORAGE_WARNING } from "#lib/config/storage.ts";

    /** Shared by the headings of each kind of stored item. */
    const SUBHEADING = "text-ink-900 dark:text-paper-100 mb-2 text-sm font-semibold";

    const storedEntries = $derived( Object.values( wiki.overlay.entries ) );
    const storedCategories = $derived( Object.values( wiki.overlay.categories ) );
    const storedLiveCount = $derived( Object.keys( wiki.overlay.live ).length );
    const storedDraftCount = $derived( storedEntries.filter( ( entry ) => entry.status === "brouillon" ).length );

    const deletedEntries = $derived(
        wiki.overlay.deleted.entries.map( ( id ) => ( {
            id,
            title: wiki.seed.entries.find( ( entry ) => entry.id === id )?.title ?? id
        } ) )
    );

    const overlaySize = $derived( storedSize( wiki.overlay ) );

    const pagesLabel = $derived(
        pluralize( storedEntries.length, { one: m.common_count_fiche_one, other: m.common_count_fiche_other } )
    );

    const countsLabel = $derived(
        m.local_content_summary_counts( {
            entries: pagesLabel,
            categories: pluralize( storedCategories.length, {
                one: m.common_count_categorie_one,
                other: m.common_count_categorie_other
            } ),
            live: pluralize( storedLiveCount, { one: m.common_count_entree_one, other: m.common_count_entree_other } )
        } )
    );

    const pagesDetail = $derived(
        storedDraftCount > 0 ? m.common_count_with_drafts( { pages: pagesLabel, count: storedDraftCount } ) : pagesLabel
    );
</script>

<section class="surface p-6" aria-labelledby="local-content-heading">
    <h2 id="local-content-heading" class="section-heading">{m.local_content_heading()}</h2>

    <p class="text-muted mt-1.5 max-w-help text-sm">{m.local_content_description()}</p>

    {#if !wiki.hasStoredItems}
        <p class="text-muted mt-4 max-w-help text-sm leading-relaxed">
            {m.local_content_empty_intro()}
            <a href={resolve( "/new" )} class="wiki-link">{m.local_content_create_link()}</a>
            {m.local_content_empty_outro()}
        </p>
    {:else}
        <p class="mt-4 text-sm">
            <span class="text-ink-900 dark:text-paper-100 font-medium">{countsLabel}</span>
            <span class="text-muted" aria-hidden="true">·</span>
            <span class="text-muted">
                {m.local_content_size_used( { size: formatSize( overlaySize ), quota: formatSize( STORAGE_QUOTA ) } )}
            </span>
        </p>

        {#if wiki.changedAt}
            <p class="text-muted mt-1.5 text-sm">
                {m.local_content_last_changed_prefix()} <time datetime={wiki.changedAt}>{formatDateTime( wiki.changedAt )}</time>.
            </p>
        {/if}

        {#if overlaySize > STORAGE_WARNING}
            <p class="bg-signal-500/15 text-signal-700 mt-4 max-w-help rounded-xl px-4 py-3 text-sm">
                {m.local_content_storage_warning()}
            </p>
        {/if}

        <details class="group mt-3">
            <summary
                class="text-accent-700 dark:text-accent-300 flex min-h-11 w-fit cursor-pointer items-center text-sm
                       font-medium sm:min-h-9"
            >
                <ChevronRight
                    class="mr-1 size-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
                    aria-hidden="true"
                />
                {m.local_content_details_summary()}
            </summary>

            <div class="mt-3 space-y-5 text-sm">
                {#if storedEntries.length > 0}
                    <div>
                        <h3 class={SUBHEADING}>{m.local_content_entries_heading()}</h3>

                        <p class="text-ink-500 dark:text-paper-300/80">
                            {pagesDetail}.
                            <a href={resolve( "/entries" )} class="wiki-link inline-block content-center {TOUCH_HEIGHT}">
                                {m.local_content_browse()}
                            </a>
                        </p>
                    </div>
                {/if}

                {#if deletedEntries.length > 0}
                    <div>
                        <h3 class={SUBHEADING}>{m.local_content_deleted_heading()}</h3>

                        <ul class="space-y-1.5">
                            {#each deletedEntries as item ( item.id )}
                                <li class="flex items-center gap-2">
                                    <span
                                        class="bg-alert-500/15 text-alert-600 rounded-full px-2 py-0.5 text-xs dark:text-alert-500"
                                    >
                                        {m.local_content_deleted_tag()}
                                    </span>

                                    <span class="line-through">{item.title}</span>
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                {#if storedCategories.length > 0}
                    <div>
                        <h3 class={SUBHEADING}>{m.common_categories_label()}</h3>

                        <ul class="flex flex-wrap gap-1.5 max-sm:gap-2">
                            {#each storedCategories as category ( category.slug )}
                                <li><CategoryChip {category} /></li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                {#if wiki.overlay.meta}
                    <div>
                        <h3 class={SUBHEADING}>{m.local_content_identity_heading()}</h3>

                        <p class="text-ink-500 dark:text-paper-300/80">
                            {m.local_content_identity_intro()}
                            <a href={resolve( "/settings" )} class="wiki-link">{m.common_settings_link()}</a>.
                        </p>
                    </div>
                {/if}
            </div>
        </details>
    {/if}
</section>
