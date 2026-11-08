<script lang="ts">
    /**
     * A single encyclopedia page.
     *
     * A slug with no page behind it is not an error: red links lead here, and
     * this is where a page gets created from.
     *
     * A device set to read only (`reading`) shows neither «Modifier» on a page nor
     * «L'écrire» on a red link: a player at the table is looking something up, and
     * the red link page still tells them which pages wait for this one.
     *
     * A red link page is an invitation rather than a missing page: under the title,
     * how many pages cite it, then «Personne n'a encore écrit cette fiche» and
     * «L'écrire», then each citing page with the sentence holding its link. The
     * address it will take is a technical value addressed to the author, so it
     * only shows to a writing device, as the hint of the action that creates it.
     * A reading device gets the title alone, never an invitation to write, and
     * no second sentence restating it.
     *
     * «Modifier» closes the meta line, after the date and the length, rather than
     * standing at the end of the breadcrumb. On a phone the breadcrumb wraps, and
     * the button then fell on a line of its own between it and the title, the one
     * place where nothing but a breadcrumb belongs. The draft marker opens that
     * same line rather than standing over the title as a kicker. Below `lg` the
     * date and length take what the button leaves and wrap within it, so the
     * button stays on their row rather than on one of its own.
     *
     * The infobox floats right of the body from `lg`. From `xl`, where the body
     * keeps its measure beside it, it takes a column of its own spanning the
     * header and the body, its top level with the title: floated after the
     * header, it started beside the first section and left an empty quadrant
     * beside the title and the lede. Its place in the document does not move,
     * between the lede and the body, so the keyboard still reaches the facts
     * before the prose.
     *
     * The foot of a page names the next red link to write, so an author who has
     * just finished one page has the next invitation in front of them rather than
     * on the dashboard: one of the links this page makes when it has any, the one
     * the most pages wait for otherwise. A reading device does not show it.
     *
     * @author Claude
     */
    import { page } from "$app/state";
    import { resolve } from "$app/paths";
    import { goto } from "$app/navigation";
    import Kbd from "flowbite-svelte/Kbd.svelte";
    import * as m from "#lib/locales/messages.js";
    import type { Category } from "#lib/types.ts";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { TOUCH_HEIGHT } from "#lib/config/forms.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { humanizeSlug } from "#lib/utilities/slug.ts";
    import { reading } from "#lib/state/reading.svelte.ts";
    import { formatLongDate } from "#lib/utilities/date.ts";
    import Infobox from "#lib/components/wiki/Infobox.svelte";
    import Breadcrumb from "flowbite-svelte/Breadcrumb.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import ArticleBody from "#lib/components/wiki/ArticleBody.svelte";
    import CitingPages from "#lib/components/wiki/CitingPages.svelte";
    import BreadcrumbItem from "flowbite-svelte/BreadcrumbItem.svelte";
    import TableOfContents from "#lib/components/wiki/TableOfContents.svelte";
    import { BREADCRUMB_LIST, BREADCRUMB_STEP } from "#lib/config/navigation.ts";
    import { countWords, describeLength, excerpt, renderArticle } from "#lib/utilities/markdown.ts";

    /** Elements a typed letter belongs to, which the E of the editor must leave alone. */
    const FIELD_SELECTOR = "input, textarea, select, [contenteditable='true']";

    const slug = $derived( page.params.slug ?? "" );
    const entry = $derived( wiki.bySlug( slug ) );

    const rendered = $derived( entry ? renderArticle( entry.body, wiki.slugs ) : null );
    const backlinks = $derived( wiki.backlinksOf( slug ) );
    const related = $derived( entry ? wiki.relatedTo( entry ) : [] );

    /** Humanised slug, used to prefill the title of a page that does not exist yet. */
    const plannedTitle = $derived( humanizeSlug( slug ) );

    /**
     * The red link to write after this page: one this page makes, the first it
     * meets, or failing that the one the most pages of the wiki wait for.
     */
    const nextToWrite = $derived.by( (): string | null =>
    {
        const own = entry ? [ ...( wiki.outgoingLinks.get( entry.slug ) ?? [] ) ] : [];
        const ownMissing = own.find( ( target ) => !wiki.slugs.has( target ) );

        return ownMissing ?? wiki.missingLinks[ 0 ]?.slug ?? null;
    } );

    const categories = $derived(
        ( entry?.categories ?? [] )
            .map( ( item ) => wiki.categoriesBySlug.get( item ) )
            .filter( ( item ): item is Category => item !== undefined )
    );

    const words = $derived( entry ? countWords( entry.body ) : 0 );
    const extent = $derived( describeLength( words ) );

    const metaTitle = $derived(
        entry
            ? m.wiki_slug_title( { name: entry.title, universe: wiki.meta.universe } )
            : m.wiki_slug_title_unwritten( { universe: wiki.meta.universe } )
    );

    const metaDescription = $derived( entry ? entry.summary || excerpt( entry.body, 155 ) : undefined );

    /**
     * Opens the editor on E, from anywhere on the page but a field, on a device
     * that writes. A modifier, a field, an editable surface or an open dialog
     * leave the key to whatever it means there.
     *
     * @param event Keyboard event on the window.
     * @author Claude
     */
    const onKeydown = ( event: KeyboardEvent ): void =>
    {
        const target = event.target instanceof HTMLElement ? event.target : null;
        const inField = Boolean( target?.closest( FIELD_SELECTOR ) );
        const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
        const dialogOpen = document.querySelector( "dialog[open]" ) !== null;
        const isEditKey = event.key.toLowerCase() === "e";

        if ( !entry || reading.enabled || !isEditKey || hasModifier || inField || dialogOpen )
        {
            return;
        }

        event.preventDefault();
        void goto( resolve( `edit/${ entry.slug }/` ) );
    };
</script>

<svelte:window onkeydown={onKeydown} />

<PageMeta title={metaTitle} description={metaDescription} />

{#if entry && rendered}
    <article
        class="mx-auto grid max-w-7xl grid-cols-1 gap-x-12 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_13rem] lg:py-12
               xl:gap-x-16"
    >
        <div class="min-w-0 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:grid-rows-[auto_1fr] xl:gap-x-10">
            <header class="rise-in xl:col-start-1">
                <Breadcrumb
                    ariaLabel={m.common_breadcrumb_aria()}
                    class="text-muted text-sm"
                    classes={{ list: BREADCRUMB_LIST }}
                >
                    <BreadcrumbItem home href={resolve( "/entries" )} homeClass={BREADCRUMB_STEP}>
                        {#snippet icon()}{/snippet}

                        {m.common_encyclopedia_label()}
                    </BreadcrumbItem>

                    {#if categories[ 0 ]}
                        <BreadcrumbItem href={resolve( `categories/${ categories[ 0 ].slug }/` )} linkClass={BREADCRUMB_STEP}>
                            {#snippet icon()}
                                <ChevronRight class="text-muted mx-1 h-4 w-4" />
                            {/snippet}

                            {categories[ 0 ].name}
                        </BreadcrumbItem>
                    {/if}

                    <BreadcrumbItem aria-current="page" spanClass={BREADCRUMB_STEP}>
                        {#snippet icon()}
                            <ChevronRight class="text-muted mx-1 h-4 w-4" />
                        {/snippet}

                        {entry.title}
                    </BreadcrumbItem>
                </Breadcrumb>

                <h1
                    class="text-ink-900 dark:text-paper-100 mt-6 font-serif text-4xl leading-[1.1] font-semibold
                           tracking-tight text-balance sm:text-5xl"
                >
                    {entry.title}
                </h1>

                <span class="title-rule" aria-hidden="true"></span>

                <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {#if entry.status === "brouillon"}
                        <p
                            class="border-signal-700/60 text-signal-700 rounded-md border border-dashed px-3 py-1 text-xs
                                   font-medium"
                        >
                            {m.wiki_slug_draft_label()}
                        </p>
                    {/if}

                    <p class="text-muted text-xs max-lg:min-w-0 max-lg:grow max-lg:basis-40">
                        {m.wiki_slug_updated_prefix()}
                        <time datetime={entry.updatedAt}>{formatLongDate( entry.updatedAt )}</time>
                        · {extent}
                    </p>

                    {#if !reading.enabled}
                        <Button
                            href={resolve( `edit/${ entry.slug }/` )}
                            color="alternative"
                            size="xs"
                            class="gap-2 rounded-full {TOUCH_HEIGHT}"
                            aria-keyshortcuts="E"
                        >
                            {m.common_edit_action()}
                            <Kbd class="pointer-coarse:hidden px-1 py-0.5 text-xs font-normal" aria-hidden="true">
                                {m.wiki_slug_edit_shortcut()}
                            </Kbd>
                        </Button>
                    {/if}
                </div>

                {#if entry.summary}
                    <p class="text-ink-700 dark:text-paper-200 mt-6 max-w-measure text-lg leading-relaxed text-pretty sm:text-xl">
                        {entry.summary}
                    </p>
                {/if}
            </header>

            <div
                class="rise-in mt-8 lg:float-right lg:mt-10 lg:mb-6 lg:ml-10 lg:w-80 xl:col-start-2 xl:row-span-2
                       xl:row-start-1 xl:float-none xl:mt-16 xl:mb-0 xl:ml-0 xl:w-auto xl:self-start"
                style="--rank: 1"
            >
                <Infobox {entry} />
            </div>

            <div class="rise-in mt-8 lg:mt-10 xl:col-start-1 xl:mt-0" style="--rank: 1">
                <div class="mb-8 lg:hidden">
                    <TableOfContents headings={rendered.headings} />
                </div>

                <ArticleBody html={rendered.html} />

                <div class="clear-both max-w-measure">
                    <CitingPages entries={backlinks} slug={entry.slug} title={m.backlinks_title()} />

                    {#if related.length > 0}
                        <section class="border-paper-200 dark:border-ink-700 mt-12 border-t pt-8">
                            <h2 class="section-heading">{m.wiki_slug_related_heading()}</h2>

                            <ul class="divide-paper-200 dark:divide-ink-700 mt-4 divide-y">
                                {#each related as item ( item.id )}
                                    <li class="relative py-3">
                                        <a href={resolve( `entries/${ item.slug }/` )} class="row-link stretched-link font-medium">
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

                    {#if nextToWrite && !reading.enabled}
                        <p
                            class="text-muted border-paper-200 dark:border-ink-700 mt-12 border-t pt-6 text-sm"
                        >
                            {m.wiki_slug_next_to_write()}
                            <a
                                href={resolve( `entries/${ nextToWrite }/` )}
                                class="wiki-link-missing -my-3 inline-block py-3 font-medium sm:my-0 sm:py-0"
                            >
                                {humanizeSlug( nextToWrite )}<span class="sr-only"> {m.markdown_missing_page_hint()}</span>
                            </a>
                        </p>
                    {/if}
                </div>
            </div>
        </div>

        <div class="hidden lg:block">
            <TableOfContents headings={rendered.headings} />
        </div>
    </article>
{:else}
    <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div class="max-w-3xl">
            <h1 class="text-ink-900 dark:text-paper-100 font-serif text-4xl leading-tight font-semibold tracking-tight">
                {plannedTitle}
            </h1>

            <span class="title-rule" aria-hidden="true"></span>

            {#if backlinks.length > 0}
                <p class="text-muted mt-4 text-sm">
                    {pluralize( backlinks.length, { one: m.wiki_slug_cited_one, other: m.wiki_slug_cited_other } )}
                </p>
            {/if}

            <div class="mt-8">
                <EmptyState
                    title={m.wiki_slug_unwritten_title()}
                    description={reading.enabled ? undefined : m.wiki_slug_unwritten_description()}
                >
                    {#if !reading.enabled}
                        <Button
                            href={resolve(
                                `new/?slug=${ encodeURIComponent( slug ) }&titre=${ encodeURIComponent( plannedTitle ) }`
                            )}
                            color="primary"
                        >
                            {m.wiki_slug_write_button()}
                        </Button>
                    {/if}

                    <Button href={resolve( "/entries" )} color="alternative">{m.common_browse_wiki()}</Button>
                </EmptyState>

                {#if !reading.enabled}
                    <p class="text-muted mt-3 text-center text-xs">
                        {m.wiki_slug_write_hint()} <span class="machine-string">/entries/{slug}/</span>
                    </p>
                {/if}
            </div>

            {#if backlinks.length > 0}
                <CitingPages entries={backlinks} {slug} title={m.wiki_slug_backlinks_title()} />
            {/if}
        </div>
    </div>
{/if}
