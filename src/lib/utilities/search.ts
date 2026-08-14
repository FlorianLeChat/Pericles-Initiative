/**
 * In memory search over the pages.
 *
 * The dataset holds a few hundred pages at most, so a scored linear scan is
 * both fast enough and far simpler than an index.
 *
 * @author Claude
 */

import type { Entry } from "$lib/types";
import { markdownToPlainText } from "./markdown";
import { deburr } from "./slug";

export interface SearchHit {
    entry: Entry;
    score: number;
}

/** Runs of whitespace, which is what separates two terms of a query. */
const WHITESPACE = /\s+/g;

/** Weight of a match, by field. */
const WEIGHTS = {
    exactTitle: 120,
    titleStart: 70,
    title: 45,
    alias: 35,
    summary: 18,
    category: 10,
    body: 5
};

/** The accent free view of a page, which is what actually gets matched. */
interface SearchableEntry {
    title: string;
    aliases: string[];
    summary: string;
    categories: string[];
    body: string;
}

/**
 * Accent free views, keyed by the page they describe.
 *
 * Held weakly and keyed by identity: an edited page is a new object, so its
 * stale view is collected instead of having to be invalidated.
 */
const searchable = new WeakMap<Entry, SearchableEntry>();

/**
 * Builds, and then reuses, the accent free view of a page.
 *
 * Every field used to be deburred again for each term of each query, and the
 * body was converted from Markdown on every keystroke. It is computed once per
 * page here instead.
 *
 * @param entry Page to normalise.
 * @returns Its lowercase, accent free fields.
 * @author Claude
 */
const toSearchable = ( entry: Entry ): SearchableEntry =>
{
    const cached = searchable.get( entry );
    if ( cached )
    {
        return cached;
    }

    const view: SearchableEntry = {
        title: deburr( entry.title ),
        aliases: entry.aliases.map( deburr ),
        summary: deburr( entry.summary ),
        categories: entry.categories.map( deburr ),
        body: deburr( markdownToPlainText( entry.body ) )
    };

    searchable.set( entry, view );

    return view;
};

/**
 * Splits a query into normalised terms.
 *
 * @param query Raw user input.
 * @returns Accent free lowercase terms.
 * @author Claude
 */
const terms = ( query: string ): string[] => deburr( query ).split( WHITESPACE ).filter( Boolean );

/**
 * Scores a page against a single search term.
 *
 * @param entry Accent free view of the page.
 * @param term Normalised search term.
 * @returns The score, zero when the term appears nowhere.
 * @author Claude
 */
const scoreTerm = ( entry: SearchableEntry, term: string ): number =>
{
    let score = 0;

    if ( entry.title === term )
    {
        score += WEIGHTS.exactTitle;
    }
    else if ( entry.title.startsWith( term ) )
    {
        score += WEIGHTS.titleStart;
    }
    else if ( entry.title.includes( term ) )
    {
        score += WEIGHTS.title;
    }

    if ( entry.aliases.some( ( alias ) => alias.includes( term ) ) )
    {
        score += WEIGHTS.alias;
    }
    if ( entry.summary.includes( term ) )
    {
        score += WEIGHTS.summary;
    }
    if ( entry.categories.some( ( category ) => category.includes( term ) ) )
    {
        score += WEIGHTS.category;
    }
    if ( entry.body.includes( term ) )
    {
        score += WEIGHTS.body;
    }

    return score;
};

/**
 * Searches the pages, requiring every term to match somewhere.
 *
 * @param entries Pages to search.
 * @param query Raw user input.
 * @param limit Maximum number of hits, defaults to 20.
 * @returns Hits sorted by descending score, then by title.
 * @author Claude
 */
export const searchEntries = ( entries: readonly Entry[], query: string, limit = 20 ): SearchHit[] =>
{
    const searched = terms( query );
    if ( searched.length === 0 )
    {
        return [];
    }

    const hits: SearchHit[] = [];

    for ( const entry of entries )
    {
        const view = toSearchable( entry );
        let total = 0;
        let matchedAll = true;

        for ( const term of searched )
        {
            const score = scoreTerm( view, term );
            if ( score === 0 )
            {
                matchedAll = false;
                break;
            }
            total += score;
        }

        if ( matchedAll )
        {
            hits.push( { entry, score: total } );
        }
    }

    return hits
        .toSorted( ( a, b ) => b.score - a.score || a.entry.title.localeCompare( b.entry.title, "fr" ) )
        .slice( 0, limit );
};
