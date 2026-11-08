<script lang="ts">
    /**
     * Overview of the categories, laid out as the tree their parents describe.
     *
     * Read like the schedule of a classification: each top level category, then
     * the ones filed beneath it, indented along a hairline guide. The name is the
     * one link of a row, so the keyboard meets each category once.
     *
     * «Gérer les catégories» is a secondary button: this page is read far more
     * often than its classification is reworked, and the header already spends the
     * accent on «Nouvelle fiche». A device set to read only does not show it.
     *
     * The pages filed nowhere follow as hairline rows of links, two columns from
     * `sm`, rather than as pills, which read as category chips; an odd last row
     * spans both columns, so the closing hairline runs the whole width.
     *
     * The page keeps one 56rem column, header included, so «Gérer les catégories»
     * stands over the edge of the tree it manages rather than past it.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import type { Category } from "#lib/types.ts";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { TOUCH_HEIGHT } from "#lib/config/forms.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { paletteColor } from "#lib/config/palette.ts";
    import { reading } from "#lib/state/reading.svelte.ts";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import { categoryChildren } from "#lib/utilities/categories.ts";

    const tree = $derived( categoryChildren( wiki.categories ) );
    const roots = $derived( tree.get( null ) ?? [] );

    const uncategorized = $derived( wiki.publishedEntries.filter( ( entry ) => entry.categories.length === 0 ) );
</script>

<PageMeta
    title={m.categories_title( { universe: wiki.meta.universe } )}
    description={m.categories_meta_description( { universe: wiki.meta.universe } )}
/>

{#snippet branch( categories: Category[], depth: number )}
    <ul
        class={depth === 0
            ? "divide-paper-200 dark:divide-ink-700 border-paper-200 dark:border-ink-700 divide-y border-y"
            : "border-paper-300 dark:border-ink-700 mt-3 ml-1 space-y-3 border-l pl-5"}
    >
        {#each categories as category ( category.slug )}
            {@const children = tree.get( category.slug ) ?? []}
            {@const count = wiki.entriesInCategory( category.slug ).length}
            {@const size = depth === 0 ? "text-lg" : "text-base"}

            <li class={depth === 0 ? "py-5" : ""}>
                <div class="flex items-baseline gap-3">
                    <span
                        class="h-2 w-2 shrink-0 -translate-y-0.5 rounded-full {paletteColor( category.color ).dot}"
                        aria-hidden="true"
                    ></span>

                    <div class="min-w-0 flex-1">
                        <p class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <a
                                href={resolve( `categories/${ category.slug }/` )}
                                class="wiki-link inline-flex items-center font-semibold {size} {TOUCH_HEIGHT}"
                            >
                                {category.name}
                            </a>

                            <span class="text-muted text-sm">
                                {pluralize( count, {
                                    one: m.common_count_fiche_one,
                                    other: m.common_count_fiche_other
                                } )}
                            </span>
                        </p>

                        {#if category.description}
                            <p class="text-muted mt-1 max-w-help text-sm leading-relaxed">{category.description}</p>
                        {/if}

                        {#if children.length > 0}
                            {@render branch( children, depth + 1 )}
                        {/if}
                    </div>
                </div>
            </li>
        {/each}
    </ul>
{/snippet}

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <div class="max-w-4xl">
        <PageHeader title={m.common_categories_label()}>
            {#snippet description()}
                {m.categories_description()}
            {/snippet}

            {#snippet action()}
                {#if !reading.enabled}
                    <Button href={resolve( "/categories/manage" )} color="alternative">
                        {m.common_categories_manage_label()}
                    </Button>
                {/if}
            {/snippet}
        </PageHeader>

        {#if roots.length === 0}
            <div class="mt-10">
                <EmptyState title={m.categories_empty_title()} description={m.categories_empty_description()}>
                    <Button href={resolve( "/categories/manage" )} color="alternative">
                        {m.categories_create_button()}
                    </Button>
                </EmptyState>
            </div>
        {:else}
            <div class="mt-10">
                {@render branch( roots, 0 )}
            </div>
        {/if}

        {#if uncategorized.length > 0}
            <section class="mt-12" aria-labelledby="uncategorized-heading">
                <h2 id="uncategorized-heading" class="section-heading">{m.categories_uncategorized_heading()}</h2>

                <ul
                    class="border-paper-200 dark:border-ink-700 mt-4 grid border-t text-sm sm:grid-cols-2 sm:gap-x-8"
                >
                    {#each uncategorized as entry ( entry.id )}
                        <li class="border-paper-200 dark:border-ink-700 border-b sm:py-2 sm:odd:last:col-span-2">
                            <a
                                href={resolve( `entries/${ entry.slug }/` )}
                                class="row-link block truncate content-center {TOUCH_HEIGHT}"
                            >
                                {entry.title}
                            </a>
                        </li>
                    {/each}
                </ul>
            </section>
        {/if}
    </div>
</div>
