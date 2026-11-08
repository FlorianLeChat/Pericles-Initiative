<script lang="ts">
    /**
     * Home page: the front page of the universe.
     *
     * Opens on the universe itself, its name, its description and a way to
     * search it, then puts the chosen pages forward, and beside each other the
     * latest edits and the latest dispatches. Figures belong to the dashboard,
     * not to a reader's first screen.
     *
     * An empty wiki is the first thing a new visitor meets, so it says what the
     * site is, under the universe's name while no description has been written,
     * and under its invitation that everything stays in this browser, with the
     * way to the backups. Neither says anything once the wiki holds a page.
     *
     * The search field of the opening only shows below the `lg` breakpoint. From
     * there up, the header carries a labelled search pill with its shortcut, and a
     * second field a few centimetres below it was the same control twice. On a
     * phone the header only has an icon, so the field is the one labelled way in,
     * and the one the thumb reaches.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import Pin from "@lucide/svelte/icons/pin";
    import type { Entry } from "#lib/types.ts";
    import Kbd from "flowbite-svelte/Kbd.svelte";
    import * as m from "#lib/locales/messages.js";
    import Search from "@lucide/svelte/icons/search";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import { locales } from "#lib/locales/runtime.js";
    import Button from "flowbite-svelte/Button.svelte";
    import { TOUCH_HEIGHT } from "#lib/config/forms.ts";
    import { search } from "#lib/state/search.svelte.ts";
    import { excerpt } from "#lib/utilities/markdown.ts";
    import { platform } from "#lib/state/platform.svelte.ts";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import { FEATURED_LIST_LENGTH } from "#lib/config/featured.ts";
    import CategoryChip from "#lib/components/wiki/CategoryChip.svelte";
    import SeverityBadge from "#lib/components/live/SeverityBadge.svelte";
    import { formatShortDate, relativeTime } from "#lib/utilities/date.ts";

    /** Pages listed under the latest edits. */
    const LATEST_LENGTH = 6;

    /** Dispatches shown from the live feed. */
    const LIVE_LENGTH = 4;

    /** Hairlines between the rows of every list on this page, and around them. */
    const HAIRLINE_LIST = "divide-paper-200 dark:divide-ink-700 border-paper-200 dark:border-ink-700 divide-y";

    /** The lead and the column of pages beside it, from `lg`. */
    const FEATURED_COLUMNS = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]";

    /** The pages under a lead taking the whole width, side by side from `sm`. */
    const FEATURED_ROW = "sm:grid sm:grid-cols-2 sm:gap-x-10 sm:divide-y-0";

    const isEmpty = $derived( wiki.entries.length === 0 );

    /**
     * True while the universe still carries the name normalisation gives it, in
     * whichever language it was given. The opening then says where the reader
     * stands rather than printing «Univers sans nom» a second time under the
     * header, which already shows it.
     */
    const isUnnamed = $derived(
        locales.some( ( locale ) => wiki.meta.universe === m.dataset_unnamed_universe( {}, { locale } ) )
    );

    const featured = $derived(
        wiki.meta.featured
            .map( ( slug ) => wiki.bySlug( slug ) )
            .filter( ( entry ): entry is Entry => entry !== undefined )
    );

    const lead = $derived( featured[ 0 ] );
    const featuredList = $derived( featured.slice( 1, 1 + FEATURED_LIST_LENGTH ) );

    /**
     * Fewer pages beside the lead than the column holds. Two short rows beside
     * a tall plate left most of the column empty, so the lead then takes the
     * whole width and the others line up under it, side by side from `sm`.
     */
    const featuredSparse = $derived( featuredList.length < FEATURED_LIST_LENGTH );

    const featuredIds = $derived( new Set( featured.map( ( entry ) => entry.id ) ) );

    const latest = $derived(
        wiki.recentlyUpdated
            .filter( ( entry ) => entry.status === "publie" && !featuredIds.has( entry.id ) )
            .slice( 0, LATEST_LENGTH )
    );

    const latestLive = $derived( wiki.live.slice( 0, LIVE_LENGTH ) );

    const hasBothColumns = $derived( latest.length > 0 && latestLive.length > 0 );

    const columns = $derived( hasBothColumns ? "lg:grid-cols-2" : "" );

    const categoryCounts = $derived(
        wiki.categories
            .map( ( category ) => ( { category, count: wiki.entriesInCategory( category.slug ).length } ) )
            .sort( ( a, b ) => b.count - a.count )
    );

    const shortcut = $derived( platform.apple ? m.site_header_shortcut_label_apple() : m.site_header_shortcut_label() );

    /**
     * What a listing says of a page: its summary, or the start of its body.
     *
     * @param entry The page.
     * @param length Longest excerpt taken from the body.
     * @returns A sentence or two.
     * @author Claude
     */
    const leadOf = ( entry: Entry, length: number ): string => entry.summary || excerpt( entry.body, length );
</script>

<PageMeta title={wiki.meta.universe} />

<section class="border-paper-200 dark:border-ink-700 border-b" aria-labelledby="home-title">
    <div class="mx-auto max-w-6xl px-4 pt-8 pb-8 sm:px-6 sm:pt-14 sm:pb-12">
        <h1
            id="home-title"
            class="text-ink-900 dark:text-paper-100 rise-in max-w-3xl font-serif text-4xl leading-tight font-semibold
                   tracking-tight sm:text-5xl"
            style="--rank: 0"
        >
            {isUnnamed ? m.home_unnamed_title() : wiki.meta.universe}
        </h1>

        <span class="title-rule" aria-hidden="true"></span>

        {#if wiki.meta.description}
            <p
                class="text-ink-600 dark:text-paper-300 rise-in mt-4 max-w-measure text-lg leading-relaxed text-pretty"
                style="--rank: 1"
            >
                {wiki.meta.description}
            </p>
        {:else if isEmpty}
            <p
                class="text-ink-600 dark:text-paper-300 rise-in mt-4 max-w-measure text-lg leading-relaxed text-pretty"
                style="--rank: 1"
            >
                {m.home_empty_lede()}
            </p>
        {/if}

        {#if !isEmpty}
            <div class="rise-in mt-6 max-w-xl" style="--rank: 2">
                <button
                    type="button"
                    class="border-paper-300 text-muted hover:border-paper-400 dark:border-ink-700 dark:bg-ink-900
                           dark:hover:border-ink-600 flex h-12 w-full items-center gap-3 rounded-full border bg-white
                           px-5 text-left transition-colors lg:hidden"
                    onclick={() => ( search.open = true )}
                >
                    <Search class="h-5 w-5 shrink-0" aria-hidden="true" />

                    <span class="flex-1 truncate">{m.home_search_label()}</span>

                    <Kbd
                        class="dark:bg-ink-800 dark:border-ink-700 bg-paper-100 hidden px-1.5 py-1 font-sans text-xs
                               leading-none font-normal sm:inline-flex"
                    >
                        {shortcut}
                    </Kbd>
                </button>

                <p class="mt-4 flex flex-wrap gap-x-5 text-sm sm:gap-y-2">
                    <a href={resolve( "/entries" )} class="wiki-link inline-flex items-center {TOUCH_HEIGHT}">
                        {m.home_hero_browse_button()}
                    </a>
                    <a href={resolve( "/categories" )} class="wiki-link inline-flex items-center {TOUCH_HEIGHT}">
                        {m.home_hero_categories_button()}
                    </a>
                </p>
            </div>
        {/if}
    </div>
</section>

{#if isEmpty}
    <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <EmptyState title={m.common_empty_wiki_title()} description={m.common_empty_wiki_description()}>
            <Button href={resolve( "/new" )} color="primary">{m.common_create_entry()}</Button>
            <a href={resolve( "/data" )} class="wiki-link content-center text-sm text-balance {TOUCH_HEIGHT}">{m.home_empty_demo_link()}</a>
        </EmptyState>

        <p class="text-muted mx-auto mt-4 max-w-md text-center text-sm leading-relaxed">
            {m.home_empty_storage_intro()}
            <a href={resolve( "/data" )} class="wiki-link">{m.common_backups_link()}</a>.
        </p>
    </div>
{:else}
    <div class="pb-16">
        {#if lead}
            <section class="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12" aria-labelledby="home-featured">
                <h2 id="home-featured" class="section-heading">{m.home_featured_heading()}</h2>

                <div
                    class="mt-5 grid grid-cols-1 gap-8 lg:gap-10
                           {featuredSparse ? "" : FEATURED_COLUMNS}"
                >
                    <article class="group relative">
                        {#if lead.image}
                            <img
                                src={lead.image.src}
                                alt={lead.image.alt}
                                class="border-paper-200 dark:border-ink-700 mb-5 aspect-[16/8] w-full rounded-xl border
                                       object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                        {/if}

                        <h3 class="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                            <a
                                href={resolve( `entries/${ lead.slug }/` )}
                                class="group-hover:text-accent-600 dark:group-hover:text-accent-400 stretched-link"
                            >
                                {lead.title}
                            </a>
                        </h3>

                        <p class="text-ink-600 dark:text-paper-300 mt-3 max-w-measure leading-relaxed text-pretty">
                            {leadOf( lead, 280 )}
                        </p>
                    </article>

                    {#if featuredList.length > 0}
                        <ul
                            class="border-t {HAIRLINE_LIST}
                                   {featuredSparse ? FEATURED_ROW : "lg:border-t-0"}"
                        >
                            {#each featuredList as entry ( entry.id )}
                                <li class="group relative py-4 first:pt-4 {featuredSparse ? "" : "lg:first:pt-0"}">
                                    <h3 class="text-lg leading-snug font-semibold tracking-tight">
                                        <a
                                            href={resolve( `entries/${ entry.slug }/` )}
                                            class="group-hover:text-accent-600 dark:group-hover:text-accent-400
                                                   stretched-link"
                                        >
                                            {entry.title}
                                        </a>
                                    </h3>

                                    <p class="text-muted mt-1 line-clamp-2 text-sm leading-relaxed">
                                        {leadOf( entry, 160 )}
                                    </p>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            </section>
        {/if}

        {#if latest.length > 0 || latestLive.length > 0}
            <div
                class="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 pt-12 sm:px-6 {columns}
                       lg:gap-16"
            >
                {#if latest.length > 0}
                    <section aria-labelledby="home-latest">
                        <div class="flex items-baseline justify-between gap-4">
                            <h2 id="home-latest" class="section-heading">{m.common_recent_changes_heading()}</h2>

                            <a
                                id="home-latest-all"
                                href="{resolve( "entries/" )}?tri=recent"
                                class="wiki-link inline-flex items-center text-sm {TOUCH_HEIGHT}"
                                aria-labelledby="home-latest-all home-latest"
                            >
                                {m.home_see_all()}
                            </a>
                        </div>

                        <ul class="mt-4 border-y {HAIRLINE_LIST}">
                            {#each latest as entry ( entry.id )}
                                <li class="group relative flex items-baseline gap-4 py-3">
                                    <div class="min-w-0 flex-1">
                                        <h3 class="leading-snug font-medium">
                                            <a
                                                href={resolve( `entries/${ entry.slug }/` )}
                                                class="group-hover:text-accent-600 dark:group-hover:text-accent-400
                                                       stretched-link"
                                            >
                                                {entry.title}
                                            </a>
                                        </h3>

                                        <p class="text-muted mt-0.5 truncate text-sm">{leadOf( entry, 120 )}</p>
                                    </div>

                                    <time datetime={entry.updatedAt} class="text-muted shrink-0 text-xs">
                                        {formatShortDate( entry.updatedAt )}
                                    </time>
                                </li>
                            {/each}
                        </ul>
                    </section>
                {/if}

                {#if latestLive.length > 0}
                    <section aria-labelledby="home-live">
                        <div class="flex items-baseline justify-between gap-4">
                            <h2 id="home-live" class="section-heading">{m.common_live_label()}</h2>

                            <a
                                id="home-live-all"
                                href={resolve( "/live" )}
                                class="wiki-link inline-flex items-center text-sm {TOUCH_HEIGHT}"
                                aria-labelledby="home-live-all home-live"
                            >
                                {m.home_see_all()}
                            </a>
                        </div>

                        <ul class="mt-4 border-y {HAIRLINE_LIST}">
                            {#each latestLive as item ( item.id )}
                                <li class="group relative py-3">
                                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <SeverityBadge severity={item.severity} />

                                        {#if item.pinned}
                                            <span class="text-muted inline-flex items-center gap-1 text-xs">
                                                <Pin class="h-3.5 w-3.5" aria-hidden="true" />
                                                {m.live_item_pinned_badge()}
                                            </span>
                                        {/if}

                                        <time datetime={item.publishedAt} class="text-muted ml-auto text-xs">
                                            {relativeTime( item.publishedAt )}
                                        </time>
                                    </div>

                                    <a
                                        href={item.entrySlug
                                            ? resolve( `entries/${ item.entrySlug }/` )
                                            : resolve( "/live" )}
                                        class="group-hover:text-accent-600 dark:group-hover:text-accent-400
                                               stretched-link mt-1.5 block leading-snug font-medium"
                                    >
                                        {item.title}
                                    </a>
                                </li>
                            {/each}
                        </ul>
                    </section>
                {/if}
            </div>
        {/if}

        {#if categoryCounts.length > 0}
            <section class="mx-auto max-w-6xl px-4 pt-12 sm:px-6" aria-labelledby="home-categories">
                <h2 id="home-categories" class="section-heading">{m.home_explore_categories_heading()}</h2>

                <div class="mt-4 flex flex-wrap gap-2">
                    {#each categoryCounts as item ( item.category.slug )}
                        <CategoryChip category={item.category} count={item.count} />
                    {/each}
                </div>
            </section>
        {/if}
    </div>
{/if}
