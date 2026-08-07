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

/** Weight of a match, by field. */
const WEIGHTS = {
    exactTitle: 120,
    titleStart: 70,
    title: 45,
    alias: 35,
    summary: 18,
    category: 10,
    type: 8,
    body: 5
};

/**
 * Splits a query into normalised terms.
 *
 * @param query Raw user input.
 * @returns Accent free lowercase terms.
 * @author Claude
 */
const terms = ( query: string ): string[] => deburr( query ).split( /\s+/ ).filter( Boolean );

/**
 * Scores a page against a single search term.
 *
 * @param entry Page to score.
 * @param term Normalised search term.
 * @param body Pre-computed plain text body.
 * @returns The score, zero when the term appears nowhere.
 * @author Claude
 */
const scoreTerm = ( entry: Entry, term: string, body: string ): number =>
{
    const title = deburr( entry.title );
    let score = 0;

    if ( title === term )
    {
        score += WEIGHTS.exactTitle;
    }
    else if ( title.startsWith( term ) )
    {
        score += WEIGHTS.titleStart;
    }
    else if ( title.includes( term ) )
    {
        score += WEIGHTS.title;
    }

    if ( entry.aliases.some( ( alias ) => deburr( alias ).includes( term ) ) )
    {
        score += WEIGHTS.alias;
    }
    if ( deburr( entry.summary ).includes( term ) )
    {
        score += WEIGHTS.summary;
    }
    if ( entry.categories.some( ( category ) => deburr( category ).includes( term ) ) )
    {
        score += WEIGHTS.category;
    }
    if ( deburr( entry.type ).includes( term ) )
    {
        score += WEIGHTS.type;
    }
    if ( body.includes( term ) )
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
        const body = deburr( markdownToPlainText( entry.body ) );
        let total = 0;
        let matchedAll = true;

        for ( const term of searched )
        {
            const score = scoreTerm( entry, term, body );
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

    return hits.sort( ( a, b ) => b.score - a.score || a.entry.title.localeCompare( b.entry.title, "fr" ) ).slice( 0, limit );
};
