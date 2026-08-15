<script lang="ts">
    /**
     * Chronology of the dated pages, grouped by year.
     *
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import { resolve } from "$app/paths";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { staggerRank } from "$lib/config/motion";
    import * as m from "$lib/locales/messages.js";
    import { wiki, type ChronologyPoint } from "$lib/state/wiki.svelte";
    import { extractYear, formatUniverseDate } from "$lib/utilities/date";
    import { excerpt } from "$lib/utilities/markdown";
    import { pluralize } from "$lib/utilities/plural";

    /** Heading gathering the dates no year can be read out of, such as «Le troisième hiver». */
    const UNDATED_GROUP = $derived( m.timeline_undated_group() );

    /** Every date of the corpus, grouped by year, oldest first. */
    const years = $derived.by( () =>
    {
        const groups: Record<string, ChronologyPoint[]> = {};

        for ( const point of wiki.chronology )
        {
            const year = extractYear( point.date.value );
            const key = year === null ? UNDATED_GROUP : String( year );
            groups[ key ] = [ ...( groups[ key ] ?? [] ), point ];
        }

        return Object.entries( groups ).sort( ( [ a ], [ b ] ) =>
        {
            if ( a === UNDATED_GROUP )
            {
                return 1;
            }
            if ( b === UNDATED_GROUP )
            {
                return -1;
            }
            return Number( a ) - Number( b );
        } );
    } );
</script>

<svelte:head>
    <title>{m.timeline_title( { universe: wiki.meta.universe } )}</title>

    <meta name="description" content={m.timeline_meta_description( { universe: wiki.meta.universe } )} />
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <PageHeader title={m.timeline_heading()}>
        {#snippet description()}
            {pluralize( wiki.chronology.length, {
                one: m.common_count_date_one,
                other: m.common_count_date_other
            } )}
            {m.timeline_description_middle()}
            {pluralize( wiki.datedEntries.length, {
                one: m.common_count_fiche_one,
                other: m.common_count_fiche_other
            } )}{m.timeline_description_end()}
        {/snippet}
    </PageHeader>

    {#if years.length === 0}
        <div class="mt-10">
            <EmptyState title={m.timeline_empty_title()} description={m.timeline_empty_description()}>
                <Button href={resolve( "/wiki" )} color="alternative">{m.common_browse_wiki()}</Button>
            </EmptyState>
        </div>
    {:else}
        <div class="mt-12 space-y-12">
            {#each years as [ year, points ] ( year )}
                <section>
                    <h2 class="border-paper-200 dark:border-ink-800 font-serif text-2xl font-semibold tracking-tight">
                        {year}
                    </h2>

                    <ol class="border-paper-200 dark:border-ink-800 mt-5 space-y-7 border-l">
                        {#each points as point, index ( `${ point.entry.id }-${ point.date.id }` )}
                            <li class="rise-in relative pl-6" style="--rank: {staggerRank( index )}">
                                <span
                                    class="bg-accent-500 border-paper-50 dark:border-ink-950 absolute top-2 left-[-5px] h-2.5 w-2.5 rounded-full border-2"
                                    aria-hidden="true"
                                ></span>

                                <p class="text-muted font-mono text-xs">
                                    {formatUniverseDate( point.date.value )}
                                </p>

                                <div class="mt-1.5 flex flex-wrap items-baseline gap-2">
                                    <h3 class="text-lg leading-snug font-semibold tracking-tight">
                                        <a
                                            href={resolve( `/wiki/${ point.entry.slug }` )}
                                            class="hover:text-accent-600 dark:hover:text-accent-400"
                                        >
                                            {point.entry.title}
                                        </a>
                                    </h3>

                                    {#if point.date.label}
                                        <span
                                            class="border-paper-200 dark:border-ink-800 text-muted rounded-full border px-2 py-0.5 text-xs"
                                        >
                                            {point.date.label}
                                        </span>
                                    {/if}
                                </div>

                                <p class="text-ink-500 dark:text-paper-300/80 mt-2 max-w-2xl text-sm leading-relaxed">
                                    {point.entry.summary || excerpt( point.entry.body, 160 )}
                                </p>
                            </li>
                        {/each}
                    </ol>
                </section>
            {/each}
        </div>
    {/if}
</div>
