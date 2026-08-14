/**
 * Markdown rendering pipeline.
 *
 * Article bodies are stored as Markdown and rendered here with `marked`, which
 * runs both in Node during prerendering and in the browser after hydration.
 * Milkdown is only used to author that Markdown, never to display it.
 *
 * Internal links use the plain Markdown syntax `[Label](/wiki/slug)`, which
 * lets the editor round trip them without any custom syntax while still
 * giving us a link graph, backlinks and red links.
 *
 * @author Claude
 */

import { marked, type Token, type Tokens } from "marked";
import type { Heading, RenderedArticle } from "$lib/types";
import { slugify } from "./slug";
import { isSafeUrl } from "./url";

marked.use( { gfm: true, breaks: false } );

/** Matches the slug of an internal page url, ignoring any anchor or query. */
const INTERNAL_HREF = /^\/wiki\/([^#?/]+)/;

/** A link leaving the site, which is opened in a new tab. */
const EXTERNAL_HREF = /^https?:\/\//i;

/** Script and style blocks are removed with their content. */
const SCRIPT_BLOCKS = /<(script|style)\b[\s\S]*?<\/\1\s*>/gi;

/** Tags that never make sense inside an article and could be abused. */
const FORBIDDEN_TAGS
    = /<\/?\s*(script|style|iframe|object|embed|form|input|textarea|select|button|link|meta|base)\b[^>]*>/gi;

/** Inline event handlers such as `onclick="..."`. */
const EVENT_ATTRIBUTES = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Attributes carrying a url, quoted or not, whose scheme has to be judged. */
const URL_ATTRIBUTES = /\s(href|src|formaction|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Opening tags of the headings that feed the table of contents. */
const HEADING_TAGS = /<(h[2-4])>/g;

/**
 * A whole rendered table, from its opening tag to its closing one.
 *
 * Lazy, so two tables in a row are matched separately rather than as one run.
 * A table nested inside another would defeat that, which Markdown has no syntax
 * for and `sanitizeHtml` gives no way to author by hand.
 */
const TABLE_BLOCKS = /<table\b[\s\S]*?<\/table>/gi;

/**
 * Opening tags of links, captured with their attributes.
 *
 * A single `\s` rather than `\s+`: the following `[^>]*` also matches spaces, so
 * the two quantifiers overlap and the pattern backtracks quadratically, which
 * SonarQube reports as a super linear regular expression. The leftover spaces
 * are removed by the `trim` in `decorateLinks`.
 */
const LINK_TAGS = /<a\s([^>]*)>/g;

/** A `class` attribute already present on an authored link, which ours replaces. */
const CLASS_ATTRIBUTE = /\sclass\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** The `href` of an authored link, read back from its attributes. */
const HREF_ATTRIBUTE = /href\s*=\s*"([^"]*)"/;

/** Inline Markdown markers stripped when a heading or excerpt needs plain text. */
const INLINE_MARKERS = /[*_`~]/g;

/**
 * Inline images and links, reduced to their label.
 *
 * Labels exclude `[` and targets exclude `(` so that a failed match restarts
 * past the offending bracket instead of rescanning the whole run, which is what
 * makes the naive `\[([^\]]*)\]\([^)]*\)` quadratic on a line of brackets.
 */
const MARKDOWN_IMAGE = /!\[([^\][]*)]\([^()]*\)/g;
const MARKDOWN_LINK = /\[([^\][]*)]\([^()]*\)/g;

/** Runs of whitespace, collapsed into a single space. */
const WHITESPACE = /\s+/g;

/** Any HTML tag, dropped when a body is reduced to plain text. */
const HTML_TAGS = /<[^<>]*>/g;

/**
 * Removes the quotes around an attribute value, when it has any.
 *
 * @param value Raw attribute value as captured, possibly quoted.
 * @returns The bare value.
 * @author Claude
 */
const unquote = ( value: string ): string =>
{
    const quoted = value.length >= 2 && ( value.startsWith( "\"" ) || value.startsWith( "'" ) );
    return quoted ? value.slice( 1, -1 ) : value;
};

/**
 * Removes the constructs that have no place in an article body.
 *
 * The dataset is authored by the site owner, so this is defence in depth
 * against a pasted snippet or an imported JSON file, not a hardened sanitizer.
 *
 * @param html Rendered HTML.
 * @returns The same HTML without scripts, dangerous tags or executable urls.
 * @author Claude
 */
export const sanitizeHtml = ( html: string ): string =>
    html
        .replaceAll( SCRIPT_BLOCKS, "" )
        .replaceAll( FORBIDDEN_TAGS, "" )
        .replaceAll( EVENT_ATTRIBUTES, "" )
        .replaceAll( URL_ATTRIBUTES, ( match, name: string, value: string ) =>
            isSafeUrl( unquote( value ) ) ? match : ` ${ name }="#"` );

/**
 * Upper bound of every memoisation cache.
 *
 * Large enough to hold a whole corpus, small enough that typing in the editor,
 * which produces a new body on every keystroke, cannot grow it without limit.
 */
const CACHE_LIMIT = 512;

/**
 * Memoises a pure transformation of a Markdown string.
 *
 * Parsing Markdown is by far the most expensive thing this module does, and the
 * same bodies are parsed again on every render: a listing computes an excerpt
 * per card, the dashboard counts words per page, and the search palette scans
 * every body on every keystroke. Bodies are immutable once stored, so the string
 * itself is a sound cache key.
 *
 * @param compute Transformation to memoise.
 * @returns The same transformation, backed by a bounded cache.
 * @author Claude
 */
const memoize = <T>( compute: ( markdown: string ) => T ): ( ( markdown: string ) => T ) =>
{
    const cache = new Map<string, T>();

    return ( markdown: string ): T =>
    {
        const cached = cache.get( markdown );
        if ( cached !== undefined || cache.has( markdown ) )
        {
            return cached as T;
        }

        const value = compute( markdown );

        // A Map iterates in insertion order, so its first key is the oldest one.
        if ( cache.size >= CACHE_LIMIT )
        {
            const oldest = cache.keys().next().value;
            if ( oldest !== undefined )
            {
                cache.delete( oldest );
            }
        }

        cache.set( markdown, value );

        return value;
    };
};

/**
 * Strips inline Markdown syntax to get readable plain text.
 *
 * @param markdown A single line of Markdown, typically a heading.
 * @returns The text without emphasis markers, links or images.
 * @author Claude
 */
const stripInlineMarkdown = ( markdown: string ): string =>
    markdown
        .replaceAll( MARKDOWN_IMAGE, "$1" )
        .replaceAll( MARKDOWN_LINK, "$1" )
        .replaceAll( INLINE_MARKERS, "" )
        .replaceAll( WHITESPACE, " " )
        .trim();

/**
 * Walks a Markdown token tree, visiting every nested token once.
 *
 * @param tokens Tokens to visit, may be undefined.
 * @param visit Callback invoked for each token.
 * @author Claude
 */
const walkTokens = ( tokens: Token[] | undefined, visit: ( token: Token ) => void ): void =>
{
    if ( !tokens )
    {
        return;
    }

    for ( const token of tokens )
    {
        visit( token );

        const nested = token as {
            tokens?: Token[];
            items?: Tokens.ListItem[];
            header?: Tokens.TableCell[];
            rows?: Tokens.TableCell[][];
        };

        walkTokens( nested.tokens, visit );
        walkTokens( nested.items, visit );

        for ( const cell of nested.header ?? [] )
        {
            walkTokens( cell.tokens, visit );
        }
        for ( const row of nested.rows ?? [] )
        {
            for ( const cell of row )
            {
                walkTokens( cell.tokens, visit );
            }
        }
    }
};

/** What a single lexing pass over a body yields. */
interface BodyAnalysis {
    headings: Heading[];
    links: string[];
}

/**
 * Lexes a body once and collects everything the rest of the site reads from it.
 *
 * Headings and internal links used to be gathered by two independent passes,
 * each lexing the same body again. They are collected together here so that
 * rendering an article, building the link graph and drawing the table of
 * contents all share a single parse.
 *
 * Only heading levels 2 to 4 are collected: level 1 is the page title, rendered
 * outside of the body.
 *
 * @param markdown Article body.
 * @returns The headings, with unique anchors, and the slugs linked to.
 * @author Claude
 */
const analyzeBody = memoize( ( markdown: string ): BodyAnalysis =>
{
    const headings: Heading[] = [];
    const used = new Set<string>();
    const slugs = new Set<string>();

    walkTokens( marked.lexer( markdown ), ( token ) =>
    {
        if ( token.type === "link" )
        {
            const match = INTERNAL_HREF.exec( ( token as Tokens.Link ).href );
            if ( match )
            {
                slugs.add( match[ 1 ] );
            }

            return;
        }

        if ( token.type !== "heading" )
        {
            return;
        }

        const heading = token as Tokens.Heading;
        if ( heading.depth < 2 || heading.depth > 4 )
        {
            return;
        }

        const text = stripInlineMarkdown( heading.text );
        const base = slugify( text );
        let id = base;
        let counter = 2;
        while ( used.has( id ) )
        {
            id = `${ base }-${ counter }`;
            counter += 1;
        }
        used.add( id );

        headings.push( { id, text, level: heading.depth } );
    } );

    return { headings, links: [ ...slugs ] };
} );

/**
 * Collects the headings of a Markdown body, in document order.
 *
 * @param markdown Article body.
 * @returns Headings with unique anchor identifiers.
 * @author Claude
 */
export const collectHeadings = ( markdown: string ): Heading[] => analyzeBody( markdown ).headings;

/**
 * Lists the internal pages a Markdown body links to.
 *
 * @param markdown Article body.
 * @returns Unique slugs, in order of first appearance.
 * @author Claude
 */
export const extractInternalLinks = ( markdown: string ): string[] => analyzeBody( markdown ).links;

/**
 * Adds anchor identifiers to the rendered headings.
 *
 * Headings are matched by position, which keeps the identifiers identical to
 * the ones returned by `collectHeadings` even when a heading contains
 * emphasis or a link.
 *
 * @param html Rendered HTML.
 * @param headings Headings collected from the same body.
 * @returns The HTML with `id` attributes on h2 to h4.
 * @author Claude
 */
const applyHeadingIds = ( html: string, headings: Heading[] ): string =>
{
    let index = 0;

    return html.replaceAll( HEADING_TAGS, ( match, tag: string ) =>
    {
        const heading = headings[ index ];
        index += 1;
        return heading ? `<${ tag } id="${ heading.id }">` : match;
    } );
};

/**
 * Styles the links of a rendered article.
 *
 * Internal links pointing at an existing page become regular wiki links,
 * internal links pointing nowhere become red links, and external links open
 * in a new tab.
 *
 * @param html Rendered HTML.
 * @param knownSlugs Slugs of the pages that currently exist.
 * @returns The HTML with decorated anchors.
 * @author Claude
 */
const decorateLinks = ( html: string, knownSlugs: ReadonlySet<string> ): string =>
    html.replaceAll( LINK_TAGS, ( _match, rawAttributes: string ) =>
    {
        // An authored `class` is dropped rather than kept alongside ours: a duplicate
        // attribute wins over the later one in the browser, which would let a body
        // opt out of the red link styling.
        const attributes = rawAttributes.replaceAll( CLASS_ATTRIBUTE, "" ).trim();
        const href = HREF_ATTRIBUTE.exec( attributes )?.[ 1 ] ?? "";
        const internal = INTERNAL_HREF.exec( href );

        if ( internal )
        {
            const exists = knownSlugs.has( internal[ 1 ] );
            const classes = exists ? "wiki-link" : "wiki-link-missing";
            const hint = exists ? "" : " title=\"Cette page n'existe pas encore\" data-missing=\"true\"";
            return `<a ${ attributes } class="${ classes }"${ hint }>`;
        }

        if ( EXTERNAL_HREF.test( href ) )
        {
            return `<a ${ attributes } class="wiki-link" target="_blank" rel="noopener noreferrer">`;
        }

        return `<a ${ attributes } class="wiki-link">`;
    } );

/**
 * Wraps every table in a container that can scroll sideways.
 *
 * A table holding something unbreakable, a long url or a run of code, pushes
 * past the width of a phone and takes the whole page with it, since nothing else
 * on the page can shrink to compensate. The container is what scrolls instead.
 *
 * `display: block` on the table itself would do the same with no extra element,
 * and is why it is not done: it drops the table out of the accessibility tree,
 * costing the reader the rows and columns to save them a horizontal scrollbar.
 *
 * The container is focusable and named, because a region that scrolls and cannot
 * be reached by the keyboard is unreadable without a mouse.
 *
 * @param html Rendered HTML.
 * @returns The HTML with each table wrapped.
 * @author Claude
 */
const wrapTables = ( html: string ): string =>
    html.replaceAll(
        TABLE_BLOCKS,
        ( table ) => "<div class=\"article-table\" role=\"region\" aria-label=\"Tableau\" tabindex=\"0\">" + `${ table }</div>`
    );

/**
 * Parses and sanitizes a body, without the decoration that depends on the dataset.
 *
 * Split out so the expensive half can be memoised: link decoration varies with
 * the set of existing pages, parsing does not.
 *
 * @param markdown Any Markdown.
 * @returns Sanitized HTML, links still undecorated.
 * @author Claude
 */
const renderSanitized = memoize( ( markdown: string ): string => sanitizeHtml( marked.parse( markdown ) as string ) );

/**
 * Renders an article body to display ready HTML.
 *
 * @param markdown Article body.
 * @param knownSlugs Slugs of the pages that currently exist, for red links.
 * @returns The HTML, its headings and the internal pages it links to.
 * @author Claude
 */
export const renderArticle = (
    markdown: string,
    knownSlugs: ReadonlySet<string> = new Set<string>()
): RenderedArticle =>
{
    const { headings, links } = analyzeBody( markdown );
    const rendered = renderSanitized( markdown );

    return {
        html: wrapTables( decorateLinks( applyHeadingIds( rendered, headings ), knownSlugs ) ),
        headings,
        links
    };
};

/**
 * Renders a short Markdown fragment, such as a live feed item.
 *
 * @param markdown Markdown fragment.
 * @param knownSlugs Slugs of the pages that currently exist, for red links.
 * @returns Display ready HTML.
 * @author Claude
 */
export const renderInline = ( markdown: string, knownSlugs: ReadonlySet<string> = new Set<string>() ): string =>
    decorateLinks( renderSanitized( markdown ), knownSlugs );

/**
 * Converts Markdown to plain text, for excerpts, search and word counts.
 *
 * @param markdown Any Markdown.
 * @returns The text content, whitespace collapsed.
 * @author Claude
 */
export const markdownToPlainText = memoize( ( markdown: string ): string =>
    ( marked.parse( markdown ) as string )
        .replaceAll( HTML_TAGS, " " )
        .replaceAll( "&nbsp;", " " )
        .replaceAll( "&amp;", "&" )
        .replaceAll( "&lt;", "<" )
        .replaceAll( "&gt;", ">" )
        .replaceAll( "&quot;", "\"" )
        .replaceAll( "&#39;", "'" )
        .replaceAll( WHITESPACE, " " )
        .trim()
);

/**
 * Truncates Markdown into a short excerpt, cutting on a word boundary.
 *
 * @param markdown Any Markdown.
 * @param maxLength Maximum number of characters, defaults to 180.
 * @returns The excerpt, suffixed with an ellipsis when truncated.
 * @author Claude
 */
export const excerpt = ( markdown: string, maxLength = 180 ): string =>
{
    const text = markdownToPlainText( markdown );
    if ( text.length <= maxLength )
    {
        return text;
    }

    const cut = text.slice( 0, maxLength );
    const lastSpace = cut.lastIndexOf( " " );
    return `${ cut.slice( 0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength ).trimEnd() }...`;
};

/**
 * Counts the words of a Markdown body.
 *
 * @param markdown Any Markdown.
 * @returns The number of words.
 * @author Claude
 */
export const countWords = memoize( ( markdown: string ): number =>
{
    const text = markdownToPlainText( markdown );
    return text ? text.split( WHITESPACE ).length : 0;
} );
