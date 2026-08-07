/**
 * Url safety, shared by the Markdown sanitizer and the dataset normalisation.
 *
 * Both have the same question to answer: may this url stay in the page? The
 * rule lives here so an article body and an imported infobox image are judged
 * identically, and so a new `javascript:` spelling only has to be closed once.
 *
 * @author Claude
 */

/** Numeric and named entities, which the HTML parser decodes before reading a scheme. */
const HTML_ENTITY = /&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi;

/**
 * Everything that is not printable ASCII.
 *
 * Browsers drop whitespace, control characters and stray bytes while parsing a
 * url, so `java&#9;script:` reaches them as `javascript:`. A scheme is always
 * printable ASCII, so removing the rest before judging one is safe: the value
 * is only inspected here, never rewritten from this stripped form.
 */
const SCHEME_NOISE = /[^\x21-\x7E]/g;

/** Schemes an article is allowed to navigate to or load from. */
const ALLOWED_SCHEME = /^(?:https?|mailto|tel):/;

/** Any `scheme:` prefix, used to tell an absolute url from a relative path. */
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/;

/** Named entities worth decoding: the ones that can rebuild `javascript:`. */
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
    amp: "&",
    colon: ":",
    tab: "\t",
    newline: "\n",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'"
};

/**
 * Decodes the entities a browser would resolve before reading a url scheme.
 *
 * `<a href="java&#115;cript:...">` reaches the parser as `javascript:`, so the
 * scheme has to be judged on the decoded value, not on the raw attribute.
 *
 * @param value Raw url, possibly containing entities.
 * @returns The value with numeric and known named entities resolved.
 * @author Claude
 */
export const decodeEntities = ( value: string ): string =>
    value.replace( HTML_ENTITY, ( match, entity: string ) =>
    {
        const lowered = entity.toLowerCase();

        if ( lowered.startsWith( "#x" ) )
        {
            const code = Number.parseInt( lowered.slice( 2 ), 16 );
            return Number.isNaN( code ) ? match : String.fromCodePoint( code );
        }

        if ( lowered.startsWith( "#" ) )
        {
            const code = Number( lowered.slice( 1 ) );
            return Number.isNaN( code ) ? match : String.fromCodePoint( code );
        }

        return NAMED_ENTITIES[ lowered ] ?? match;
    } );

/**
 * Tells whether a url may stay in the rendered page.
 *
 * An allow list rather than a deny list: a relative path is always fine, an
 * absolute url is only fine under one of a few harmless schemes, and everything
 * else, `javascript:` and `data:` included, is refused.
 *
 * @param value Url to judge, still encoded.
 * @returns True when the url is a relative path or an allowed scheme.
 * @author Claude
 */
export const isSafeUrl = ( value: string ): boolean =>
{
    const decoded = decodeEntities( value ).replace( SCHEME_NOISE, "" ).toLowerCase();

    if ( decoded === "" || !ANY_SCHEME.test( decoded ) )
    {
        return true;
    }

    return ALLOWED_SCHEME.test( decoded );
};
