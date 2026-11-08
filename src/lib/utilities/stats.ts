/**
 * Statistics of the encyclopedia, for the dashboard.
 *
 * Everything is derived from the merged dataset and the link graph, so the
 * dashboard reflects local changes as soon as they are made.
 *
 * @author Claude
 */

import { localDayKey } from "./date";
import { countWords } from "./markdown";
import * as m from "#lib/locales/messages.js";
import { getLocale } from "#lib/locales/runtime.js";
import type { Category, Entry, LiveEntry } from "#lib/types.ts";

export interface CountByKey {
    key: string;
    label: string;
    /** Every page counted, drafts included. */
    count: number;
    /** How many of those pages are still drafts. */
    drafts: number;
}

export interface LinkedEntry {
    entry: Entry;
    incoming: number;
}

export interface ActivityPoint {
    /** Month as `YYYY-MM`. */
    month: string;
    label: string;
    count: number;
}

/**
 * A page that still lacks something, with every gap it has. Gathered by page
 * rather than by gap: grouped by gap, the least finished page came back under
 * each heading, six times over for a stub.
 */
export interface QualityIssue {
    entry: Entry;
    reasons: string[];
}

export interface WikiStats {
    total: number;
    published: number;
    drafts: number;
    categories: number;
    liveItems: number;
    words: number;
    averageWords: number;
    byCategory: CountByKey[];
    /** Pages no other page links to. */
    orphans: Entry[];
    /** Pages that link to nothing. */
    deadEnds: Entry[];
    /** Slugs linked to but not written yet. */
    missing: { slug: string; count: number }[];
    mostLinked: LinkedEntry[];
    activity: ActivityPoint[];
    /** Pages with a gap in their structure, the most gaps first; length counts only beside another gap. */
    issues: QualityIssue[];
    /** Pages whose only gap is their length, counted rather than listed. */
    shortOnly: number;
}

export interface StatsInput {
    entries: readonly Entry[];
    categories: readonly Category[];
    live: readonly LiveEntry[];
    incomingLinks: ReadonlyMap<string, Entry[]>;
    outgoingLinks: ReadonlyMap<string, string[]>;
    missingLinks: readonly { slug: string; from: Entry[] }[];
}

/** Word count under which a page reads as a stub, also named by the dashboard where it lists the stubs. */
export const SHORT_PAGE_WORDS = 50;

/** Number of months shown by the activity chart. */
const ACTIVITY_MONTHS = 12;

/**
 * Builds the month formatter for the activity chart, following the current locale.
 *
 * Built fresh on every call rather than cached at module scope, since the locale can
 * change at runtime through the settings page switcher, and a formatter cached at
 * import time would stay frozen to whichever locale was active on the first load.
 *
 * @returns A formatter for a short month name, e.g. `janv.` or `Jan`.
 * @author Claude
 */
const monthLabelFormatter = (): Intl.DateTimeFormat => new Intl.DateTimeFormat( getLocale(), { month: "short" } );

/**
 * Builds the activity of the last months, from the edition dates.
 *
 * @param entries Pages to look at.
 * @param now Reference date, defaults to the current one.
 * @returns One point per month, oldest first.
 * @author Claude
 */
const buildActivity = ( entries: readonly Entry[], now: Date ): ActivityPoint[] =>
{
    const counts = new Map<string, number>();

    for ( const entry of entries )
    {
        const month = localDayKey( entry.updatedAt ).slice( 0, 7 );
        counts.set( month, ( counts.get( month ) ?? 0 ) + 1 );
    }

    const points: ActivityPoint[] = [];
    const monthLabel = monthLabelFormatter();

    for ( let offset = ACTIVITY_MONTHS - 1; offset >= 0; offset -= 1 )
    {
        const date = new Date( now.getFullYear(), now.getMonth() - offset, 1 );
        const month = `${ date.getFullYear() }-${ String( date.getMonth() + 1 ).padStart( 2, "0" ) }`;

        points.push( {
            month,
            label: monthLabel.format( date ),
            count: counts.get( month ) ?? 0
        } );
    }

    return points;
};

/**
 * Computes every figure shown on the dashboard.
 *
 * A page lands among the points of attention for a gap in its structure: no
 * summary, no category, no date, no link out or none in. Its length counts only
 * beside one of those; a page lacking nothing but length is counted apart, so a
 * young wiki of short pages does not read as a list of failures.
 *
 * @param input Merged dataset and link graph.
 * @param now Reference date, injected so the activity chart stays testable.
 * @returns The statistics.
 * @author Claude
 */
export const computeStats = ( input: StatsInput, now: Date = new Date() ): WikiStats =>
{
    const { entries, categories, live, incomingLinks, outgoingLinks, missingLinks } = input;

    const published = entries.filter( ( entry ) => entry.status === "publie" );

    const wordsByEntry = new Map<Entry, number>();
    const countsByCategory = new Map<string, number>();
    const draftsByCategory = new Map<string, number>();
    let words = 0;

    for ( const entry of entries )
    {
        const entryWords = countWords( entry.body );
        wordsByEntry.set( entry, entryWords );
        words += entryWords;

        const isDraft = entry.status !== "publie";

        for ( const category of entry.categories )
        {
            countsByCategory.set( category, ( countsByCategory.get( category ) ?? 0 ) + 1 );

            if ( isDraft )
            {
                draftsByCategory.set( category, ( draftsByCategory.get( category ) ?? 0 ) + 1 );
            }
        }
    }

    const byCategory: CountByKey[] = categories
        .map( ( category ) => ( {
            key: category.slug,
            label: category.name,
            count: countsByCategory.get( category.slug ) ?? 0,
            drafts: draftsByCategory.get( category.slug ) ?? 0
        } ) )
        .sort( ( a, b ) => b.count - a.count );

    const orphans = entries.filter( ( entry ) => ( incomingLinks.get( entry.slug )?.length ?? 0 ) === 0 );
    const deadEnds = entries.filter( ( entry ) => ( outgoingLinks.get( entry.slug )?.length ?? 0 ) === 0 );

    const mostLinked: LinkedEntry[] = entries
        .map( ( entry ) => ( { entry, incoming: incomingLinks.get( entry.slug )?.length ?? 0 } ) )
        .filter( ( item ) => item.incoming > 0 )
        .sort( ( a, b ) => b.incoming - a.incoming || a.entry.title.localeCompare( b.entry.title, getLocale() ) )
        .slice( 0, 6 );

    const orphanSet = new Set( orphans );
    const deadEndSet = new Set( deadEnds );

    let shortOnly = 0;

    const issues: QualityIssue[] = entries
        .map( ( entry ) =>
        {
            const checks: [ boolean, () => string ][] = [
                [ entry.summary.trim() === "", m.stats_issue_no_summary ],
                [ entry.categories.length === 0, m.stats_issue_no_category ],
                [ entry.dates.length === 0, m.stats_issue_no_reference_date ],
                [ deadEndSet.has( entry ), m.stats_issue_no_outgoing_link ],
                [ orphanSet.has( entry ), m.stats_issue_orphan ]
            ];
            const structural = checks.filter( ( [ failing ] ) => failing ).map( ( [ , label ] ) => label() );
            const isShort = ( wordsByEntry.get( entry ) ?? 0 ) < SHORT_PAGE_WORDS;

            if ( structural.length === 0 && isShort )
            {
                shortOnly += 1;
            }

            const reasons = isShort && structural.length > 0 ? [ ...structural, m.stats_issue_too_short() ] : structural;

            return { entry, reasons, gaps: structural.length };
        } )
        .filter( ( issue ) => issue.gaps > 0 )
        .sort( ( a, b ) =>
        {
            const byGaps = b.gaps - a.gaps;
            const byReasons = b.reasons.length - a.reasons.length;

            return byGaps || byReasons || a.entry.title.localeCompare( b.entry.title, getLocale() );
        } )
        .map( ( { entry, reasons } ) => ( { entry, reasons } ) );

    return {
        total: entries.length,
        published: published.length,
        drafts: entries.length - published.length,
        categories: categories.length,
        liveItems: live.length,
        words,
        averageWords: entries.length > 0 ? Math.round( words / entries.length ) : 0,
        byCategory,
        orphans,
        deadEnds,
        missing: missingLinks.map( ( link ) => ( { slug: link.slug, count: link.from.length } ) ),
        mostLinked,
        activity: buildActivity( entries, now ),
        issues,
        shortOnly
    };
};
