<script lang="ts">
    /**
     * Home page: an editorial entry point into the encyclopedia.
     *
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import { resolve } from "$app/paths";
    import CategoryChip from "$lib/components/CategoryChip.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import EntryCard from "$lib/components/EntryCard.svelte";
    import SeverityBadge from "$lib/components/live/SeverityBadge.svelte";
    import { ACTION_ROW } from "$lib/config/forms";
    import { staggerRank } from "$lib/config/motion";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { Entry } from "$lib/types";
    import { relativeTime } from "$lib/utilities/date";
    import { excerpt } from "$lib/utilities/markdown";

    const featured = $derived(
        wiki.meta.featured.map( ( slug ) => wiki.bySlug( slug ) ).filter( ( entry ): entry is Entry => entry !== undefined )
    );

    const headline = $derived( featured[ 0 ] );
    const secondary = $derived( featured.slice( 1, 3 ) );

    const headlineCategories = $derived(
        ( headline?.categories ?? [] )
            .map( ( slug ) => wiki.categoriesBySlug.get( slug ) )
            .filter( ( category ) => category !== undefined )
    );

    const latest = $derived( wiki.recentlyUpdated.filter( ( entry ) => entry.status === "publie" ).slice( 0, 6 ) );

    const latestLive = $derived( wiki.live.slice( 0, 4 ) );

    const categoryCounts = $derived(
        wiki.categories
            .map( ( category ) => ( { category, count: wiki.entriesInCategory( category.slug ).length } ) )
            .sort( ( a, b ) => b.count - a.count )
    );
</script>

<svelte:head>
    <title>{wiki.meta.universe}</title>

    <meta name="description" content={wiki.meta.description} />
</svelte:head>

<section class="border-paper-200 dark:border-ink-800 border-b">
    <div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <p
            class="text-accent-600 dark:text-accent-400 rise-in text-xs font-medium tracking-[0.2em] uppercase"
            style="--rank: 0"
        >
            {m.home_hero_eyebrow()}
        </p>

        <h1
            class="rise-in mt-4 max-w-3xl font-serif text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl"
            style="--rank: 1"
        >
            {wiki.meta.universe}
        </h1>

        <p
            class="text-ink-600 dark:text-paper-300 rise-in mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl"
            style="--rank: 2"
        >
            {wiki.meta.description}
        </p>

        <div class="rise-in mt-9 {ACTION_ROW}" style="--rank: 3">
            <Button href={resolve( "/wiki" )} color="primary" size="lg">{m.home_hero_browse_button()}</Button>
            <Button href={resolve( "/categories" )} color="alternative" size="lg">
                {m.home_hero_categories_button()}
            </Button>
        </div>

        <dl
            class="border-paper-200 dark:border-ink-800 rise-in mt-14 grid grid-cols-2 gap-6 border-t pt-8 sm:grid-cols-4"
            style="--rank: 4"
        >
            <div>
                <dt class="text-muted text-xs tracking-wide uppercase">{m.common_entries_label()}</dt>
                <dd class="font-serif text-3xl font-semibold">{wiki.publishedEntries.length}</dd>
            </div>

            <div>
                <dt class="text-muted text-xs tracking-wide uppercase">{m.common_categories_label()}</dt>
                <dd class="font-serif text-3xl font-semibold">{wiki.categories.length}</dd>
            </div>

            <div>
                <dt class="text-muted text-xs tracking-wide uppercase">{m.home_stat_dated()}</dt>
                <dd class="font-serif text-3xl font-semibold">{wiki.datedEntries.length}</dd>
            </div>

            <div>
                <dt class="text-muted text-xs tracking-wide uppercase">{m.home_stat_drafts()}</dt>
                <dd class="font-serif text-3xl font-semibold">{wiki.drafts.length}</dd>
            </div>
        </dl>
    </div>
</section>

{#if headline}
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 class="font-serif text-2xl font-semibold tracking-tight">{m.home_featured_heading()}</h2>

        <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <article class="surface surface-lift rise-in group relative overflow-hidden">
                {#if headline.image}
                    <img
                        src={headline.image.src}
                        alt={headline.image.alt}
                        class="aspect-[16/7] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                        decoding="async"
                    />
                {/if}

                <div class="space-y-4 p-6 sm:p-8">
                    {#if headlineCategories.length > 0}
                        <div class="flex flex-wrap items-center gap-2">
                            {#each headlineCategories as category ( category.slug )}
                                <CategoryChip {category} />
                            {/each}
                        </div>
                    {/if}

                    <h3 class="font-serif text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                        <a
                            href={resolve( `/wiki/${ headline.slug }` )}
                            class="hover:text-accent-600 dark:hover:text-accent-400 stretched-link"
                        >
                            {headline.title}
                        </a>
                    </h3>

                    <p class="text-ink-500 dark:text-paper-300/80 leading-relaxed">
                        {headline.summary || excerpt( headline.body, 240 )}
                    </p>

                    <a
                        href={resolve( `/wiki/${ headline.slug }` )}
                        class="wiki-link relative inline-block text-sm font-medium"
                    >
                        {m.home_read_entry()}
                    </a>
                </div>
            </article>

            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
                {#each secondary as entry, index ( entry.id )}
                    <EntryCard {entry} {index} />
                {/each}
            </div>
        </div>
    </section>
{/if}

{#if latestLive.length > 0}
    <section class="border-paper-200 dark:border-ink-800 border-y">
        <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div class="flex items-baseline justify-between gap-4">
                <h2 class="flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight">
                    <span class="bg-alert-500 h-2 w-2 animate-pulse rounded-full" aria-hidden="true"></span>
                    {m.common_live_label()}
                </h2>

                <a href={resolve( "/live" )} class="wiki-link text-sm">{m.home_live_see_all()}</a>
            </div>

            <ul class="mt-6 space-y-4">
                {#each latestLive as item, index ( item.id )}
                    <li
                        class="rise-in flex flex-wrap items-baseline gap-x-3 gap-y-1"
                        style="--rank: {staggerRank( index )}"
                    >
                        <SeverityBadge severity={item.severity} />

                        <span class="min-w-0 flex-1">
                            {#if item.entrySlug}
                                <a href={resolve( `/wiki/${ item.entrySlug }` )} class="font-medium hover:underline"
                                    >{item.title}</a
                                >
                            {:else}
                                <a href={resolve( "/live" )} class="font-medium hover:underline">{item.title}</a>
                            {/if}
                        </span>

                        <time datetime={item.publishedAt} class="text-muted shrink-0 text-xs">
                            {relativeTime( item.publishedAt )}
                        </time>
                    </li>
                {/each}
            </ul>
        </div>
    </section>
{/if}

<section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
    <div class="flex items-baseline justify-between gap-4">
        <h2 class="font-serif text-2xl font-semibold tracking-tight">{m.common_recent_changes_heading()}</h2>

        <a href={resolve( "/wiki" )} class="wiki-link text-sm">{m.home_recent_see_all()}</a>
    </div>

    {#if latest.length === 0}
        <div class="mt-6">
            <EmptyState title={m.common_empty_wiki_title()} description={m.common_empty_wiki_description()}>
                <Button href={resolve( "/new" )} color="alternative">{m.common_create_entry()}</Button>
            </EmptyState>
        </div>
    {:else}
        <div class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {#each latest as entry, index ( entry.id )}
                <EntryCard {entry} {index} />
            {/each}
        </div>
    {/if}
</section>

{#if categoryCounts.length > 0}
    <section class="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <h2 class="font-serif text-2xl font-semibold tracking-tight">{m.home_explore_categories_heading()}</h2>

        <div class="mt-6 flex flex-wrap gap-2">
            {#each categoryCounts as item ( item.category.slug )}
                <CategoryChip category={item.category} count={item.count} />
            {/each}
        </div>
    </section>
{/if}
