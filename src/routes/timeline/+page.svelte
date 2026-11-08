<script lang="ts">
    /**
     * Chronology of the dated pages, grouped by decade or by century.
     *
     * From three periods on, a row of links under the header jumps to each of
     * them, named by the year it opens on. A player at the table asking what
     * happened in the forties should not have to scroll past every decade before
     * it on a phone. They are drawn as links, in the accent and with no fill,
     * since they move the reader and filter nothing: dressed as the filter pills,
     * they read as radios, and took three rows of a phone before the first date.
     * Each is 44px tall there, and their tight row holds a dozen periods on two.
     *
     * Between two periods holding dates, a span of years nothing was recorded in
     * gets one muted line with a dashed edge, «2030 à 2039 · rien de consigné»,
     * a run of empty periods collapsing into a single line: dropping them made a
     * gap in the history of the world invisible, two decades reading as one.
     *
     * The lede says the pages carrying no date are left out. On a device that
     * writes, it adds where the dashboard lists them by name, among its points of
     * attention; a reading device has no use for the author's workbench, so the
     * sentence stops there.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import { TOUCH_HEIGHT } from "#lib/config/forms.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { staggerRank } from "#lib/config/motion.ts";
    import { excerpt } from "#lib/utilities/markdown.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { reading } from "#lib/state/reading.svelte.ts";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import { wiki, type ChronologyPoint } from "#lib/state/wiki.svelte.ts";
    import { extractYear, formatUniverseDate } from "#lib/utilities/date.ts";

    /** One heading of the chronology, and the dates standing under it. */
    interface Period {
        heading: string;
        /** The span of years nothing was recorded in just before this period, when there is one. */
        gapBefore: string | null;
        /** Short name of the period in the row of jumps: the year it opens on. */
        label: string;
        points: ChronologyPoint[];
    }

    /** Number of periods from which the row of jumps is offered. */
    const JUMP_THRESHOLD = 3;

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
            .map( ( { start, points }, index, sorted ) =>
            {
                const isUndated = start === UNDATED_START;
                const heading = isUndated
                    ? m.timeline_undated_group()
                    : m.timeline_period( { start, end: start + width - 1 } );
                const label = isUndated ? heading : String( start );
                const previousEnd = index > 0 ? sorted[ index - 1 ].start + width : start;
                const hasGap = !isUndated && start > previousEnd;
                const gapBefore = hasGap ? m.timeline_gap( { start: previousEnd, end: start - 1 } ) : null;
                return { heading, gapBefore, label, points };
            } );
    } );

    /**
     * The first point of each page over the whole chronology, the only one to
     * carry its summary. A page dated a birth, a founding and a death across three
     * decades would otherwise read the same lines three times; later rows give
     * the date and its label alone.
     */
    const summarized = $derived.by( () =>
    {
        const points = periods.flatMap( ( period ) => period.points );
        const firstOfPage = new Map( points.toReversed().map( ( point ) => [ point.entry.id, point ] ) );

        return new Set<ChronologyPoint>( firstOfPage.values() );
    } );
</script>

<PageMeta
    title={m.timeline_title( { universe: wiki.meta.universe } )}
    description={m.timeline_meta_description( { universe: wiki.meta.universe } )}
/>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <div class="max-w-4xl">
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
                {#if !reading.enabled}
                    {m.timeline_undated_intro()}
                    <a href="{resolve( "dashboard/" )}#dashboard-issues" class="wiki-link">{m.timeline_undated_link()}</a>.
                {/if}
            {/snippet}
        </PageHeader>

        {#if periods.length === 0}
            <div class="mt-10">
                <EmptyState title={m.timeline_empty_title()} description={m.timeline_empty_description()}>
                    <Button href={resolve( "/entries" )} color="alternative">{m.common_browse_wiki()}</Button>
                </EmptyState>
            </div>
        {:else}
            {#if periods.length >= JUMP_THRESHOLD}
                <nav class="mt-6 -ms-2 flex flex-wrap" aria-label={m.timeline_jump_aria()}>
                    {#each periods as period, periodIndex ( period.heading )}
                        <a
                            href="#timeline-period-{periodIndex}"
                            class="wiki-link inline-flex items-center px-2 text-sm font-medium tabular-nums {TOUCH_HEIGHT}"
                        >
                            {period.label}
                        </a>
                    {/each}
                </nav>
            {/if}

            <div class="mt-12 space-y-12">
                {#each periods as period, periodIndex ( period.heading )}
                    {#if period.gapBefore}
                        <p class="text-muted border-paper-300 dark:border-ink-700 border-l border-dashed py-2 pl-4 text-sm">
                            {period.gapBefore}
                        </p>
                    {/if}

                    <section aria-labelledby="timeline-period-{periodIndex}">
                        <h2 id="timeline-period-{periodIndex}" class="section-heading scroll-mt-24">{period.heading}</h2>

                        <ol class="border-paper-200 dark:border-ink-700 mt-4 border-l sm:border-l-0">
                            {#each period.points as point, index ( `${ point.entry.id }-${ point.date.id }` )}
                                <li
                                    class="rise-in relative grid pl-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:pl-0"
                                    style="--rank: {staggerRank( index )}"
                                >
                                    <p
                                        class="text-muted border-paper-200 dark:border-ink-700 pt-3 text-sm sm:border-r sm:pt-4 sm:pr-5 sm:pb-4 sm:text-right"
                                    >
                                        {formatUniverseDate( point.date.value )}
                                    </p>

                                    <div class="min-w-0 pt-1 pb-3 sm:py-4 sm:pl-5">
                                        <p class="leading-snug break-words">
                                            <a href={resolve( `entries/${ point.entry.slug }/` )} class="row-link stretched-link font-medium">
                                                {point.entry.title}
                                            </a>
                                            {#if point.date.label}
                                                <span class="text-muted text-sm">· {point.date.label}</span>
                                            {/if}
                                        </p>

                                        {#if summarized.has( point )}
                                            <p class="text-ink-600 dark:text-paper-300 mt-1 max-w-help text-sm leading-relaxed">
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
</div>
