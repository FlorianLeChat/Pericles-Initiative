/**
 * Statistics of the encyclopedia, for the dashboard.
 *
 * Everything is derived from the merged dataset and the link graph, so the
 * dashboard reflects local changes as soon as they are made.
 *
 * @author Claude
 */

import * as m from "$lib/locales/messages.js";
import { getLocale } from "$lib/locales/runtime";
import type { Category, Entry, LiveEntry } from "$lib/types";
import { countWords } from "./markdown";

export interface CountByKey {
    key: string;
    label: string;
    count: number;
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

export interface QualityIssue {
    key: string;
    label: string;
    entries: Entry[];
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
    issues: QualityIssue[];
}

export interface StatsInput {
    entries: readonly Entry[];
    categories: readonly Category[];
    live: readonly LiveEntry[];
    incomingLinks: ReadonlyMap<string, Entry[]>;
    outgoingLinks: ReadonlyMap<string, string[]>;
    missingLinks: readonly { slug: string; from: Entry[] }[];
}

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
    // Counted in one pass over the corpus rather than one pass per month.
    const counts = new Map<string, number>();

    for ( const entry of entries )
    {
        const month = entry.updatedAt.slice( 0, 7 );
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
 * @param input Merged dataset and link graph.
 * @param now Reference date, injected so the activity chart stays testable.
 * @returns The statistics.
 * @author Claude
 */
export const computeStats = ( input: StatsInput, now: Date = new Date() ): WikiStats =>
{
    const { entries, categories, live, incomingLinks, outgoingLinks, missingLinks } = input;

    const published = entries.filter( ( entry ) => entry.status === "publie" );

    // One pass over the corpus feeds the word total, the category breakdown and
    // the short page check, instead of rescanning it once per category and twice
    // per page for the word count.
    const wordsByEntry = new Map<Entry, number>();
    const countsByCategory = new Map<string, number>();
    let words = 0;

    for ( const entry of entries )
    {
        const entryWords = countWords( entry.body );
        wordsByEntry.set( entry, entryWords );
        words += entryWords;

        for ( const category of entry.categories )
        {
            countsByCategory.set( category, ( countsByCategory.get( category ) ?? 0 ) + 1 );
        }
    }

    const byCategory: CountByKey[] = categories
        .map( ( category ) => ( {
            key: category.slug,
            label: category.name,
            count: countsByCategory.get( category.slug ) ?? 0
        } ) )
        .sort( ( a, b ) => b.count - a.count );

    const orphans = entries.filter( ( entry ) => ( incomingLinks.get( entry.slug )?.length ?? 0 ) === 0 );
    const deadEnds = entries.filter( ( entry ) => ( outgoingLinks.get( entry.slug )?.length ?? 0 ) === 0 );

    const mostLinked: LinkedEntry[] = entries
        .map( ( entry ) => ( { entry, incoming: incomingLinks.get( entry.slug )?.length ?? 0 } ) )
        .filter( ( item ) => item.incoming > 0 )
        .sort( ( a, b ) => b.incoming - a.incoming || a.entry.title.localeCompare( b.entry.title, "fr" ) )
        .slice( 0, 6 );

    const issues: QualityIssue[] = [
        {
            key: "sans-resume",
            label: m.stats_issue_no_summary(),
            entries: entries.filter( ( entry ) => entry.summary.trim() === "" )
        },
        {
            key: "sans-categorie",
            label: m.stats_issue_no_category(),
            entries: entries.filter( ( entry ) => entry.categories.length === 0 )
        },
        {
            key: "sans-date",
            label: m.stats_issue_no_reference_date(),
            entries: entries.filter( ( entry ) => entry.dates.length === 0 )
        },
        {
            key: "sans-lien",
            label: m.stats_issue_no_outgoing_link(),
            entries: deadEnds
        },
        {
            key: "orphelines",
            label: m.stats_issue_orphan(),
            entries: orphans
        },
        {
            key: "trop-courtes",
            label: m.stats_issue_too_short(),
            entries: entries.filter( ( entry ) => ( wordsByEntry.get( entry ) ?? 0 ) < 50 )
        }
    ].filter( ( issue ) => issue.entries.length > 0 );

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
        issues
    };
};
