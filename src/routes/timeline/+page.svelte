<script lang="ts">
    /**
     * Chronology of the dated pages, grouped by decade or by century.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import Button from "flowbite-svelte/Button.svelte";
    import { staggerRank } from "#lib/config/motion.ts";
    import { excerpt } from "#lib/utilities/markdown.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import { wiki, type ChronologyPoint } from "#lib/state/wiki.svelte.ts";
    import { extractYear, formatUniverseDate } from "#lib/utilities/date.ts";

    /** One heading of the chronology, and the dates standing under it. */
    interface Period {
        heading: string;
        points: ChronologyPoint[];
    }

    /**
     * Span of years past which the chronology groups by century rather than by decade.
     *
     * A decade per heading keeps neighbouring dates together without giving each year
     * a heading of its own. Over two centuries that would already mean twenty headings
     * or more, most of them over a single date, so a wider corpus reads by century.
     */
    const CENTURY_THRESHOLD = 200;

    const DECADE = 10;
    const CENTURY = 100;

    /** Sort position of the dates no year can be read out of, after every dated period. */
    const UNDATED_START = Number.MAX_SAFE_INTEGER;

    /** Every date of the corpus, grouped by period, oldest first, the undated ones last. */
    const periods = $derived.by( (): Period[] =>
    {
        const years = wiki.chronology
            .map( ( point ) => extractYear( point.date.value ) )
            .filter( ( year ) => year !== null );
        const span = years.length === 0 ? 0 : Math.max( ...years ) - Math.min( ...years );
        const width = span > CENTURY_THRESHOLD ? CENTURY : DECADE;
        const groups: Record<number, ChronologyPoint[]> = {};

        for ( const point of wiki.chronology )
        {
            const year = extractYear( point.date.value );
            const start = year === null ? UNDATED_START : Math.floor( year / width ) * width;
            groups[ start ] = [ ...( groups[ start ] ?? [] ), point ];
        }

        return Object.entries( groups )
            .map( ( [ key, points ] ) => ( { start: Number( key ), points } ) )
            .sort( ( a, b ) => a.start - b.start )
            .map( ( { start, points } ) =>
            {
                const isUndated = start === UNDATED_START;
                const heading = isUndated
                    ? m.timeline_undated_group()
                    : m.timeline_period( { start, end: start + width - 1 } );
                return { heading, points };
            } );
    } );

    /**
     * Tells whether a point is the first of its page within its period.
     *
     * A page dated twice in the same decade would otherwise repeat its summary on
     * each row, so only its first row carries it.
     *
     * @param points Dates of the period, in order.
     * @param index Position of the point among them.
     * @returns Whether the summary belongs on this row.
     * @author Claude
     */
    const opensItsPage = ( points: ChronologyPoint[], index: number ): boolean =>
    {
        const entryId = points[ index ].entry.id;
        const earlier = points.slice( 0, index );
        return !earlier.some( ( point ) => point.entry.id === entryId );
    };
</script>

<PageMeta
    title={m.timeline_title( { universe: wiki.meta.universe } )}
    description={m.timeline_meta_description( { universe: wiki.meta.universe } )}
/>

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

    {#if periods.length === 0}
        <div class="mt-10">
            <EmptyState title={m.timeline_empty_title()} description={m.timeline_empty_description()}>
                <Button href={resolve( "/entries" )} color="alternative">{m.common_browse_wiki()}</Button>
            </EmptyState>
        </div>
    {:else}
        <div class="mt-12 space-y-12">
            {#each periods as period, periodIndex ( period.heading )}
                <section aria-labelledby="timeline-period-{periodIndex}">
                    <h2 id="timeline-period-{periodIndex}" class="section-heading">{period.heading}</h2>

                    <!-- The hairline of the date column runs unbroken from row to row, which is
                         why the rows carry their spacing as padding rather than as a gap. -->
                    <ol class="border-paper-200 dark:border-ink-800 mt-4 border-l sm:border-l-0">
                        {#each period.points as point, index ( `${ point.entry.id }-${ point.date.id }` )}
                            <li
                                class="rise-in grid pl-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:pl-0"
                                style="--rank: {staggerRank( index )}"
                            >
                                <p
                                    class="text-muted border-paper-200 dark:border-ink-800 pt-3 text-sm sm:border-r sm:pt-4 sm:pr-5 sm:pb-4 sm:text-right"
                                >
                                    {formatUniverseDate( point.date.value )}
                                </p>

                                <div class="min-w-0 pt-1 pb-3 sm:py-4 sm:pl-5">
                                    <p class="leading-snug break-words">
                                        <a href={resolve( `entries/${ point.entry.slug }/` )} class="wiki-link font-medium">
                                            {point.entry.title}
                                        </a>
                                        {#if point.date.label}
                                            <span class="text-muted text-sm">· {point.date.label}</span>
                                        {/if}
                                    </p>

                                    {#if opensItsPage( period.points, index )}
                                        <p class="text-ink-600 dark:text-paper-300 mt-1 max-w-2xl text-sm leading-relaxed">
                                            {point.entry.summary || excerpt( point.entry.body, 160 )}
                                        </p>
                                    {/if}
                                </div>
                            </li>
                        {/each}
                    </ol>
                </section>
            {/each}
        </div>
    {/if}
</div>
