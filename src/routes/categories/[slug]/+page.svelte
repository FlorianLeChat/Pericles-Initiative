<script lang="ts">
    /**
     * One category: where it is filed, what is filed beneath it, and its pages.
     *
     * Subcategories come before the pages, as in a classification schedule: the
     * reader looking for a narrower shelf finds it before scrolling a long list.
     * Pages are rows rather than cards, each led by its call number.
     *
     * @author Claude
     */
    import { page } from "$app/state";
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { excerpt } from "#lib/utilities/markdown.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { paletteColor } from "#lib/config/palette.ts";
    import { callNumber } from "#lib/utilities/catalogue.ts";
    import Breadcrumb from "flowbite-svelte/Breadcrumb.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import BreadcrumbItem from "flowbite-svelte/BreadcrumbItem.svelte";
    import { categoryAncestors, categoryChildren } from "#lib/utilities/categories.ts";

    const slug = $derived( page.params.slug ?? "" );
    const category = $derived( wiki.categoriesBySlug.get( slug ) );
    const color = $derived( paletteColor( category?.color ) );
    const entries = $derived( wiki.entriesInCategory( slug, true ) );
    const ancestors = $derived( categoryAncestors( slug, wiki.categoriesBySlug ) );
    const subcategories = $derived( categoryChildren( wiki.categories ).get( slug ) ?? [] );

    /**
     * Words the page count is spelled with, shared by the header and the subcategory rows.
     */
    const PAGE_COUNT = { one: m.common_count_fiche_one, other: m.common_count_fiche_other };
</script>

<PageMeta
    title={m.categories_slug_title( {
        name: category?.name ?? m.categories_slug_unknown_label(),
        universe: wiki.meta.universe
    } )}
    description={category?.description}
/>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <Breadcrumb ariaLabel={m.common_breadcrumb_aria()} class="text-muted text-sm">
        <BreadcrumbItem href={resolve( "/categories" )}>
            {#snippet icon()}{/snippet}

            {m.common_categories_label()}
        </BreadcrumbItem>

        {#each ancestors as ancestor ( ancestor.slug )}
            <BreadcrumbItem href={resolve( `categories/${ ancestor.slug }/` )}>
                {#snippet icon()}
                    <ChevronRight class="text-muted mx-1 h-4 w-4" />
                {/snippet}

                {ancestor.name}
            </BreadcrumbItem>
        {/each}

        <BreadcrumbItem aria-current="page">
            {#snippet icon()}
                <ChevronRight class="text-muted mx-1 h-4 w-4" />
            {/snippet}

            {category?.name ?? slug}
        </BreadcrumbItem>
    </Breadcrumb>

    {#if category}
        {#snippet introduction()}
            {category.description}
        {/snippet}

        <div class="mt-4">
            <PageHeader title={category.name} description={category.description ? introduction : undefined} />
        </div>

        <p class="text-muted mt-4 flex items-center gap-2 text-sm">
            <span class="h-2 w-2 rounded-full {color.dot}" aria-hidden="true"></span>
            {pluralize( entries.length, PAGE_COUNT )}
        </p>

        {#if subcategories.length > 0}
            <section class="mt-10 max-w-4xl" aria-labelledby="subcategories-heading">
                <h2 id="subcategories-heading" class="section-heading">{m.categories_slug_subcategories_heading()}</h2>

                <ul class="divide-paper-200 dark:divide-ink-800 border-paper-200 dark:border-ink-800 mt-4 divide-y border-y">
                    {#each subcategories as child ( child.slug )}
                        <li class="flex items-baseline gap-3 py-3">
                            <span
                                class="h-2 w-2 shrink-0 -translate-y-0.5 rounded-full {paletteColor( child.color ).dot}"
                                aria-hidden="true"
                            ></span>

                            <div class="min-w-0 flex-1">
                                <p class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <a href={resolve( `categories/${ child.slug }/` )} class="wiki-link font-semibold">
                                        {child.name}
                                    </a>

                                    <span class="text-muted text-sm">
                                        {pluralize( wiki.entriesInCategory( child.slug, true ).length, PAGE_COUNT )}
                                    </span>
                                </p>

                                {#if child.description}
                                    <p class="text-muted mt-1 text-sm leading-relaxed">{child.description}</p>
                                {/if}
                            </div>
                        </li>
                    {/each}
                </ul>
            </section>
        {/if}

        {#if entries.length === 0}
            <div class="mt-10 max-w-4xl">
                <EmptyState
                    title={m.categories_slug_empty_title()}
                    description={m.categories_slug_empty_description()}
                >
                    <Button href={resolve( "/wiki" )} color="alternative">{m.common_browse_wiki()}</Button>
                </EmptyState>
            </div>
        {:else}
            <section class="mt-10 max-w-4xl" aria-labelledby="pages-heading">
                <h2 id="pages-heading" class="section-heading">{m.categories_slug_pages_heading()}</h2>

                <ul class="divide-paper-200 dark:divide-ink-800 border-paper-200 dark:border-ink-800 mt-4 divide-y border-y">
                    {#each entries as entry ( entry.id )}
                        {@const lead = entry.summary || excerpt( entry.body, 150 )}
                        {@const reference = callNumber( entry, wiki.categoriesBySlug.get( entry.categories[ 0 ] ) )}

                        <li class="relative py-4">
                            <p class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <span class="call-number">{reference}</span>

                                <a
                                    href={resolve( `wiki/${ entry.slug }/` )}
                                    class="text-ink-900 dark:text-paper-100 hover:text-accent-600 dark:hover:text-accent-400 stretched-link font-semibold"
                                >
                                    {entry.title}
                                </a>

                                {#if entry.status === "brouillon"}
                                    <span
                                        class="border-paper-300 text-muted dark:border-ink-700 rounded-full border border-dashed px-2 py-0.5 text-xs"
                                    >
                                        {m.entry_card_draft_badge()}
                                    </span>
                                {/if}
                            </p>

                            {#if lead}
                                <p class="text-muted mt-1 line-clamp-2 text-sm leading-relaxed">{lead}</p>
                            {/if}
                        </li>
                    {/each}
                </ul>
            </section>
        {/if}
    {:else}
        <div class="mt-10">
            <EmptyState title={m.categories_slug_unknown_label()} description={m.categories_slug_unknown_description()}>
                <Button href={resolve( "/categories" )} color="alternative">
                    {m.categories_slug_view_categories_button()}
                </Button>
            </EmptyState>
        </div>
    {/if}
</div>
