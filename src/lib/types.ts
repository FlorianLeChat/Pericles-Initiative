/**
 * Shared data contracts for the whole encyclopedia.
 *
 * Everything the site displays comes from a single `Dataset`, currently held
 * entirely in the browser's `localStorage` `Overlay`, in the absence of a
 * backend to seed it from.
 *
 * @author Claude
 */

/** The kind of subject a page documents. Drives badges, filters and icons. */
export type EntryType = "personnage" | "lieu" | "evenement" | "organisation" | "objet" | "concept";

/** Publication state of a page. Drafts stay out of public listings. */
export type EntryStatus = "brouillon" | "publie";

/** Urgency of a live feed item, from routine note to breaking news. */
export type LiveSeverity = "info" | "important" | "urgent" | "breaking";

/** A single label and value row of the infobox displayed next to an article. */
export interface InfoboxField {
    label: string;
    value: string;
}

/** Illustration of a page: a path under `/media/` or an absolute URL. */
export interface EntryImage {
    src: string;
    alt: string;
    caption?: string;
}

/** An encyclopedia page. */
export interface Entry {
    /** Stable identifier, kept across slug renames. */
    id: string;
    /** Unique url segment, used as `/wiki/{slug}`. */
    slug: string;
    title: string;
    type: EntryType;
    /** Plain text lead paragraph, reused in listings and meta descriptions. */
    summary: string;
    /** Article body, stored as Markdown. */
    body: string;
    /** Slugs of the categories this page belongs to. */
    categories: string[];
    infobox: InfoboxField[];
    image: EntryImage | null;
    /** In universe date, ISO or free text, used by the chronology. */
    timelineDate: string | null;
    status: EntryStatus;
    /** Alternative names, searched alongside the title. */
    aliases: string[];
    createdAt: string;
    updatedAt: string;
}

/** A thematic grouping of pages. */
export interface Category {
    slug: string;
    name: string;
    description: string;
    /** Key of a palette entry, see `src/lib/config/palette.ts`. */
    color: string;
    /** Slug of a parent category, or null for a root category. */
    parent: string | null;
}

/** An item of the live feed, optionally pointing at a detailed page. */
export interface LiveEntry {
    id: string;
    /** ISO timestamp shown in the feed. */
    publishedAt: string;
    title: string;
    /** Short Markdown body. */
    body: string;
    severity: LiveSeverity;
    tags: string[];
    /** Slug of the page developing this item, when there is one. */
    entrySlug: string | null;
    source: string | null;
    pinned: boolean;
}

/** Global information about the documented universe. */
export interface WikiMeta {
    universe: string;
    tagline: string;
    description: string;
    /** Path under `/media/` or absolute url. Empty falls back to a monogram. */
    logo: string;
    version: string;
    updatedAt: string;
    /** Slugs highlighted on the home page. */
    featured: string[];
}

/** The complete content of the site. */
export interface Dataset {
    meta: WikiMeta;
    categories: Category[];
    entries: Entry[];
    live: LiveEntry[];
}

/**
 * Local, unpublished changes kept in `localStorage`.
 *
 * Upserts are keyed by identifier so that a refreshed seed dataset never
 * discards work in progress, and deletions are tracked separately.
 */
export interface Overlay {
    version: 1;
    entries: Record<string, Entry>;
    categories: Record<string, Category>;
    live: Record<string, LiveEntry>;
    deleted: {
        entries: string[];
        categories: string[];
        live: string[];
    };
    meta: Partial<WikiMeta> | null;
}

/** A heading of a rendered article, used to build the table of contents. */
export interface Heading {
    id: string;
    text: string;
    level: number;
}

/** Result of rendering an article body to HTML. */
export interface RenderedArticle {
    html: string;
    headings: Heading[];
    /** Slugs of the internal pages this article links to. */
    links: string[];
}
