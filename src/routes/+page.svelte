<script lang="ts">
    /**
     * Home page: an editorial entry point into the encyclopedia.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import CategoryChip from "$lib/components/CategoryChip.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import EntryCard from "$lib/components/EntryCard.svelte";
    import SeverityBadge from "$lib/components/live/SeverityBadge.svelte";
    import TypeBadge from "$lib/components/TypeBadge.svelte";
    import { staggerRank } from "$lib/config/motion";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { Entry } from "$lib/types";
    import { relativeTime } from "$lib/utilities/date";
    import { excerpt } from "$lib/utilities/markdown";

    const featured = $derived(
        wiki.meta.featured.map( ( slug ) => wiki.bySlug( slug ) ).filter( ( entry ): entry is Entry => entry !== undefined )
    );

    const headline = $derived( featured[ 0 ] );
    const secondary = $derived( featured.slice( 1, 3 ) );

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
        <!-- The hero arrives line by line, each `--rank` being one step later than the one above it. -->
        <p
            class="text-accent-600 dark:text-accent-400 rise-in text-xs font-medium tracking-[0.2em] uppercase"
            style="--rank: 0"
        >
            Encyclopédie
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
            {wiki.meta.tagline}
        </p>

        <p class="text-ink-400 rise-in mt-4 max-w-2xl leading-relaxed" style="--rank: 3">
            {wiki.meta.description}
        </p>

        <div class="rise-in mt-9 flex flex-wrap gap-3" style="--rank: 4">
            <a href={resolve( "/wiki" )} class="btn btn-primary px-5 py-2.5">Parcourir les fiches</a>
            <a href={resolve( "/categories" )} class="btn btn-outline px-5 py-2.5">Explorer les catégories</a>
        </div>

        <dl
            class="border-paper-200 dark:border-ink-800 rise-in mt-14 grid grid-cols-2 gap-6 border-t pt-8 sm:grid-cols-4"
            style="--rank: 5"
        >
            <div>
                <dt class="text-ink-400 text-xs tracking-wide uppercase">Fiches</dt>
                <dd class="font-serif text-3xl font-semibold">{wiki.publishedEntries.length}</dd>
            </div>

            <div>
                <dt class="text-ink-400 text-xs tracking-wide uppercase">Catégories</dt>
                <dd class="font-serif text-3xl font-semibold">{wiki.categories.length}</dd>
            </div>

            <div>
                <dt class="text-ink-400 text-xs tracking-wide uppercase">Fiches datées</dt>
                <dd class="font-serif text-3xl font-semibold">{wiki.chronology.length}</dd>
            </div>

            <div>
                <dt class="text-ink-400 text-xs tracking-wide uppercase">Brouillons</dt>
                <dd class="font-serif text-3xl font-semibold">{wiki.drafts.length}</dd>
            </div>
        </dl>
    </div>
</section>

{#if headline}
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 class="font-serif text-2xl font-semibold tracking-tight">À la une</h2>

        <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <article class="surface surface-lift rise-in group relative overflow-hidden">
                {#if headline.image}
                    <img
                        src={headline.image.src}
                        alt={headline.image.alt}
                        class="aspect-[16/7] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                {/if}

                <div class="space-y-4 p-6 sm:p-8">
                    <TypeBadge type={headline.type} />

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

                    <!-- Positioned so it paints above the overlay of the title and keeps its own hover. -->
                    <a
                        href={resolve( `/wiki/${ headline.slug }` )}
                        class="wiki-link relative inline-block text-sm font-medium"
                    >
                        Lire la fiche
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
                    En direct
                </h2>

                <a href={resolve( "/live" )} class="wiki-link text-sm">Tout le fil</a>
            </div>

            <ul class="mt-6 space-y-4">
                {#each latestLive as item, index ( item.id )}
                    <li class="rise-in flex flex-wrap items-baseline gap-x-3 gap-y-1" style="--rank: {staggerRank(
                        index
                    )}">
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

                        <span class="text-ink-400 shrink-0 text-xs">{relativeTime( item.publishedAt )}</span>
                    </li>
                {/each}
            </ul>
        </div>
    </section>
{/if}

<section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
    <div class="flex items-baseline justify-between gap-4">
        <h2 class="font-serif text-2xl font-semibold tracking-tight">Dernières modifications</h2>

        <a href={resolve( "/wiki" )} class="wiki-link text-sm">Tout voir</a>
    </div>

    {#if latest.length === 0}
        <div class="mt-6">
            <EmptyState
                title="Aucune fiche pour le moment"
                description="Ce wiki est vide : commencez par créer la première fiche."
            >
                <a href={resolve( "/new" )} class="btn btn-outline">Créer une fiche</a>
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
        <h2 class="font-serif text-2xl font-semibold tracking-tight">Explorer par catégorie</h2>

        <div class="mt-6 flex flex-wrap gap-2">
            {#each categoryCounts as item ( item.category.slug )}
                <CategoryChip category={item.category} count={item.count} />
            {/each}
        </div>
    </section>
{/if}
