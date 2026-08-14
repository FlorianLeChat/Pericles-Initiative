/**
 * Shared data contracts for the whole encyclopedia.
 *
 * Everything the site displays comes from a single `Dataset`, currently held
 * entirely in the browser's `localStorage` `Overlay`, in the absence of a
 * backend to seed it from.
 *
 * @author Claude
 */

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
    description: string;
    /** Path under `/media/` or absolute url. Empty falls back to a monogram. */
    logo: string;
    /** Key of an accent, see `src/lib/config/accents.ts`. */
    accent: string;
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
    /**
     * ISO timestamp of the last write to this overlay, null while nothing has been stored.
     *
     * Stamped on every save because no other field can answer «has anything changed
     * since my last backup?»: categories carry no timestamp, and a deletion removes
     * the only item that could have carried one.
     */
    changedAt: string | null;
}

/**
 * Connection to the optional remote snapshot service.
 *
 * Absent from `localStorage` until the user configures one, and an empty
 * `baseUrl` means the site works from the overlay alone, which stays a first
 * class mode. See `REMOTE-API.md` for the contract this describes.
 */
export interface RemoteConfig {
    /** Absolute http or https origin and path prefix, empty when unconfigured. */
    baseUrl: string;
    /** Shared secret sent as `X-Pericles-Secret`, empty to send no header. */
    secret: string;
    /** Last `ETag` seen, replayed as `If-Match` on the next write. */
    revision: string | null;
    /**
     * Whether local changes are sent on their own once the network is back.
     *
     * Off until the reader turns it on, and armed only once a first transfer has
     * been made by hand: `syncedChange` being null means nothing is known about
     * what the service holds, and publishing over it unasked could destroy a
     * backup this browser has never read.
     */
    autoPush: boolean;
    lastPulledAt: string | null;
    lastPushedAt: string | null;
    /**
     * Marker of the local content last known to match the remote snapshot.
     *
     * Opaque to the remote store, which never reads content: the panel hands it
     * `Overlay.changedAt` and compares the two to tell an up to date backup from a
     * stale one. Null means this browser has never been in sync with the service.
     */
    syncedChange: string | null;
}

/** A snapshot read from the remote service, already normalised. */
export interface RemoteSnapshot {
    dataset: Dataset;
    /** `ETag` of the response, when the server sent one. */
    revision: string | null;
    /** Server reported timestamp, only present with the enveloped shape. */
    updatedAt: string | null;
}

/**
 * Why a remote request did not succeed.
 *
 * Machine readable on purpose: the French sentence shown to the reader is
 * written in the component that displays it, since there is no message
 * catalogue for a single language.
 */
export type RemoteFailure = "network" | "refused" | "missing" | "unsupported" | "conflict" | "unreadable" | "server";

/** Where a remote request currently stands. */
export type RemoteStatus = "idle" | "loading" | "success" | "error";

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

/** How the encyclopedia index orders what its filters keep. */
export type EntrySort = "alphabetique" | "recent" | "chronologique";

/**
 * What the filters of the encyclopedia index currently ask for.
 *
 * Nothing persists this: the panel drawing the controls and the listing reading
 * them are two components, so the shape they agree on is declared here rather
 * than in either one. `tous` and `toutes` stand for the absence of a filter, and
 * are the values the controls themselves carry.
 */
export interface EntryFilterState {
    query: string;
    category: string;
    status: EntryStatus | "tous";
    sort: EntrySort;
}
