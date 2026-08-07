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

marked.use( { gfm: true, breaks: false } );

/** Matches the slug of an internal page url, ignoring any anchor or query. */
const INTERNAL_HREF = /^\/wiki\/([^#?/]+)/;

/** Script and style blocks are removed with their content. */
const SCRIPT_BLOCKS = /<(script|style)\b[\s\S]*?<\/\1\s*>/gi;

/** Tags that never make sense inside an article and could be abused. */
const FORBIDDEN_TAGS
    = /<\/?\s*(script|style|iframe|object|embed|form|input|textarea|select|button|link|meta|base)\b[^>]*>/gi;

/** Inline event handlers such as `onclick="..."`. */
const EVENT_ATTRIBUTES = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Executable urls in `href` or `src`. */
const EXECUTABLE_URLS
    = /\s(href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi;

/** Opening tags of the headings that feed the table of contents. */
const HEADING_TAGS = /<(h[2-4])>/g;

/** Opening tags of links, captured with their attributes. */
const LINK_TAGS = /<a\s+([^>]*)>/g;

/** Inline Markdown markers stripped when a heading or excerpt needs plain text. */
const INLINE_MARKERS = /[*_`~]/g;

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
        .replace( SCRIPT_BLOCKS, "" )
        .replace( FORBIDDEN_TAGS, "" )
        .replace( EVENT_ATTRIBUTES, "" )
        .replace( EXECUTABLE_URLS, " $1=\"#\"" );

/**
 * Strips inline Markdown syntax to get readable plain text.
 *
 * @param markdown A single line of Markdown, typically a heading.
 * @returns The text without emphasis markers, links or images.
 * @author Claude
 */
const stripInlineMarkdown = ( markdown: string ): string =>
    markdown
        .replace( /!\[([^\]]*)\]\([^)]*\)/g, "$1" )
        .replace( /\[([^\]]*)\]\([^)]*\)/g, "$1" )
        .replace( INLINE_MARKERS, "" )
        .replace( /\s+/g, " " )
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

/**
 * Collects the headings of a Markdown body, in document order.
 *
 * Only levels 2 to 4 are collected: level 1 is the page title, rendered
 * outside of the body.
 *
 * @param markdown Article body.
 * @returns Headings with unique anchor identifiers.
 * @author Claude
 */
export const collectHeadings = ( markdown: string ): Heading[] =>
{
    const headings: Heading[] = [];
    const used = new Set<string>();

    walkTokens( marked.lexer( markdown ), ( token ) =>
    {
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

    return headings;
};

/**
 * Lists the internal pages a Markdown body links to.
 *
 * @param markdown Article body.
 * @returns Unique slugs, in order of first appearance.
 * @author Claude
 */
export const extractInternalLinks = ( markdown: string ): string[] =>
{
    const slugs = new Set<string>();

    walkTokens( marked.lexer( markdown ), ( token ) =>
    {
        if ( token.type !== "link" )
        {
            return;
        }

        const match = ( token as Tokens.Link ).href.match( INTERNAL_HREF );
        if ( match )
        {
            slugs.add( match[ 1 ] );
        }
    } );

    return [ ...slugs ];
};

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

    return html.replace( HEADING_TAGS, ( match, tag: string ) =>
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
    html.replace( LINK_TAGS, ( _match, attributes: string ) =>
    {
        const href = attributes.match( /href\s*=\s*"([^"]*)"/ )?.[ 1 ] ?? "";
        const internal = href.match( INTERNAL_HREF );

        if ( internal )
        {
            const exists = knownSlugs.has( internal[ 1 ] );
            const classes = exists ? "wiki-link" : "wiki-link-missing";
            const hint = exists ? "" : " title=\"Cette page n'existe pas encore\" data-missing=\"true\"";
            return `<a ${ attributes } class="${ classes }"${ hint }>`;
        }

        if ( /^https?:\/\//i.test( href ) )
        {
            return `<a ${ attributes } class="wiki-link" target="_blank" rel="noopener noreferrer">`;
        }

        return `<a ${ attributes } class="wiki-link">`;
    } );

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
    const headings = collectHeadings( markdown );
    const rendered = sanitizeHtml( marked.parse( markdown ) as string );

    return {
        html: decorateLinks( applyHeadingIds( rendered, headings ), knownSlugs ),
        headings,
        links: extractInternalLinks( markdown )
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
    decorateLinks( sanitizeHtml( marked.parse( markdown ) as string ), knownSlugs );

/**
 * Converts Markdown to plain text, for excerpts, search and word counts.
 *
 * @param markdown Any Markdown.
 * @returns The text content, whitespace collapsed.
 * @author Claude
 */
export const markdownToPlainText = ( markdown: string ): string =>
    ( marked.parse( markdown ) as string )
        .replace( /<[^>]*>/g, " " )
        .replace( /&nbsp;/g, " " )
        .replace( /&amp;/g, "&" )
        .replace( /&lt;/g, "<" )
        .replace( /&gt;/g, ">" )
        .replace( /&quot;/g, "\"" )
        .replace( /&#39;/g, "'" )
        .replace( /\s+/g, " " )
        .trim();

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
    return `${ cut.slice( 0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength ).trimEnd() }…`;
};

/**
 * Counts the words of a Markdown body.
 *
 * @param markdown Any Markdown.
 * @returns The number of words.
 * @author Claude
 */
export const countWords = ( markdown: string ): number =>
{
    const text = markdownToPlainText( markdown );
    return text ? text.split( /\s+/ ).length : 0;
};
