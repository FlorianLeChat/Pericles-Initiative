/**
 * Markdown rendering pipeline.
 *
 * Article bodies are stored as Markdown and rendered here with `marked`, which
 * runs both in Node during prerendering and in the browser after hydration.
 * Milkdown is only used to author that Markdown, never to display it.
 *
 * Internal links use the plain Markdown syntax `[Label](/entries/slug)`, which
 * lets the editor round trip them without any custom syntax while still
 * giving us a link graph, backlinks and red links.
 *
 * @author Claude
 */

import { slugify } from "./slug";
import { pluralize } from "./plural";
import * as m from "#lib/locales/messages.js";
import { isImageSource, isSafeUrl } from "./url";
import { marked, type Token, type Tokens } from "marked";
import type { Heading, RenderedArticle } from "#lib/types.ts";

marked.use( { gfm: true, breaks: false } );

/** Matches the slug of an internal page url, ignoring any anchor or query. */
const INTERNAL_HREF = /^\/entries\/([^#?/]+)/;

/**
 * Slug of the page an internal url points at.
 *
 * Shared by the rendered article and the editor, which both draw a link to a
 * page that does not exist as a red link, and have to agree on what counts as
 * one.
 *
 * @param href Url of a link, as authored.
 * @returns The slug, or null when the url does not point at a page of the wiki.
 * @author Claude
 */
export const internalSlug = ( href: string ): string | null => INTERNAL_HREF.exec( href )?.[ 1 ] ?? null;

/**
 * What may follow a slug inside the target of an internal link: the closing
 * parenthesis, a trailing slash, an anchor, a query, or the space introducing
 * the title Markdown allows inside the parentheses.
 *
 * Written as a lookahead so the character stays out of the match and survives
 * the replacement untouched.
 */
const SLUG_END = "(?=[)/#?\\s])";

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
 * Links, captured with their attributes and their content.
 *
 * A single `\s` rather than `\s+`: the following `[^>]*` also matches spaces, so
 * the two quantifiers overlap and the pattern backtracks quadratically, which
 * SonarQube reports as a super linear regular expression. The leftover spaces
 * are removed by the `trim` in `decorateLinks`. The content stops at the first
 * closing tag, which is the right one: a link never holds another.
 */
const LINKS = /<a\s([^>]*)>([\s\S]*?)<\/a>/g;

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
 * Tags that end a run of text, replaced by a space when a body is reduced to
 * plain text, so two paragraphs do not run into one word. Every other tag, a
 * link or an emphasis, sits inside a sentence and is dropped without one: a
 * space there wrote «d' Athéna Vance .» for «d'Athéna Vance.». Only the tags
 * `marked` wraps text in are listed; the lists and tables around them need none.
 */
const BLOCK_TAGS = /<\/?(?:p|h[1-6]|li|blockquote|pre|t[rdh]|br)\b[^<>]*>/gi;

/** Closing tag of a heading, where a passage marks the end of a section title. */
const HEADING_END = /<\/h[1-6]>/gi;

/** A whole heading element, title included, which the lead of a listing leaves out. */
const HEADING_ELEMENTS = /<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi;

/**
 * What a passage writes after a section title, so «Réputation» and the sentence
 * under it do not read as one: «Réputation · Le bureau des feux…».
 */
const HEADING_SEPARATOR = " · ";

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
 * @returns The same HTML without scripts, dangerous tags or executable urls; an image
 * may keep a base64 raster source, which is drawn and never followed.
 * @author Claude
 */
export const sanitizeHtml = ( html: string ): string =>
    html
        .replaceAll( SCRIPT_BLOCKS, "" )
        .replaceAll( FORBIDDEN_TAGS, "" )
        .replaceAll( EVENT_ATTRIBUTES, "" )
        .replaceAll( URL_ATTRIBUTES, ( match, name: string, value: string ) =>
        {
            const url = unquote( value );
            const allowed = name.toLowerCase() === "src" ? isImageSource( url ) : isSafeUrl( url );

            return allowed ? match : ` ${ name }="#"`;
        } );

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
 * Points every internal link of a body at another page.
 *
 * Used when a page changes address: the links written towards the old one would
 * otherwise turn red, which is a broken wiki rather than a planned page.
 *
 * The slug is put straight into the expression without being escaped, because
 * every stored slug comes out of `slugify` and therefore holds nothing but
 * lowercase letters, digits and dashes.
 *
 * @param markdown Article body.
 * @param from Slug the links currently point at.
 * @param to Slug they should point at.
 * @returns The body, with those links rewritten.
 * @author Claude
 */
export const retargetInternalLinks = ( markdown: string, from: string, to: string ): string =>
{
    const links = new RegExp( `(\\]\\(/entries/)${ from }${ SLUG_END }`, "g" );

    return markdown.replace( links, ( _match, opening: string ) => `${ opening }${ to }` );
};

/** Matches a level two heading on a line of its own, capturing its text. */
const LEVEL_TWO_HEADING = /^##[^\S\n]+(.+?)[^\S\n]*$/;

/** Matches a heading of level one or two, which closes the section above it. */
const SECTION_BREAK = /^#{1,2}[^\S\n]/;

/**
 * Removes the level two sections a template wrote and nobody filled.
 *
 * Only the headings given are considered: a section the author wrote on purpose
 * and left empty for now is theirs to keep, whereas «Personnalité» left standing
 * by a template would print a heading over nothing.
 *
 * @param markdown Article body.
 * @param headings Text of the headings the template wrote.
 * @returns The body, without those of them that hold nothing.
 * @author Claude
 */
export const dropEmptySections = ( markdown: string, headings: readonly string[] ): string =>
{
    const lines = markdown.split( "\n" );
    const kept: string[] = [];
    let index = 0;

    while ( index < lines.length )
    {
        const line = lines[ index ] ?? "";
        const heading = LEVEL_TWO_HEADING.exec( line )?.[ 1 ];
        let end = index + 1;

        while ( end < lines.length && !SECTION_BREAK.test( lines[ end ] ?? "" ) )
        {
            end += 1;
        }

        const section = lines.slice( index + 1, end );
        const empty = section.every( ( content ) => content.trim() === "" );
        const scaffolding = heading !== undefined && headings.includes( heading ) && empty;

        if ( !scaffolding )
        {
            kept.push( ...( heading === undefined ? [ line ] : [ line, ...section ] ) );
        }

        index = heading === undefined ? index + 1 : end;
    }

    const result = kept.join( "\n" ).trim();

    return result ? `${ result }\n` : "";
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
 * A red link is told apart by its colour and its dotted underline, neither of
 * which a screen reader conveys, so its name ends with a visually hidden «(fiche
 * à écrire)». A `title` used to carry that, and was read aloud as a description
 * at best.
 *
 * An authored `class` is dropped rather than kept alongside ours: a duplicate
 * attribute wins over the later one in the browser, which would let a body opt
 * out of the red link styling.
 *
 * @param html Rendered HTML.
 * @param knownSlugs Slugs of the pages that currently exist.
 * @returns The HTML with decorated anchors.
 * @author Claude
 */
const decorateLinks = ( html: string, knownSlugs: ReadonlySet<string> ): string =>
    html.replaceAll( LINKS, ( _match, rawAttributes: string, content: string ) =>
    {
        const attributes = rawAttributes.replaceAll( CLASS_ATTRIBUTE, "" ).trim();
        const href = HREF_ATTRIBUTE.exec( attributes )?.[ 1 ] ?? "";
        const internal = internalSlug( href );

        if ( internal !== null && !knownSlugs.has( internal ) )
        {
            const hint = `<span class="sr-only"> ${ m.markdown_missing_page_hint() }</span>`;
            return `<a ${ attributes } class="wiki-link-missing" data-missing="true">${ content }${ hint }</a>`;
        }

        if ( EXTERNAL_HREF.test( href ) )
        {
            return `<a ${ attributes } class="wiki-link" target="_blank" rel="noopener noreferrer">${ content }</a>`;
        }

        return `<a ${ attributes } class="wiki-link">${ content }</a>`;
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
        ( table ) => `<div class="article-table" role="region" aria-label="${ m.markdown_table_aria() }" tabindex="0">${ table }</div>`
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
 * Parses and sanitizes a single line of Markdown, with no paragraph around it.
 *
 * A value of an infobox is one phrase rather than a block: parsed as a block,
 * «1,82 m» would come back as a paragraph and «- 12» as a list.
 *
 * @param markdown One line of Markdown.
 * @returns Sanitized inline HTML, links still undecorated.
 * @author Claude
 */
const renderSanitizedPhrase = memoize( ( markdown: string ): string =>
    sanitizeHtml( marked.parseInline( markdown ) as string ) );

/** A link of one line of Markdown, capturing its label and its target. */
const PHRASE_LINK = /\[([^\][]*)]\(([^()\s]*)\)/g;

/** One run of a line of Markdown: plain text, or the label of a link. */
export interface PhraseSegment {
    text: string;
    /** Slug of the page linked to, null for plain text or a link leaving the wiki. */
    slug: string | null;
    /** Whether the run is a link at all. */
    link: boolean;
}

/**
 * Cuts a line of Markdown into its text and the labels of its links.
 *
 * For a preview drawn by the editor beside the field it previews: unlike
 * `renderPhrase`, it yields no anchor, since a link in a preview the pointer
 * passes through would lead out of a page being written.
 *
 * @param markdown One line of Markdown.
 * @returns The runs, in order.
 * @author Claude
 */
export const phraseSegments = ( markdown: string ): PhraseSegment[] =>
{
    const segments: PhraseSegment[] = [];
    let last = 0;

    for ( const match of markdown.matchAll( PHRASE_LINK ) )
    {
        const [ whole, label = "", href = "" ] = match;
        const before = markdown.slice( last, match.index );

        if ( before )
        {
            segments.push( { text: before, slug: null, link: false } );
        }

        segments.push( { text: label, slug: internalSlug( href ), link: true } );
        last = match.index + whole.length;
    }

    const rest = markdown.slice( last );

    if ( rest )
    {
        segments.push( { text: rest, slug: null, link: false } );
    }

    return segments;
};

/**
 * Renders a single line of Markdown, such as a value of an infobox.
 *
 * @param markdown One line of Markdown.
 * @param knownSlugs Slugs of the pages that currently exist, for red links.
 * @returns Display ready inline HTML.
 * @author Claude
 */
export const renderPhrase = ( markdown: string, knownSlugs: ReadonlySet<string> = new Set<string>() ): string =>
    decorateLinks( renderSanitizedPhrase( markdown ), knownSlugs );

/**
 * Converts Markdown to plain text, for excerpts, search and word counts.
 *
 * @param markdown Any Markdown.
 * @returns The text content, whitespace collapsed.
 * @author Claude
 */
const htmlToPlainText = ( html: string ): string =>
    html
        .replaceAll( BLOCK_TAGS, " " )
        .replaceAll( HTML_TAGS, "" )
        .replaceAll( "&nbsp;", " " )
        .replaceAll( "&amp;", "&" )
        .replaceAll( "&lt;", "<" )
        .replaceAll( "&gt;", ">" )
        .replaceAll( "&quot;", "\"" )
        .replaceAll( "&#39;", "'" )
        .replaceAll( WHITESPACE, " " )
        .trim();

/**
 * Converts Markdown to plain text, for search and word counts.
 *
 * @param markdown Any Markdown.
 * @returns The text content, whitespace collapsed.
 * @author Claude
 */
export const markdownToPlainText = memoize( ( markdown: string ): string =>
    htmlToPlainText( marked.parse( markdown ) as string ) );

/**
 * Converts Markdown to a passage a reader is shown: plain text in which every
 * section title is followed by a middle dot rather than run into its first
 * sentence. Kept apart from `markdownToPlainText`, whose words are counted and
 * searched, and which must not count the dot as one.
 *
 * @param markdown Any Markdown.
 * @returns The text content, whitespace collapsed, headings set apart.
 * @author Claude
 */
export const markdownToPassage = memoize( ( markdown: string ): string =>
    htmlToPlainText( ( marked.parse( markdown ) as string ).replaceAll( HEADING_END, HEADING_SEPARATOR ) ) );

/**
 * Converts Markdown to its prose alone, every section title left out, for the
 * lead of a page that has no summary: a lead opening on «Draft ·» read as a
 * second draft marker beside the real one.
 *
 * @param markdown Any Markdown.
 * @returns The text of everything but the headings, whitespace collapsed.
 * @author Claude
 */
const markdownToProse = memoize( ( markdown: string ): string =>
    htmlToPlainText( ( marked.parse( markdown ) as string ).replaceAll( HEADING_ELEMENTS, "" ) ) );

/**
 * Truncates Markdown into a short excerpt, cutting on a word boundary, its
 * section titles left out.
 *
 * The cut is marked with the single ellipsis glyph, as the passages of the search
 * palette are: both cut the fiction, whose typography this follows, while the
 * interface's own placeholders keep three dots like its straight apostrophes.
 *
 * @param markdown Any Markdown.
 * @param maxLength Maximum number of characters, defaults to 180.
 * @returns The excerpt, suffixed with an ellipsis when truncated.
 * @author Claude
 */
export const excerpt = ( markdown: string, maxLength = 180 ): string =>
{
    const text = markdownToProse( markdown );
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
export const countWords = memoize( ( markdown: string ): number =>
{
    const text = markdownToPlainText( markdown );
    return text ? text.split( WHITESPACE ).length : 0;
} );

/** Words read in a minute, the usual figure for prose on a screen. */
const READING_SPEED = 200;

/**
 * Describes the length of a body, in words then in minutes of reading.
 *
 * The minutes are left out of an empty body rather than rounded up to one: an
 * editor showing «0 mots · environ 1 min de lecture» promised a read that was not
 * there.
 *
 * @param words Number of words of the body.
 * @returns «412 mots · environ 2 min de lecture», or the word count alone.
 * @author Claude
 */
export const describeLength = ( words: number ): string =>
{
    const count = pluralize( words, { one: m.common_count_mot_one, other: m.common_count_mot_other } );

    if ( words === 0 )
    {
        return count;
    }

    const minutes = Math.max( 1, Math.round( words / READING_SPEED ) );
    return `${ count } · ${ m.common_reading_time( { minutes } ) }`;
};
