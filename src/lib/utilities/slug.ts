/**
 * Slug and text normalisation helpers.
 *
 * @author Claude
 */

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
