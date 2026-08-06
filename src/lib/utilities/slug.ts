/**
 * Slug and text normalisation helpers.
 *
 * @author Claude
 */

/** Nonspacing marks, which is what accents become once a string is NFD decomposed. */
const COMBINING_MARKS = /\p{Mn}/gu;

/** Apostrophes are dropped rather than turned into dashes, so `l'Initiative` gives `linitiative`. */
const APOSTROPHES = /['’]/g;

/**
 * Removes diacritics and lowercases a string, for slugs and search matching.
 *
 * @param value Any human readable text.
 * @returns The lowercased, accent free equivalent.
 * @author Claude
 */
export const deburr = ( value: string ): string => value.normalize( "NFD" ).replace( COMBINING_MARKS, "" ).toLowerCase();

/**
 * Converts a title into a url safe slug.
 *
 * @param value Title or free text.
 * @returns A lowercase, dash separated slug, never empty.
 * @author Claude
 */
export const slugify = ( value: string ): string =>
{
    const slug = deburr( value )
        .replace( APOSTROPHES, "" )
        .replace( /[^a-z0-9]+/g, "-" )
        .replace( /^-+/, "" )
        .slice( 0, 80 )
        .replace( /-+$/, "" );

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
