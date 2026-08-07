<script lang="ts">
    /**
     * Chronology of the dated pages, grouped by year.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import TypeBadge from "$lib/components/TypeBadge.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { Entry } from "$lib/types";
    import { extractYear, formatUniverseDate } from "$lib/utilities/date";
    import { excerpt } from "$lib/utilities/markdown";

    /** Pages with an in universe date, grouped by year, oldest first. */
    const years = $derived.by( () =>
    {
        const groups: Record<string, Entry[]> = {};

        for ( const entry of wiki.chronology )
        {
            const year = extractYear( entry.timelineDate );
            const key = year === null ? "Sans année" : String( year );
            groups[ key ] = [ ...( groups[ key ] ?? [] ), entry ];
        }

        return Object.entries( groups ).sort( ( [ a ], [ b ] ) =>
        {
            if ( a === "Sans année" )
            {
                return 1;
            }
            if ( b === "Sans année" )
            {
                return -1;
            }
            return Number( a ) - Number( b );
        } );
    } );
</script>

<svelte:head>
    <title>Chronologie · {wiki.meta.universe}</title>

    <meta name="description" content="Les événements datés de {wiki.meta.universe}, dans l'ordre." />
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <header class="max-w-2xl">
        <h1 class="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Chronologie</h1>

        <p class="text-ink-400 mt-3 leading-relaxed">
            {wiki.chronology.length} fiches portent une date dans l'univers. Les autres, personnages et concepts sans ancrage
            précis, n'apparaissent pas ici.
        </p>
    </header>

    {#if years.length === 0}
        <div class="mt-10">
            <EmptyState
                title="Aucune fiche datée"
                description="Renseignez le champ « Date dans l'univers » d'une fiche pour la voir apparaître ici."
            >
                <a href={resolve( "/wiki" )} class="btn btn-outline">Parcourir l'encyclopédie</a>
            </EmptyState>
        </div>
    {:else}
        <div class="mt-12 space-y-12">
            {#each years as [ year, entries ] ( year )}
                <section>
                    <h2 class="border-paper-200 dark:border-ink-800 font-serif text-2xl font-semibold tracking-tight">
                        {year}
                    </h2>

                    <ol class="border-paper-200 dark:border-ink-800 mt-5 space-y-7 border-l">
                        {#each entries as entry ( entry.id )}
                            <li class="relative pl-6">
                                <span
                                    class="bg-accent-500 border-paper-50 dark:border-ink-950 absolute top-2 left-[-5px] h-2.5 w-2.5 rounded-full border-2"
                                    aria-hidden="true"
                                ></span>

                                <p class="text-ink-400 font-mono text-xs">
                                    {formatUniverseDate( entry.timelineDate )}
                                </p>

                                <div class="mt-1.5 flex flex-wrap items-center gap-2">
                                    <h3 class="text-lg leading-snug font-semibold tracking-tight">
                                        <a
                                            href={resolve( `/wiki/${ entry.slug }` )}
                                            class="hover:text-accent-600 dark:hover:text-accent-400"
                                        >
                                            {entry.title}
                                        </a>
                                    </h3>

                                    <TypeBadge type={entry.type} />
                                </div>

                                <p class="text-ink-500 dark:text-paper-300/80 mt-2 max-w-2xl text-sm leading-relaxed">
                                    {entry.summary || excerpt( entry.body, 160 )}
                                </p>
                            </li>
                        {/each}
                    </ol>
                </section>
            {/each}
        </div>
    {/if}
</div>
