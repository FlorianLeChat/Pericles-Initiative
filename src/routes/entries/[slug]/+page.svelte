<script lang="ts">
    /**
     * A single encyclopedia page.
     *
     * A slug with no page behind it is not an error: red links lead here, and
     * this is where a page gets created from.
     *
     * @author Claude
     */
    import { page } from "$app/state";
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import type { Category } from "#lib/types.ts";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { humanizeSlug } from "#lib/utilities/slug.ts";
    import { formatLongDate } from "#lib/utilities/date.ts";
    import { callNumber } from "#lib/utilities/catalogue.ts";
    import Infobox from "#lib/components/wiki/Infobox.svelte";
    import Breadcrumb from "flowbite-svelte/Breadcrumb.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import Backlinks from "#lib/components/wiki/Backlinks.svelte";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import ArticleBody from "#lib/components/wiki/ArticleBody.svelte";
    import BreadcrumbItem from "flowbite-svelte/BreadcrumbItem.svelte";
    import TableOfContents from "#lib/components/wiki/TableOfContents.svelte";
    import { countWords, describeLength, excerpt, renderArticle } from "#lib/utilities/markdown.ts";

    const slug = $derived( page.params.slug ?? "" );
    const entry = $derived( wiki.bySlug( slug ) );

    const rendered = $derived( entry ? renderArticle( entry.body, wiki.slugs ) : null );
    const backlinks = $derived( wiki.backlinksOf( slug ) );
    const related = $derived( entry ? wiki.relatedTo( entry ) : [] );

    /** Humanised slug, used to prefill the title of a page that does not exist yet. */
    const plannedTitle = $derived( humanizeSlug( slug ) );

    const categories = $derived(
        ( entry?.categories ?? [] )
            .map( ( item ) => wiki.categoriesBySlug.get( item ) )
            .filter( ( item ): item is Category => item !== undefined )
    );

    /** Breadcrumb steps, set flush with the title rather than with Flowbite's own inset. */
    const CRUMB = "ms-0 md:ms-0 text-sm font-normal text-ink-500 hover:text-ink-900 dark:text-paper-300 dark:hover:text-paper-100";

    const reference = $derived( entry ? callNumber( entry, categories[ 0 ] ) : "" );

    const words = $derived( entry ? countWords( entry.body ) : 0 );
    const extent = $derived( describeLength( words ) );

    const metaTitle = $derived(
        entry
            ? m.wiki_slug_title( { name: entry.title, universe: wiki.meta.universe } )
            : m.wiki_slug_title_unwritten( { universe: wiki.meta.universe } )
    );

    /* A page still to be written describes nothing of its own, so it falls back. */
    const metaDescription = $derived( entry ? entry.summary || excerpt( entry.body, 155 ) : undefined );
</script>

<PageMeta title={metaTitle} description={metaDescription} />

{#if entry && rendered}
    <!--
        Two columns from `lg`: the page, and a narrow rail holding only its contents,
        sticky, so the section being read stays in sight. The infobox belongs to the
        page rather than to the rail: it floats beside the body from `lg`, and on a
        phone it comes straight after the lede, before the folded contents.
    -->
    <article
        class="mx-auto grid max-w-7xl grid-cols-1 gap-x-12 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_13rem] lg:py-12
               xl:gap-x-16"
    >
        <div class="min-w-0">
            <header class="rise-in">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <Breadcrumb
                        ariaLabel={m.common_breadcrumb_aria()}
                        class="text-muted text-sm"
                        classes={{ list: "flex-wrap space-x-0 md:space-x-0" }}
                    >
                        <BreadcrumbItem home href={resolve( "/entries" )} homeClass={CRUMB}>
                            {#snippet icon()}{/snippet}

                            {m.common_encyclopedia_label()}
                        </BreadcrumbItem>

                        {#if categories[ 0 ]}
                            <BreadcrumbItem href={resolve( `categories/${ categories[ 0 ].slug }/` )} linkClass={CRUMB}>
                                {#snippet icon()}
                                    <ChevronRight class="text-muted mx-1 h-4 w-4" />
                                {/snippet}

                                {categories[ 0 ].name}
                            </BreadcrumbItem>
                        {/if}

                        <BreadcrumbItem aria-current="page" spanClass={CRUMB}>
                            {#snippet icon()}
                                <ChevronRight class="text-muted mx-1 h-4 w-4" />
                            {/snippet}

                            {entry.title}
                        </BreadcrumbItem>
                    </Breadcrumb>

                    <Button href={resolve( `edit/${ entry.slug }/` )} color="alternative" size="xs" class="rounded-full">
                        {m.common_edit_action()}
                    </Button>
                </div>

                {#if entry.status === "brouillon"}
                    <p
                        class="border-signal-700/60 text-signal-700 mt-6 inline-block rounded-md border border-dashed px-3
                               py-1 text-xs font-medium"
                    >
                        {m.wiki_slug_draft_label()}
                    </p>
                {/if}

                <h1
                    class="text-ink-900 dark:text-paper-100 mt-6 font-serif text-4xl leading-[1.1] font-semibold
                           tracking-tight text-balance sm:text-5xl"
                >
                    {entry.title}
                </h1>

                <span class="title-rule" aria-hidden="true"></span>

                <p class="text-muted mt-4 text-xs">
                    <span class="call-number">{reference}</span>
                    · {m.wiki_slug_updated_prefix()}
                    <time datetime={entry.updatedAt}>{formatLongDate( entry.updatedAt )}</time>
                    · {extent}
                </p>

                {#if entry.summary}
                    <p class="text-ink-700 dark:text-paper-200 mt-6 max-w-[62ch] text-lg leading-relaxed text-pretty sm:text-xl">
                        {entry.summary}
                    </p>
                {/if}
            </header>

            <div class="rise-in mt-8 lg:mt-10" style="--rank: 1">
                <div class="mb-8 lg:float-right lg:mb-6 lg:ml-10 lg:w-80">
                    <Infobox {entry} />
                </div>

                <div class="mb-8 lg:hidden">
                    <TableOfContents headings={rendered.headings} />
                </div>

                <ArticleBody html={rendered.html} />

                <div class="clear-both">
                    <Backlinks entries={backlinks} />

                    {#if related.length > 0}
                        <section class="border-paper-200 dark:border-ink-800 mt-12 max-w-[70ch] border-t pt-8">
                            <h2 class="section-heading">{m.wiki_slug_related_heading()}</h2>

                            <ul class="divide-paper-200 dark:divide-ink-800 mt-4 divide-y">
                                {#each related as item ( item.id )}
                                    <li class="py-3">
                                        <a href={resolve( `entries/${ item.slug }/` )} class="wiki-link font-medium">
                                            {item.title}
                                        </a>

                                        {#if item.summary}
                                            <p class="text-muted mt-1 line-clamp-2 text-sm leading-relaxed">{item.summary}</p>
                                        {/if}
                                    </li>
                                {/each}
                            </ul>
                        </section>
                    {/if}
                </div>
            </div>
        </div>

        <div class="hidden lg:block">
            <TableOfContents headings={rendered.headings} />
        </div>
    </article>
{:else}
    <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <h1 class="text-ink-900 dark:text-paper-100 font-serif text-4xl leading-tight font-semibold tracking-tight">
            {plannedTitle}
        </h1>

        <span class="title-rule" aria-hidden="true"></span>

        <p class="call-number mt-4">/entries/{slug}</p>

        <EmptyState title={m.wiki_slug_unwritten_title()} description={m.wiki_slug_unwritten_description()}>
            <Button
                href={resolve( `new/?slug=${ encodeURIComponent( slug ) }&titre=${ encodeURIComponent( plannedTitle ) }` )}
                color="primary"
            >
                {m.common_create_this_entry()}
            </Button>

            <Button href={resolve( "/entries" )} color="alternative">{m.common_browse_wiki()}</Button>
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
