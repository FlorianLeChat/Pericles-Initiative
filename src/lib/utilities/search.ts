/**
 * In memory search over the pages.
 *
 * The dataset holds a few hundred pages at most, so a scored linear scan is
 * both fast enough and far simpler than an index.
 *
 * @author Claude
 */

import type { Entry } from "#lib/types.ts";
import { deburr, humanizeSlug } from "./slug";
import { internalSlug, markdownToPassage, markdownToPlainText } from "./markdown";

/**
 * The field a hit is shown for, strongest first.
 *
 * A reader looking a page up at the table needs to see why it came up: a title
 * explains itself, but a hit found through another name, a category or a line
 * of the body would otherwise read as noise.
 */
export type SearchReason = "title" | "alias" | "summary" | "category" | "body";

export interface SearchHit {
    entry: Entry;
    score: number;
    /** The field that explains the hit best, see `explain`. */
    reason: SearchReason;
    /** The other name that matched, when `reason` is `alias`. */
    alias?: string;
}

/** A run of text, and whether it is part of a term of the query. */
export interface TextSegment {
    text: string;
    match: boolean;
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

/** Characters an excerpt keeps on each side of the first matched term. */
const EXCERPT_RADIUS = 50;

/** A blank line, which is what separates two paragraphs of a Markdown body. */
const PARAGRAPH_BREAK = /\n\s*\n/;

/** A Markdown link, capturing its label and its address. */
const MARKDOWN_LINK = /\[([^\][]*)]\(([^()\s]*)\)/g;

/** Fields in the order a hit prefers to be explained by. */
const REASONS: readonly SearchReason[] = [ "title", "alias", "summary", "category", "body" ];

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
 * Tells the field that explains a hit best, and the other name it matched.
 *
 * That is the field covering the most terms of the query, the stronger one on
 * a tie: «la vance» finds a page through its other name «La Vance», which holds
 * both terms, rather than through the «Vance» of its title, which holds one.
 *
 * @param entry The page.
 * @param view Its accent free view.
 * @param searched Normalised terms of the query, every one of which matched.
 * @returns The reason, with the matched alias when that is the reason.
 * @author Claude
 */
const explain = ( entry: Entry, view: SearchableEntry, searched: string[] ): Pick<SearchHit, "reason" | "alias"> =>
{
    const covered = ( matches: ( term: string ) => boolean ): number => searched.filter( matches ).length;
    const coverage: Record<SearchReason, number> = {
        title: covered( ( term ) => view.title.includes( term ) ),
        alias: covered( ( term ) => view.aliases.some( ( alias ) => alias.includes( term ) ) ),
        summary: covered( ( term ) => view.summary.includes( term ) ),
        category: covered( ( term ) => view.categories.some( ( category ) => category.includes( term ) ) ),
        body: covered( ( term ) => view.body.includes( term ) )
    };
    const reason = REASONS.reduce( ( best, candidate ) => ( coverage[ candidate ] > coverage[ best ] ? candidate : best ) );

    if ( reason !== "alias" )
    {
        return { reason };
    }

    const index = view.aliases.findIndex( ( alias ) => searched.some( ( term ) => alias.includes( term ) ) );

    return { reason, alias: entry.aliases[ index ] };
};

/**
 * Splits a text into the runs a query matches and the runs it does not.
 *
 * The terms are found in the accent free form of the text and marked on the
 * text itself, which only lines up while folding kept every character in place.
 * A text where it did not, a ligature or a letter whose lower case is longer,
 * comes back whole and unmarked rather than marked at the wrong place.
 *
 * @param text Text to mark, as the reader sees it.
 * @param query Raw user input.
 * @returns The runs, in order, together spelling the text.
 * @author Claude
 */
export const markTerms = ( text: string, query: string ): TextSegment[] =>
{
    const folded = deburr( text );
    const searched = terms( query );

    if ( folded.length !== text.length || searched.length === 0 )
    {
        return [ { text, match: false } ];
    }

    const marked = Array.from( { length: text.length }, () => false );

    for ( const term of searched )
    {
        let at = folded.indexOf( term );

        while ( at >= 0 )
        {
            marked.fill( true, at, at + term.length );
            at = folded.indexOf( term, at + term.length );
        }
    }

    const segments: TextSegment[] = [];

    for ( let index = 0; index < text.length; index += 1 )
    {
        const last = segments.at( -1 );

        if ( last && last.match === marked[ index ] )
        {
            last.text += text[ index ];
        }
        else
        {
            segments.push( { text: text[ index ], match: marked[ index ] } );
        }
    }

    return segments;
};

/**
 * Cuts a passage of a text around a position, between two words rather than
 * through one, unless the word around it is longer than the whole passage.
 *
 * @param text Plain text, whitespace collapsed.
 * @param first Index the passage is centred on, a little after its start.
 * @returns The passage, with an ellipsis on each side that was cut.
 */
const cutAround = ( text: string, first: number ): string =>
{
    const roughStart = Math.max( 0, first - EXCERPT_RADIUS );
    const roughEnd = Math.min( text.length, first + EXCERPT_RADIUS * 2 );
    const nextSpace = text.indexOf( " ", roughStart );
    const lastSpace = text.lastIndexOf( " ", roughEnd );
    const start = roughStart > 0 && nextSpace >= 0 && nextSpace < first ? nextSpace + 1 : roughStart;
    const end = roughEnd < text.length && lastSpace > first ? lastSpace : roughEnd;
    const before = start > 0 ? "…" : "";
    const after = end < text.length ? "…" : "";

    return `${ before }${ text.slice( start, end ).trim() }${ after }`;
};

/**
 * Cuts the passage of a page's body where a query first matches.
 *
 * The passage is cut between two words rather than through one, unless the
 * word around the term is longer than the whole passage, and reads the body
 * with its section titles set apart by a middle dot.
 *
 * @param entry The page.
 * @param query Raw user input.
 * @returns A short passage around the first matched term, with an ellipsis on
 *          each side that was cut, or an empty string when the body has none.
 * @author Claude
 */
export const bodyExcerpt = ( entry: Entry, query: string ): string =>
{
    const text = markdownToPassage( entry.body ).replaceAll( WHITESPACE, " " ).trim();
    const folded = deburr( text );
    const positions = terms( query ).map( ( term ) => folded.indexOf( term ) ).filter( ( at ) => at >= 0 );

    if ( positions.length === 0 )
    {
        return "";
    }

    return cutAround( text, Math.min( ...positions ) );
};

/**
 * Cuts the passage of a page where it links to a slug, so a red link page can
 * show the sentence that waits for it rather than the bare title citing it.
 *
 * Reads the body paragraph by paragraph, then the infobox values, and keeps the
 * first one holding a link to that slug, read as a reader is shown it, with its
 * section titles set apart, and cut around the label of the link.
 *
 * @param entry The page citing the slug.
 * @param slug The slug cited.
 * @returns A short passage around the first link to the slug, with an ellipsis
 *          on each side that was cut, or an empty string when none is found.
 * @author Claude
 */
export const citingExcerpt = ( entry: Entry, slug: string ): string =>
{
    const sources = [ ...entry.body.split( PARAGRAPH_BREAK ), ...entry.infobox.map( ( field ) => field.value ) ];

    for ( const source of sources )
    {
        const link = [ ...source.matchAll( MARKDOWN_LINK ) ].find( ( match ) => internalSlug( match[ 2 ] ) === slug );

        if ( link )
        {
            const text = markdownToPassage( source ).replaceAll( WHITESPACE, " " ).trim();
            const at = deburr( text ).indexOf( deburr( link[ 1 ] ) );

            return cutAround( text, Math.max( at, 0 ) );
        }
    }

    return "";
};

/**
 * Searches the pages, requiring every term to match somewhere.
 *
 * @param entries Pages to search.
 * @param query Raw user input.
 * @param limit Maximum number of hits, defaults to 20, `Infinity` for all of them.
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
            hits.push( { entry, score: total, ...explain( entry, view, searched ) } );
        }
    }

    return hits
        .toSorted( ( a, b ) => b.score - a.score || a.entry.title.localeCompare( b.entry.title, "fr" ) )
        .slice( 0, limit );
};

/**
 * Finds the pages still to write whose address a query names.
 *
 * A red link has no page to score, only the address the links point at, so a
 * term matches when the title read back from that address contains it. Every
 * term has to match, as with `searchEntries`, and the order of `missing` is
 * kept, which the store already sorts by the number of pages waiting.
 *
 * @param missing Pages linked to but not written, as the store lists them.
 * @param query Raw user input.
 * @param limit Maximum number of pages returned.
 * @returns The matching items of `missing`, in their own order.
 * @author Claude
 */
export const searchMissing = <Missing extends { slug: string }>(
    missing: readonly Missing[],
    query: string,
    limit: number
): Missing[] =>
{
    const searched = terms( query );

    if ( searched.length === 0 )
    {
        return [];
    }

    const matches = ( item: Missing ): boolean =>
    {
        const title = deburr( humanizeSlug( item.slug ) );

        return searched.every( ( term ) => title.includes( term ) );
    };

    return missing.filter( matches ).slice( 0, limit );
};
