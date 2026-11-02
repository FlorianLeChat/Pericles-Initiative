<script lang="ts">
    /**
     * Overview of the categories, laid out as the tree their parents describe.
     *
     * Read like the schedule of a classification: each top level category, then
     * the ones filed beneath it, indented along a hairline guide. The name is the
     * one link of a row, so the keyboard meets each category once.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import type { Category } from "#lib/types.ts";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { paletteColor } from "#lib/config/palette.ts";
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
            ? "divide-paper-200 dark:divide-ink-800 border-paper-200 dark:border-ink-800 divide-y border-y"
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
                                class="wiki-link font-semibold {size}"
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
                            <p class="text-muted mt-1 max-w-2xl text-sm leading-relaxed">{category.description}</p>
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
    <PageHeader title={m.common_categories_label()}>
        {#snippet description()}
            {m.categories_description()}
        {/snippet}

        {#snippet action()}
            <Button href={resolve( "/categories/manage" )} color="primary">{m.common_categories_manage_label()}</Button>
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
        <div class="mt-10 max-w-4xl">
            {@render branch( roots, 0 )}
        </div>
    {/if}

    {#if uncategorized.length > 0}
        <section class="mt-12 max-w-4xl" aria-labelledby="uncategorized-heading">
            <h2 id="uncategorized-heading" class="section-heading">{m.categories_uncategorized_heading()}</h2>

            <ul class="mt-4 flex flex-wrap gap-2">
                {#each uncategorized as entry ( entry.id )}
                    <li>
                        <a
                            href={resolve( `wiki/${ entry.slug }/` )}
                            class="border-paper-300 dark:border-ink-700 hover:border-accent-400 rounded-full border px-3 py-1.5 text-sm transition"
                        >
                            {entry.title}
                        </a>
                    </li>
                {/each}
            </ul>
        </section>
    {/if}
</div>
