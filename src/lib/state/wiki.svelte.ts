/**
 * Central state of the encyclopedia.
 *
 * Two sources are merged here:
 *  - the `seed`, installed by the root layout's `hydrate` call. There is no
 *    backend yet, so it is always empty for now; it exists as the hook a
 *    future database would feed instead of `null`.
 *  - the `overlay`, the content kept in `localStorage`, read only in the
 *    browser after hydration. Until a real backend exists, this is the sole
 *    source of content: everything a reader sees was created from this browser.
 *
 * This module holds a singleton. During prerendering every page renders with
 * the same empty seed and an empty overlay, so sharing it across renders is safe.
 *
 * @author Claude
 */

import { browser } from "$app/env";
import * as m from "#lib/locales/messages.js";
import { storedSize } from "#lib/utilities/size.ts";
import { STORAGE_QUOTA } from "#lib/config/storage.ts";
import { timelineSortKey } from "#lib/utilities/date.ts";
import { compareTitles, uniqueSlug } from "#lib/utilities/slug.ts";
import { extractInternalLinks, retargetInternalLinks } from "#lib/utilities/markdown.ts";
import type { Category, Dataset, Entry, EntryDate, LiveEntry, Overlay, WikiMeta } from "#lib/types.ts";
import { buildImportOverlay,
    countOverlayContent,
    emptyDataset,
    emptyOverlay,
    mergeDataset,
    normalizeCategory,
    normalizeDataset,
    normalizeEntry,
    normalizeLiveEntry,
    normalizeMetaPatch,
    normalizeOverlay,
    withoutKey } from "#lib/utilities/dataset.ts";

/** `localStorage` key holding the unpublished changes. */
const OVERLAY_KEY = "pericles:overlay";

/** `localStorage` key holding the wiki as it stood before the last replacement. */
const PREVIOUS_KEY = "pericles:previous";

/** What `/data` says of the wiki the last replacement set aside. */
export interface PreviousWiki {
    /** When it was replaced, an ISO timestamp. */
    replacedAt: string;
    /** How many pages it held. */
    entries: number;
}

/** The shape written under `PREVIOUS_KEY`. */
interface StoredPrevious {
    replacedAt: string;
    overlay: unknown;
}

/**
 * Reads what was written under `PREVIOUS_KEY`, through the same normalisation
 * as the overlay itself.
 *
 * @param raw The stored string.
 * @returns When it was replaced and the overlay it held, or null when unreadable.
 * @author Claude
 */
const readPrevious = ( raw: string ): { replacedAt: string; overlay: Overlay } | null =>
{
    try
    {
        const parsed = JSON.parse( raw ) as Partial<StoredPrevious> | null;
        const replacedAt = typeof parsed?.replacedAt === "string" ? parsed.replacedAt : "";

        return { replacedAt, overlay: normalizeOverlay( parsed?.overlay ) };
    }
    catch
    {
        return null;
    }
};

/** How long an alert keeps showing the site wide banner, in milliseconds. */
const BREAKING_MAX_AGE = 24 * 60 * 60 * 1000;

/** A page linking to a slug that has no page yet. */
export interface MissingLink {
    slug: string;
    from: Entry[];
}

/**
 * A change the reader can still take back: a deletion, or several drafts
 * published at once.
 *
 * `kind` says what happened and `title` names what it touched, the first page
 * of a publication; `count` says how many pages a publication touched. That is
 * all the toast offering the undo needs to word its sentence.
 */
export interface Undoable {
    kind: "entry" | "live" | "category" | "publish";
    title: string;
    count?: number;
}

/**
 * One point of the chronology: a single date of a single page.
 *
 * A page carrying a birth and a death stands twice on the frise, at two distant
 * years, so what the chronology lists is dates rather than pages.
 */
export interface ChronologyPoint {
    entry: Entry;
    date: EntryDate;
}

/**
 * Gathers every piece of Markdown of a page that may carry a link.
 *
 * The values of the infobox are joined to the body as paragraphs of their own,
 * so the single memoised lexing pass of `extractInternalLinks` still covers them.
 *
 * @param entry Page to read.
 * @returns The body, then each value of the infobox, separated by blank lines.
 * @author Claude
 */
const linkedText = ( entry: Entry ): string =>
    [ entry.body, ...entry.infobox.map( ( field ) => field.value ) ].join( "\n\n" );

class WikiStore
{
    /** Raw value last passed to `hydrate`, so repeated calls are free. */
    #source: unknown = undefined;

    /** Depth of the running `#batch` calls, while which `persist` is deferred. */
    #batchDepth = 0;

    /**
     * The overlay as it stood before the last deletion, which `undo` puts back.
     *
     * One level, and kept in memory only: a second copy of the wiki written to
     * `localStorage` would share the quota with the first, and a reload is
     * reason enough to consider the deletion settled. Any later write drops it,
     * since restoring the whole overlay would otherwise take that write back too.
     */
    #undoOverlay: Overlay | null = null;

    /** Set between taking the snapshot and the write of the deletion it covers. */
    #remembering = false;

    /** The deletion `undo` would take back, null when there is none. */
    undoable = $state<Undoable | null>( null );

    /** Seed dataset, always empty until a real backend feeds it. */
    seed = $state<Dataset>( emptyDataset() );

    /** Unpublished local changes. */
    overlay = $state<Overlay>( emptyOverlay() );

    /** True once the overlay has been read from `localStorage`. */
    overlayLoaded = $state( false );

    /**
     * True once what the site shows is final: the overlay has been read, or the
     * seed already carries pages of its own.
     *
     * Before that point an empty listing would be a lie. The seed is empty today,
     * so every page would first claim the wiki holds nothing, and `/data` that this
     * browser stores nothing, until an effect read the overlay a moment later. The
     * layout shows a neutral skeleton instead. A seed fed by a future backend still
     * reaches the static HTML, since its pages make this true from the start.
     */
    ready = $derived( this.overlayLoaded || this.seed.entries.length > 0 );

    /** Set when the browser refused to persist, typically a full storage quota. */
    storageError = $state<string | null>( null );

    /** What the site actually displays. */
    dataset = $derived( mergeDataset( this.seed, this.overlay ) );

    meta = $derived( this.dataset.meta );

    /** Every page, drafts included, sorted by title. */
    entries = $derived( [ ...this.dataset.entries ].sort( ( a, b ) => compareTitles( a.title, b.title ) ) );

    /** Pages visible in public listings. */
    publishedEntries = $derived( this.entries.filter( ( entry ) => entry.status === "publie" ) );

    drafts = $derived( this.entries.filter( ( entry ) => entry.status === "brouillon" ) );

    categories = $derived( [ ...this.dataset.categories ].sort( ( a, b ) => a.name.localeCompare( b.name, "fr" ) ) );

    /** Live feed items, most recent first, pinned ones on top. */
    live = $derived(
        [ ...this.dataset.live ].sort(
            ( a, b ) => Number( b.pinned ) - Number( a.pinned ) || b.publishedAt.localeCompare( a.publishedAt )
        )
    );

    /** Distinct tags used by the live feed, alphabetically. */
    liveTags = $derived( [ ...new Set( this.live.flatMap( ( item ) => item.tags ) ) ].sort( ( a, b ) => a.localeCompare( b, "fr" ) ) );

    /**
     * The latest alert, while it is recent enough to deserve a banner.
     *
     * The age is evaluated when the feed changes rather than on a timer: a
     * banner that lingers a few extra minutes is harmless, a ticking clock
     * invalidating the whole page every second is not.
     */
    breaking = $derived.by( () =>
    {
        const latest = this.dataset.live
            .filter( ( item ) => item.severity === "breaking" )
            .sort( ( a, b ) => b.publishedAt.localeCompare( a.publishedAt ) )[ 0 ];

        if ( !latest )
        {
            return null;
        }

        const age = Date.now() - new Date( latest.publishedAt ).getTime();
        return Number.isNaN( age ) || age < 0 || age > BREAKING_MAX_AGE ? null : latest;
    } );

    /** Slugs of the pages that exist, used to detect red links. */
    slugs = $derived( new Set( this.entries.map( ( entry ) => entry.slug ) ) );

    entriesById = $derived( new Map( this.entries.map( ( entry ) => [ entry.id, entry ] ) ) );

    entriesBySlug = $derived( new Map( this.entries.map( ( entry ) => [ entry.slug, entry ] ) ) );

    categoriesBySlug = $derived( new Map( this.categories.map( ( category ) => [ category.slug, category ] ) ) );

    /**
     * For each category slug, the pages carrying it, drafts included.
     *
     * Grouped once, because three listings ask the same question once per
     * category: the home page counts them, the overview lists them and the
     * management screen counts them again. Each of those calls used to filter the
     * whole corpus, so a wiki of a thousand pages and thirty categories walked
     * thirty thousand pages to draw one screen. Built the same way as
     * `incomingLinks`, and left in the order `entries` already sorted them.
     */
    entriesByCategory = $derived.by( () =>
    {
        const grouped: Record<string, Entry[]> = {};

        for ( const entry of this.entries )
        {
            for ( const slug of entry.categories )
            {
                const members = grouped[ slug ] ?? [];
                members.push( entry );
                grouped[ slug ] = members;
            }
        }

        return new Map( Object.entries( grouped ) );
    } );

    /**
     * For each page slug, the slugs it links to.
     *
     * The values of the infobox count as much as the body: «Parents» or
     * «Affiliation» pointing at another page is the plainest link a page makes.
     */
    outgoingLinks = $derived(
        new Map( this.entries.map( ( entry ) => [ entry.slug, extractInternalLinks( linkedText( entry ) ) ] ) )
    );

    /** For each page slug, the pages linking to it. */
    incomingLinks = $derived.by( () =>
    {
        const grouped: Record<string, Entry[]> = {};

        for ( const entry of this.entries )
        {
            for ( const target of this.outgoingLinks.get( entry.slug ) ?? [] )
            {
                if ( target === entry.slug )
                {
                    continue;
                }

                const sources = grouped[ target ] ?? [];
                sources.push( entry );
                grouped[ target ] = sources;
            }
        }

        return new Map( Object.entries( grouped ) );
    } );

    /** Links pointing at pages that do not exist yet. */
    missingLinks = $derived.by( () =>
    {
        const missing: MissingLink[] = [];

        for ( const [ slug, sources ] of this.incomingLinks )
        {
            if ( !this.slugs.has( slug ) )
            {
                missing.push( { slug, from: sources } );
            }
        }

        return missing.sort( ( a, b ) => b.from.length - a.from.length || a.slug.localeCompare( b.slug, "fr" ) );
    } );

    /** Pages carrying at least one date of reference. */
    datedEntries = $derived( this.publishedEntries.filter( ( entry ) => entry.dates.length > 0 ) );

    /** Every date of every published page, in chronological order. */
    chronology = $derived(
        this.publishedEntries
            .flatMap( ( entry ) => entry.dates.map( ( date ) => ( { entry, date } ) ) )
            .sort( ( a, b ) => timelineSortKey( a.date.value ) - timelineSortKey( b.date.value ) )
    );

    /** Most recently edited pages first. */
    recentlyUpdated = $derived( [ ...this.entries ].sort( ( a, b ) => b.updatedAt.localeCompare( a.updatedAt ) ) );

    /**
     * How many pages, categories and feed items this browser stores.
     *
     * Not a count of unsaved changes: the seed being empty, the overlay holds the
     * whole wiki, and exporting it does not empty it.
     */
    storedContentCount = $derived( countOverlayContent( this.overlay ) );

    /** True when this browser holds content of its own, the identity of the wiki aside. */
    hasStoredContent = $derived( this.storedContentCount > 0 );

    /** How many items this browser stores, the identity of the wiki included. */
    storedItemCount = $derived( this.storedContentCount + ( this.overlay.meta ? 1 : 0 ) );

    /**
     * The wiki the last import, restore, demonstration or reset set aside, which
     * `restorePrevious` brings back; null when there is none.
     */
    previous = $state<PreviousWiki | null>( null );

    /**
     * Whether a replacement would leave a copy of the current wiki to come back
     * to. The copy shares the quota of `localStorage` with the wiki that takes
     * its place, so the estimate counts the current wiki twice, its copy and a
     * replacement of about its size, and says no when that does not fit.
     */
    canKeepPrevious = $derived( this.hasStoredContent && storedSize( this.overlay ) * 2 <= STORAGE_QUOTA );

    /** True when this browser holds anything at all, be it content or settings. */
    hasStoredItems = $derived( this.storedItemCount > 0 );

    /**
     * When this browser last wrote something, null while it stores nothing.
     *
     * Doubles as the marker a backup compares itself against: two equal values
     * mean the content has not moved since.
     */
    changedAt = $derived( this.overlay.changedAt );

    /**
     * Installs the seed dataset.
     *
     * Idempotent: calling it again with the same object does nothing, which
     * lets the layout hydrate both during rendering and from an effect. The
     * seed is always empty for now, since there is no backend to feed it yet.
     *
     * @param value Seed dataset, currently always null.
     * @author Claude
     */
    hydrate( value: unknown ): void
    {
        if ( this.#source === value )
        {
            return;
        }

        this.#source = value;
        this.seed = normalizeDataset( value );
    }

    /**
     * Reads the unpublished changes from `localStorage`.
     *
     * Called from the root layout once mounted, never during rendering, so the
     * server output and the first client render stay identical.
     *
     * @author Claude
     */
    loadOverlay(): void
    {
        if ( !browser || this.overlayLoaded )
        {
            return;
        }

        try
        {
            const stored = localStorage.getItem( OVERLAY_KEY );
            if ( stored )
            {
                this.overlay = normalizeOverlay( JSON.parse( stored ) );
            }

            const kept = localStorage.getItem( PREVIOUS_KEY );
            const previous = kept ? readPrevious( kept ) : null;

            this.previous = previous
                ? { replacedAt: previous.replacedAt, entries: Object.keys( previous.overlay.entries ).length }
                : null;
        }
        catch ( error )
        {
            this.storageError = m.wiki_storage_read_error( { error: String( error ) } );
        }
        finally
        {
            this.overlayLoaded = true;
        }
    }

    /**
     * Writes the overlay back to `localStorage`, stamping when the content moved.
     *
     * The stamp is taken even if the write then fails: what the site displays has
     * changed, so a backup made before this point is stale whatever the browser
     * did with the bytes.
     *
     * @author Claude
     */
    private persist(): void
    {
        if ( !browser || this.#batchDepth > 0 )
        {
            return;
        }

        if ( this.#remembering )
        {
            this.#remembering = false;
        }
        else
        {
            this.dismissUndo();
        }

        this.overlay.changedAt = new Date().toISOString();

        try
        {
            localStorage.setItem( OVERLAY_KEY, JSON.stringify( this.overlay ) );
            this.storageError = null;
        }
        catch ( error )
        {
            this.storageError = m.wiki_storage_write_error( { error: String( error ) } );
        }
    }

    /**
     * Runs a mutation that touches many items, writing to storage only once.
     *
     * Renaming or deleting a category rewrites every page carrying it, and each
     * of those saves would otherwise serialise the whole overlay again. The
     * write is deferred to the end, so the cost stops growing with the number of
     * affected pages.
     *
     * @param mutate Mutation to run.
     * @author Claude
     */
    #batch( mutate: () => void ): void
    {
        this.#batchDepth += 1;

        try
        {
            mutate();
        }
        finally
        {
            this.#batchDepth -= 1;
        }

        this.persist();
    }

    /**
     * Keeps the overlay as it stands, for the change about to be written.
     *
     * @param undoable What the change removes or publishes.
     * @author Claude
     */
    #remember( undoable: Undoable ): void
    {
        this.#undoOverlay = $state.snapshot( this.overlay );
        this.#remembering = true;
        this.undoable = undoable;
    }

    /**
     * Puts back what the last deletion removed.
     *
     * The whole overlay is restored rather than the one item, so a page comes
     * back with its address, its categories and the deletion marker of a seeded
     * page withdrawn, exactly as it stood. Nothing can have been written since,
     * or the snapshot would already be gone.
     *
     * @author Claude
     */
    undo(): void
    {
        if ( !this.#undoOverlay )
        {
            return;
        }

        this.overlay = this.#undoOverlay;
        this.persist();
    }

    /**
     * Gives up the chance to take the last deletion back.
     *
     * @author Claude
     */
    dismissUndo(): void
    {
        this.#undoOverlay = null;
        this.undoable = null;
    }

    /**
     * Finds a page by slug.
     *
     * @param slug Url segment of the page.
     * @returns The page, or undefined when it does not exist.
     * @author Claude
     */
    bySlug( slug: string ): Entry | undefined
    {
        return this.entriesBySlug.get( slug );
    }

    /**
     * Lists the pages linking to a given page.
     *
     * @param slug Url segment of the target page.
     * @returns The pages linking to it, sorted by title.
     * @author Claude
     */
    backlinksOf( slug: string ): Entry[]
    {
        return [ ...( this.incomingLinks.get( slug ) ?? [] ) ].sort( ( a, b ) => a.title.localeCompare( b.title, "fr" ) );
    }

    /**
     * Lists the pages of a category.
     *
     * Read from `entriesByCategory` rather than filtered out of the corpus, so
     * the cost follows the size of the category rather than that of the wiki.
     *
     * @param slug Category slug.
     * @param includeDrafts Whether drafts should be listed too.
     * @returns The matching pages, sorted by title.
     * @author Claude
     */
    entriesInCategory( slug: string, includeDrafts = false ): Entry[]
    {
        const members = this.entriesByCategory.get( slug ) ?? [];
        return includeDrafts ? [ ...members ] : members.filter( ( entry ) => entry.status === "publie" );
    }

    /**
     * Suggests pages related to a given one, by shared categories, leaving out
     * the pages that already link to it.
     *
     * Those are listed just above the suggestions, under «Pages qui mènent ici»,
     * and a page named twice at the foot of an article pushed out a third that
     * was not named at all.
     *
     * @param entry Reference page.
     * @param limit Maximum number of suggestions, defaults to 4.
     * @returns Pages sharing the most categories.
     * @author Claude
     */
    relatedTo( entry: Entry, limit = 4 ): Entry[]
    {
        const reference = new Set( entry.categories );
        const citing = new Set( this.backlinksOf( entry.slug ).map( ( candidate ) => candidate.id ) );

        const scored = this.publishedEntries
            .filter( ( candidate ) => candidate.id !== entry.id && !citing.has( candidate.id ) )
            .map( ( candidate ) => ( {
                candidate,
                shared: candidate.categories.filter( ( category ) => reference.has( category ) ).length
            } ) )
            .filter( ( item ) => item.shared > 0 );

        return scored
            .toSorted( ( a, b ) => b.shared - a.shared || a.candidate.title.localeCompare( b.candidate.title, "fr" ) )
            .slice( 0, limit )
            .map( ( item ) => item.candidate );
    }

    /**
     * Creates or updates a page.
     *
     * The slug is made unique against every other page, and `updatedAt` is
     * refreshed on every save.
     *
     * @param input Page fields, partial for an update.
     * @returns The stored page.
     * @author Claude
     */
    saveEntry( input: Partial<Entry> ): Entry
    {
        const now = new Date().toISOString();
        const existing = input.id ? this.entriesById.get( input.id ) : undefined;
        const candidate = normalizeEntry( {
            ...existing,
            ...input,
            createdAt: existing?.createdAt || input.createdAt || now,
            updatedAt: now
        } );

        const taken = this.entries.filter( ( entry ) => entry.id !== candidate.id ).map( ( entry ) => entry.slug );
        const entry: Entry = { ...candidate, slug: uniqueSlug( candidate.slug, taken ) };

        this.overlay.entries[ entry.id ] = entry;
        this.persist();

        return entry;
    }

    /**
     * Publishes several drafts at once, from the index filtered to drafts.
     *
     * Written in one batch, so the overlay is serialised once, and remembered
     * like a deletion, so the toast can take the whole publication back.
     *
     * @param ids Identifiers of the pages to publish; those already published are skipped.
     * @returns How many pages were published.
     * @author Claude
     */
    publishEntries( ids: readonly string[] ): number
    {
        const drafts = ids
            .map( ( id ) => this.entriesById.get( id ) )
            .filter( ( entry ): entry is Entry => entry?.status === "brouillon" );
        const first = drafts.at( 0 );

        if ( !first )
        {
            return 0;
        }

        this.#remember( { kind: "publish", title: first.title, count: drafts.length } );
        this.#batch( () =>
        {
            for ( const draft of drafts )
            {
                this.saveEntry( { ...draft, status: "publie" } );
            }
        } );

        return drafts.length;
    }

    /**
     * Points the links of every page at a page that changed address.
     *
     * A slug is the url, and nothing else keys a link: renaming a page leaves
     * every body that cited it pointing at an address nobody answers, which the
     * site renders as a red link, so a rename silently turns citations into
     * pages waiting to be written.
     *
     * The pages are read from the link graph rather than scanned, and rewritten
     * in one batch, so the overlay is serialised once however many cite the page.
     *
     * @param from Slug the links currently point at.
     * @param to Slug they should point at.
     * @returns The number of pages rewritten.
     * @author Claude
     */
    retargetLinks( from: string, to: string ): number
    {
        const sources = this.backlinksOf( from );

        this.#batch( () =>
        {
            for ( const source of sources )
            {
                this.saveEntry( {
                    ...source,
                    body: retargetInternalLinks( source.body, from, to ),
                    infobox: source.infobox.map( ( field ) => (
                        { ...field, value: retargetInternalLinks( field.value, from, to ) }
                    ) )
                } );
            }
        } );

        return sources.length;
    }

    /**
     * Deletes a page, whether it comes from the seed or from the overlay.
     *
     * The deletion can be taken back through `undo` until anything else is written.
     *
     * @param id Identifier of the page.
     * @author Claude
     */
    deleteEntry( id: string ): void
    {
        const entry = this.entriesById.get( id );

        if ( entry )
        {
            this.#remember( { kind: "entry", title: entry.title } );
        }

        this.overlay.entries = withoutKey( this.overlay.entries, id );

        const inSeed = this.seed.entries.some( ( entry ) => entry.id === id );
        if ( inSeed && !this.overlay.deleted.entries.includes( id ) )
        {
            this.overlay.deleted.entries.push( id );
        }

        this.persist();
    }

    /**
     * Drops a category from the overlay, and records the deletion when it comes
     * from the published dataset.
     *
     * @param slug Category slug.
     * @author Claude
     */
    #forgetCategory( slug: string ): void
    {
        this.overlay.categories = withoutKey( this.overlay.categories, slug );

        const inSeed = this.seed.categories.some( ( category ) => category.slug === slug );
        if ( inSeed && !this.overlay.deleted.categories.includes( slug ) )
        {
            this.overlay.deleted.categories.push( slug );
        }
    }

    /**
     * Creates or updates a category.
     *
     * Categories are keyed by slug, so renaming one means moving every page
     * over to the new slug and forgetting the old category.
     *
     * @param input Category fields.
     * @param previousSlug Slug the category had before the edit, when it changed.
     * @returns The stored category.
     * @author Claude
     */
    saveCategory( input: Partial<Category>, previousSlug?: string ): Category
    {
        const category = normalizeCategory( input );

        this.#batch( () =>
        {
            this.overlay.categories[ category.slug ] = category;

            if ( !previousSlug || previousSlug === category.slug )
            {
                return;
            }

            for ( const child of this.categories )
            {
                if ( child.parent === previousSlug )
                {
                    this.overlay.categories[ child.slug ] = { ...child, parent: category.slug };
                }
            }

            for ( const entry of this.entries )
            {
                if ( entry.categories.includes( previousSlug ) )
                {
                    this.saveEntry( {
                        ...entry,
                        categories: entry.categories.map( ( candidate ) =>
                            candidate === previousSlug ? category.slug : candidate
                        )
                    } );
                }
            }

            this.#forgetCategory( previousSlug );
        } );

        return category;
    }

    /**
     * Deletes a category and detaches it from every page, which `undo` can take
     * back like a page: the whole overlay is restored, so the category comes
     * back on every page it was taken off.
     *
     * @param slug Category slug.
     * @author Claude
     */
    deleteCategory( slug: string ): void
    {
        const category = this.categoriesBySlug.get( slug );

        if ( category )
        {
            this.#remember( { kind: "category", title: category.name } );
        }

        this.#batch( () =>
        {
            this.#forgetCategory( slug );

            for ( const entry of this.entries )
            {
                if ( entry.categories.includes( slug ) )
                {
                    this.saveEntry( {
                        ...entry,
                        categories: entry.categories.filter( ( candidate ) => candidate !== slug )
                    } );
                }
            }
        } );
    }

    /**
     * Publishes or updates a live feed item.
     *
     * @param input Live item fields.
     * @returns The stored item.
     * @author Claude
     */
    saveLiveEntry( input: Partial<LiveEntry> ): LiveEntry
    {
        const item = normalizeLiveEntry( {
            ...input,
            publishedAt: input.publishedAt || new Date().toISOString()
        } );

        this.overlay.live[ item.id ] = item;
        this.persist();

        return item;
    }

    /**
     * Deletes a live feed item, which `undo` can take back like a page.
     *
     * @param id Identifier of the item.
     * @author Claude
     */
    deleteLiveEntry( id: string ): void
    {
        const item = this.dataset.live.find( ( candidate ) => candidate.id === id );

        if ( item )
        {
            this.#remember( { kind: "live", title: item.title } );
        }

        this.overlay.live = withoutKey( this.overlay.live, id );

        const inSeed = this.seed.live.some( ( item ) => item.id === id );
        if ( inSeed && !this.overlay.deleted.live.includes( id ) )
        {
            this.overlay.deleted.live.push( id );
        }

        this.persist();
    }

    /**
     * Updates the identity of the wiki: name, description, logo.
     *
     * @param patch Fields to change.
     * @author Claude
     */
    saveMeta( patch: Partial<WikiMeta> ): void
    {
        this.overlay.meta = normalizeMetaPatch( { ...this.overlay.meta, ...patch } );
        this.persist();
    }

    /**
     * Forgets the stored overlay, for a browser that now holds nothing at all.
     *
     * An empty overlay and no overlay describe the same wiki, so writing the
     * empty one back would leave a key behind claiming this browser stores
     * something. Only the two resets below can reach that state; everywhere else
     * a mutation has just written something worth keeping.
     *
     * @author Claude
     */
    #forgetStorage(): void
    {
        if ( !browser )
        {
            return;
        }

        this.dismissUndo();

        try
        {
            localStorage.removeItem( OVERLAY_KEY );
            this.storageError = null;
        }
        catch ( error )
        {
            this.storageError = m.wiki_storage_write_error( { error: String( error ) } );
        }
    }

    /**
     * Drops the settings of the wiki, keeping every page.
     *
     * One half of a deliberate pair, `resetContent` being the other: this one
     * puts the identity, the colour and the pages put forward back to their
     * default and does not touch a single page, that one empties the
     * encyclopedia and leaves the settings alone. The language is not ours to
     * forget here, since it is not part of the overlay, so the settings page
     * clears it alongside this call.
     *
     * @author Claude
     */
    resetMeta(): void
    {
        this.overlay = { ...this.overlay, meta: null };

        if ( this.hasStoredContent )
        {
            this.persist();
        }
        else
        {
            this.#forgetStorage();
        }
    }

    /**
     * Serialises the current state as a portable JSON export.
     *
     * The file carries `changedAt` beside the dataset: once it sits on the
     * backup service, it is the only thing telling another browser how recent
     * its content is. Importing ignores it, since an import is itself a write
     * and stamps the overlay anew.
     *
     * @returns Pretty printed JSON of the whole dataset, entries, categories and live feed.
     * @author Claude
     */
    exportJson(): string
    {
        const dataset: Dataset = {
            ...this.dataset,
            categories: this.categories,
            entries: this.entries,
            live: this.live
        };
        const stamped = { ...dataset, changedAt: this.changedAt };

        return `${ JSON.stringify( stamped, null, 4 ) }\n`;
    }

    /**
     * Replaces all of the content with an already normalised dataset.
     *
     * The shared entry point of every import, whatever it came from: a file the
     * data page has already read and checked, a snapshot read from the remote
     * backup service, or the demonstration wiki of the settings.
     *
     * An import is complete: anything this browser held and the import does not
     * mention is dropped, the identity of the wiki included. Callers are expected
     * to confirm with the reader first.
     *
     * @param imported Dataset to install, already through `normalizeDataset`.
     * @returns Counts of imported items.
     * @author Claude
     */
    importDataset( imported: Dataset ): { entries: number; categories: number; live: number }
    {
        this.#replace( buildImportOverlay( this.seed, imported ) );

        return {
            entries: imported.entries.length,
            categories: imported.categories.length,
            live: imported.live.length
        };
    }

    /**
     * Drops every page, category and feed item, keeping the settings of the wiki.
     *
     * The counterpart of `resetMeta`, and the reason the two live on two
     * different pages. A reader emptying the encyclopedia is starting a new one
     * here, not disowning the name, the colour and the language they picked for
     * this browser, so those survive.
     *
     * @author Claude
     */
    resetContent(): void
    {
        this.#replace( { ...emptyOverlay(), meta: this.overlay.meta } );
    }

    /**
     * Brings back the wiki the last replacement set aside.
     *
     * It is itself a replacement, so the wiki it takes the place of is set aside
     * in turn, and pressing it twice comes back to where the reader started.
     *
     * @author Claude
     */
    restorePrevious(): void
    {
        if ( !browser )
        {
            return;
        }

        let raw: string | null;

        try
        {
            raw = localStorage.getItem( PREVIOUS_KEY );
        }
        catch ( error )
        {
            this.storageError = m.wiki_storage_read_error( { error: String( error ) } );
            return;
        }

        const previous = raw ? readPrevious( raw ) : null;

        this.#dropPrevious();

        if ( previous )
        {
            this.#replace( previous.overlay );
        }
    }

    /**
     * Installs an overlay in place of the whole current one, setting the current
     * one aside under `PREVIOUS_KEY` first when it holds content and fits.
     *
     * The copy goes first, so a full quota refuses it rather than the wiki
     * arriving; when the wiki arriving is then refused all the same, the copy
     * leaves to make room for it, since the wiki on screen is the one to keep.
     * An overlay holding nothing at all, not even an identity, is forgotten
     * rather than written, as `#forgetStorage` explains.
     *
     * @param next The overlay to install, already normalised.
     * @author Claude
     */
    #replace( next: Overlay ): void
    {
        const kept = this.#keepPrevious();
        const holdsSomething = countOverlayContent( next ) > 0 || next.meta !== null;

        this.overlay = next;

        if ( !holdsSomething )
        {
            this.#forgetStorage();
            return;
        }

        this.persist();

        if ( this.storageError && kept )
        {
            this.#dropPrevious();
            this.persist();
        }
    }

    /**
     * Writes the current overlay under `PREVIOUS_KEY`, when it holds content.
     *
     * A browser holding no page has nothing worth coming back to, so an earlier
     * copy is left as it is rather than overwritten by an empty wiki. A copy that
     * does not fit removes the older one, which no longer describes the wiki the
     * replacement is about to set aside.
     *
     * @returns True when the copy was written.
     * @author Claude
     */
    #keepPrevious(): boolean
    {
        if ( !browser || !this.hasStoredContent )
        {
            return false;
        }

        const stored: StoredPrevious = { replacedAt: new Date().toISOString(), overlay: $state.snapshot( this.overlay ) };

        try
        {
            localStorage.setItem( PREVIOUS_KEY, JSON.stringify( stored ) );
            this.previous = { replacedAt: stored.replacedAt, entries: Object.keys( this.overlay.entries ).length };
            return true;
        }
        catch
        {
            this.#dropPrevious();
            return false;
        }
    }

    /**
     * Forgets the wiki set aside by the last replacement.
     *
     * @author Claude
     */
    #dropPrevious(): void
    {
        this.previous = null;

        try
        {
            localStorage.removeItem( PREVIOUS_KEY );
        }
        catch ( error )
        {
            this.storageError = m.wiki_storage_write_error( { error: String( error ) } );
        }
    }
}

export const wiki = new WikiStore();
