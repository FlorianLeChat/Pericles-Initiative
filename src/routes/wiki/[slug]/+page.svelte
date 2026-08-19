<script lang="ts">
    /**
     * A single encyclopedia page.
     *
     * A slug with no page behind it is not an error: red links lead here, and
     * this is where a page gets created from.
     *
     * @author Claude
     */
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import Breadcrumb from "flowbite-svelte/Breadcrumb.svelte";
    import BreadcrumbItem from "flowbite-svelte/BreadcrumbItem.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import ArticleBody from "$lib/components/ArticleBody.svelte";
    import Backlinks from "$lib/components/Backlinks.svelte";
    import CategoryChip from "$lib/components/CategoryChip.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import Infobox from "$lib/components/Infobox.svelte";
    import TableOfContents from "$lib/components/TableOfContents.svelte";
    import { staggerRank } from "$lib/config/motion";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { Category } from "$lib/types";
    import { formatDateTime } from "$lib/utilities/date";
    import { excerpt, renderArticle } from "$lib/utilities/markdown";

    const slug = $derived( page.params.slug ?? "" );
    const entry = $derived( wiki.bySlug( slug ) );

    const rendered = $derived( entry ? renderArticle( entry.body, wiki.slugs ) : null );
    const backlinks = $derived( wiki.backlinksOf( slug ) );
    const related = $derived( entry ? wiki.relatedTo( entry ) : [] );

    /** Humanised slug, used to prefill the title of a page that does not exist yet. */
    const spaced = $derived( slug.replaceAll( "-", " " ) );
    const plannedTitle = $derived( spaced.charAt( 0 ).toUpperCase() + spaced.slice( 1 ) );

    const categories = $derived(
        ( entry?.categories ?? [] )
            .map( ( item ) => wiki.categoriesBySlug.get( item ) )
            .filter( ( item ): item is Category => item !== undefined )
    );
</script>

<svelte:head>
    {#if entry}
        <title>{m.wiki_slug_title( { name: entry.title, universe: wiki.meta.universe } )}</title>

        <meta name="description" content={entry.summary || excerpt( entry.body, 155 )} />
    {:else}
        <title>{m.wiki_slug_title_unwritten( { universe: wiki.meta.universe } )}</title>
    {/if}
</svelte:head>

{#if entry && rendered}
    <article class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <Breadcrumb ariaLabel={m.common_breadcrumb_aria()} class="text-muted text-sm">
                <BreadcrumbItem href={resolve( "/wiki" )}>
                    {#snippet icon()}{/snippet}

                    {m.common_encyclopedia_label()}
                </BreadcrumbItem>

                <BreadcrumbItem aria-current="page">
                    {#snippet icon()}
                        <ChevronRight class="text-muted mx-1 h-4 w-4" />
                    {/snippet}

                    {entry.title}
                </BreadcrumbItem>
            </Breadcrumb>

            <Button href={resolve( `/edit/${ entry.slug }/` )} color="alternative" size="xs" class="rounded-full">
                {m.common_edit_action()}
            </Button>
        </div>

        <header class="border-paper-200 dark:border-ink-800 rise-in mt-4 border-b pb-8">
            {#if entry.status === "brouillon"}
                <p
                    class="border-signal-500/40 bg-signal-500/10 text-signal-500 mb-4 inline-block rounded-full border px-3 py-1 text-xs font-medium"
                >
                    {m.wiki_slug_draft_label()}
                </p>
            {/if}

            <h1 class="font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
                {entry.title}
            </h1>

            {#if entry.summary}
                <p class="text-ink-600 dark:text-paper-300 mt-5 max-w-3xl text-lg leading-relaxed">
                    {entry.summary}
                </p>
            {/if}

            <div class="mt-6 flex flex-wrap items-center gap-2">
                {#each categories as category ( category.slug )}
                    <CategoryChip {category} />
                {/each}
            </div>

            <p class="text-muted mt-5 text-xs">
                {m.wiki_slug_updated_prefix()}
                <time datetime={entry.updatedAt}>{formatDateTime( entry.updatedAt )}</time>
            </p>
        </header>

        <div class="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div class="rise-in min-w-0" style="--rank: 1">
                <ArticleBody html={rendered.html} />

                {#if related.length > 0}
                    <section class="border-paper-200 dark:border-ink-800 mt-14 border-t pt-8">
                        <h2 class="font-serif text-xl font-semibold tracking-tight">{m.wiki_slug_related_heading()}</h2>

                        <ul class="mt-4 grid gap-3 sm:grid-cols-2">
                            {#each related as item, index ( item.id )}
                                <li
                                    class="surface surface-lift rise-in relative p-4"
                                    style="--rank: {staggerRank( index )}"
                                >
                                    <div class="flex items-center gap-2">
                                        <a
                                            href={resolve( `/wiki/${ item.slug }/` )}
                                            class="stretched-link text-sm font-medium"
                                        >
                                            {item.title}
                                        </a>
                                    </div>

                                    {#if item.summary}
                                        <p class="text-muted mt-2 line-clamp-2 text-xs leading-relaxed">
                                            {item.summary}
                                        </p>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    </section>
                {/if}
            </div>

            <aside class="rise-in space-y-5 lg:sticky lg:top-20" style="--rank: 2">
                <Infobox {entry} />
                <TableOfContents headings={rendered.headings} />
                <Backlinks entries={backlinks} />
            </aside>
        </div>
    </article>
{:else}
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p class="text-muted font-mono text-sm">/wiki/{slug}</p>

        <EmptyState title={m.wiki_slug_unwritten_title()} description={m.wiki_slug_unwritten_description()}>
            <Button
                href={resolve( `/new/?slug=${ encodeURIComponent( slug ) }&titre=${ encodeURIComponent( plannedTitle ) }` )}
                color="primary"
            >
                {m.common_create_this_entry()}
            </Button>

            <Button href={resolve( "/wiki" )} color="alternative">{m.common_browse_wiki()}</Button>
        </EmptyState>

        {#if backlinks.length > 0}
            <div class="mt-8">
                <Backlinks
                    entries={backlinks}
                    title={m.wiki_slug_backlinks_title()}
                    emptyLabel={m.wiki_slug_backlinks_empty()}
                />
            </div>
        {/if}
    </div>
{/if}
