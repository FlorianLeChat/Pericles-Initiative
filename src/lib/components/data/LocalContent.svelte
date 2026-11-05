<script lang="ts">
    /**
     * Inventory of what this browser stores.
     *
     * Deliberately not phrased as pending changes: with an empty seed the overlay
     * is the whole content of the wiki, and no backup ever empties it. So this
     * panel answers «what does this browser hold, and how much room does it take»,
     * while «is my backup up to date» belongs to the backup panel.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { formatDateTime } from "#lib/utilities/date.ts";
    import { formatSize, storedSize } from "#lib/utilities/size.ts";

    /** Shared by the headings of each kind of stored item. */
    const SUBHEADING = "text-ink-900 dark:text-paper-100 mb-2 text-sm font-semibold";

    /** Above this size the browser is close to refusing to store the overlay. */
    const STORAGE_WARNING = 3_500_000;

    const storedEntries = $derived( Object.values( wiki.overlay.entries ) );
    const storedCategories = $derived( Object.values( wiki.overlay.categories ) );
    const storedLive = $derived( Object.values( wiki.overlay.live ) );

    const deletedEntries = $derived(
        wiki.overlay.deleted.entries.map( ( id ) => ( {
            id,
            title: wiki.seed.entries.find( ( entry ) => entry.id === id )?.title ?? id
        } ) )
    );

    const overlaySize = $derived( storedSize( wiki.overlay ) );
</script>

<section class="surface p-6" aria-labelledby="local-content-heading">
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="local-content-heading" class="section-heading">{m.local_content_heading()}</h2>

        <p class="text-muted text-xs">
            {m.local_content_size_used( { size: formatSize( overlaySize ) } )}
        </p>
    </div>

    <p class="text-muted mt-1.5 text-sm">{m.local_content_description()}</p>

    {#if !wiki.hasStoredItems}
        <p class="text-muted mt-4 text-sm leading-relaxed">
            {m.local_content_empty_intro()}
            <a href={resolve( "/new" )} class="wiki-link">{m.local_content_create_link()}</a>
            {m.local_content_empty_outro()}
        </p>
    {:else}
        <p class="mt-4 text-sm">
            <strong>{wiki.storedItemCount}</strong>
            {pluralize( wiki.storedItemCount, { one: m.local_content_stored_items_one, other: m.local_content_stored_items_other } )}
            {m.local_content_stored_on_device()}
        </p>

        {#if wiki.changedAt}
            <p class="text-muted mt-1.5 text-sm">
                {m.local_content_last_changed_prefix()} <time datetime={wiki.changedAt}>{formatDateTime( wiki.changedAt )}</time>.
            </p>
        {/if}

        {#if overlaySize > STORAGE_WARNING}
            <p class="bg-signal-500/15 text-signal-700 mt-4 rounded-xl px-4 py-3 text-sm">
                {m.local_content_storage_warning()}
            </p>
        {/if}

        <div class="mt-5 space-y-5 text-sm">
            {#if storedEntries.length > 0}
                <div>
                    <h3 class={SUBHEADING}>{m.local_content_entries_heading()}</h3>

                    <ul class="space-y-1.5">
                        {#each storedEntries as entry ( entry.id )}
                            <li class="flex flex-wrap items-center gap-2">
                                <a href={resolve( `entries/${ entry.slug }/` )} class="wiki-link">{entry.title}</a>

                                {#if entry.status === "brouillon"}
                                    <span class="text-muted text-xs">{m.local_content_draft_tag()}</span>
                                {/if}
                            </li>
                        {/each}
                    </ul>
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

                    <ul class="flex flex-wrap gap-1.5">
                        {#each storedCategories as category ( category.slug )}
                            <li class="bg-paper-200 dark:bg-ink-800 rounded-full px-2.5 py-1 text-xs">
                                {category.name}
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}

            {#if storedLive.length > 0}
                <div>
                    <h3 class={SUBHEADING}>{m.local_content_live_heading()}</h3>

                    <p class="text-ink-500 dark:text-paper-300/80">
                        {storedLive.length}
                        {pluralize( storedLive.length, { one: m.local_content_stored_live_one, other: m.local_content_stored_live_other } )}.
                    </p>
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
    {/if}
</section>
