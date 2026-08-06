/**
 * Statistics of the encyclopedia, for the dashboard.
 *
 * Everything is derived from the merged dataset and the link graph, so the
 * dashboard reflects local changes as soon as they are made.
 *
 * @author Claude
 */

import { ENTRY_TYPES } from "$lib/config/entry-types";
import type { Category, Entry, EntryType, LiveEntry } from "$lib/types";
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
    byType: CountByKey[];
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

const MONTH_LABEL = new Intl.DateTimeFormat( "fr-FR", { month: "short" } );

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
    const points: ActivityPoint[] = [];

    for ( let offset = ACTIVITY_MONTHS - 1; offset >= 0; offset -= 1 )
    {
        const date = new Date( now.getFullYear(), now.getMonth() - offset, 1 );
        const month = `${ date.getFullYear() }-${ String( date.getMonth() + 1 ).padStart( 2, "0" ) }`;

        points.push( {
            month,
            label: MONTH_LABEL.format( date ),
            count: entries.filter( ( entry ) => entry.updatedAt.startsWith( month ) ).length
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
    const words = entries.reduce( ( total, entry ) => total + countWords( entry.body ), 0 );

    const byType: CountByKey[] = ENTRY_TYPES.map( ( config ) => ( {
        key: config.id,
        label: config.plural,
        count: entries.filter( ( entry ) => entry.type === ( config.id as EntryType ) ).length
    } ) ).sort( ( a, b ) => b.count - a.count );

    const byCategory: CountByKey[] = categories
        .map( ( category ) => ( {
            key: category.slug,
            label: category.name,
            count: entries.filter( ( entry ) => entry.categories.includes( category.slug ) ).length
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
            label: "Sans résumé",
            entries: entries.filter( ( entry ) => entry.summary.trim() === "" )
        },
        {
            key: "sans-categorie",
            label: "Sans catégorie",
            entries: entries.filter( ( entry ) => entry.categories.length === 0 )
        },
        {
            key: "sans-lien",
            label: "Sans lien sortant",
            entries: deadEnds
        },
        {
            key: "orphelines",
            label: "Orphelines, aucune page ne les cite",
            entries: orphans
        },
        {
            key: "trop-courtes",
            label: "Moins de 50 mots",
            entries: entries.filter( ( entry ) => countWords( entry.body ) < 50 )
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
        byType,
        byCategory,
        orphans,
        deadEnds,
        missing: missingLinks.map( ( link ) => ( { slug: link.slug, count: link.from.length } ) ),
        mostLinked,
        activity: buildActivity( entries, now ),
        issues
    };
};
