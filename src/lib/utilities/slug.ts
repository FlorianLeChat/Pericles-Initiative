/**
 * Slug and text normalisation helpers.
 *
 * @author Claude
 */

import { getLocale } from "#lib/locales/runtime.js";

/** Nonspacing marks, which is what accents become once a string is NFD decomposed. */
const COMBINING_MARKS = /\p{Mn}/gu;

/** Apostrophes are dropped rather than turned into dashes, so `l'Initiative` gives `linitiative`. */
const APOSTROPHES = /['’]/g;

/** Everything a slug cannot hold, collapsed into a single dash. */
const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g;

/** Longest slug we are willing to put in a url. */
const SLUG_LENGTH = 80;

/**
 * Removes the leading and trailing dashes of an already normalised slug.
 *
 * Written as two scans rather than as `/^-+|-+$/g`: a run of dashes makes that
 * pattern backtrack quadratically, which SonarQube reports as a super linear
 * regular expression, and the loops are linear as well as easier to read.
 *
 * @param value Slug made only of lowercase letters, digits and dashes.
 * @returns The same slug without its outer dashes.
 * @author Claude
 */
const trimDashes = ( value: string ): string =>
{
    let start = 0;
    let end = value.length;

    while ( start < end && value[ start ] === "-" )
    {
        start += 1;
    }

    while ( end > start && value[ end - 1 ] === "-" )
    {
        end -= 1;
    }

    return value.slice( start, end );
};

/**
 * Removes diacritics and lowercases a string, for slugs and search matching.
 *
 * @param value Any human readable text.
 * @returns The lowercased, accent free equivalent.
 * @author Claude
 */
export const deburr = ( value: string ): string => value.normalize( "NFD" ).replaceAll( COMBINING_MARKS, "" ).toLowerCase();

/**
 * Converts a title into a url safe slug.
 *
 * @param value Title or free text.
 * @returns A lowercase, dash separated slug, never empty.
 * @author Claude
 */
export const slugify = ( value: string ): string =>
{
    const dashed = deburr( value ).replaceAll( APOSTROPHES, "" ).replaceAll( NON_SLUG_CHARACTERS, "-" );
    const truncated = trimDashes( dashed ).slice( 0, SLUG_LENGTH );
    const slug = trimDashes( truncated );

    return slug || "sans-titre";
};

/**
 * Builds a slug that does not collide with the ones already in use.
 *
 * @param value Title or existing slug to normalise.
 * @param taken Slugs already assigned.
 * @returns The slug, suffixed with `-2`, `-3` and so on when needed.
 * @author Claude
 */
export const uniqueSlug = ( value: string, taken: Iterable<string> ): string =>
{
    const base = slugify( value );
    const used = new Set( taken );

    if ( !used.has( base ) )
    {
        return base;
    }

    let counter = 2;
    while ( used.has( `${ base }-${ counter }` ) )
    {
        counter += 1;
    }

    return `${ base }-${ counter }`;
};

/**
 * Turns a slug back into a readable title, for a page that does not exist yet.
 *
 * Only the dashes and the first letter are restored: accents and apostrophes
 * were dropped by `slugify` and cannot be guessed back.
 *
 * @param slug Slug of the missing page.
 * @returns The slug with spaces for dashes and an upper case first letter.
 * @author Claude
 */
export const humanizeSlug = ( slug: string ): string =>
{
    const spaced = slug.replaceAll( "-", " " );

    return spaced.charAt( 0 ).toUpperCase() + spaced.slice( 1 );
};

/** A leading article, French or English, followed by the rest of a title: `The `, `Les `, `L'`. */
const LEADING_ARTICLE = /^(?:the|an?|les?|la|une?|des)\s+(?=\S)|^l['’]\s*(?=\S)/iu;

/**
 * Gives the form a title is filed under, without its leading article, the way a
 * library catalogue files «The Long Night» under L. The title itself is always
 * shown as written; only its place in an alphabetical list moves.
 *
 * @param title Title of a page.
 * @returns The title stripped of one leading article, or as given when it has none.
 * @author Claude
 */
export const filingTitle = ( title: string ): string => title.trim().replace( LEADING_ARTICLE, "" );

/**
 * Compares two titles in the order of an alphabetical index: by their filing
 * form, in the reader's language, then by the full title so that «La Marée» and
 * «Marée» keep a stable order.
 *
 * @param left First title.
 * @param right Second title.
 * @returns A negative number when `left` files first, positive when `right` does.
 * @author Claude
 */
export const compareTitles = ( left: string, right: string ): number =>
{
    const collator = new Intl.Collator( getLocale() );
    return collator.compare( filingTitle( left ), filingTitle( right ) ) || collator.compare( left, right );
};
