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

import { browser } from "$app/environment";
import type { Category, Dataset, Entry, LiveEntry, Overlay, WikiMeta } from "$lib/types";
import { timelineSortKey } from "$lib/utilities/date";
import { buildImportOverlay,
    countOverlayChanges,
    emptyDataset,
    emptyOverlay,
    mergeDataset,
    normalizeCategory,
    normalizeDataset,
    normalizeEntry,
    normalizeLiveEntry,
    normalizeMetaPatch,
    normalizeOverlay,
    withoutKey } from "$lib/utilities/dataset";
import { extractInternalLinks } from "$lib/utilities/markdown";
import { uniqueSlug } from "$lib/utilities/slug";

/** `localStorage` key holding the unpublished changes. */
const OVERLAY_KEY = "pericles:overlay";

/** How long an alert keeps showing the site wide banner, in milliseconds. */
const BREAKING_MAX_AGE = 24 * 60 * 60 * 1000;

/** A page linking to a slug that has no page yet. */
export interface MissingLink {
    slug: string;
    from: Entry[];
}

class WikiStore
{
    /** Raw value last passed to `hydrate`, so repeated calls are free. */
    #source: unknown = undefined;

    /** Depth of the running `#batch` calls, while which `persist` is deferred. */
    #batchDepth = 0;

    /** Seed dataset, always empty until a real backend feeds it. */
    seed = $state<Dataset>( emptyDataset() );

    /** Unpublished local changes. */
    overlay = $state<Overlay>( emptyOverlay() );

    /** True once the overlay has been read from `localStorage`. */
    overlayLoaded = $state( false );

    /** Set when the browser refused to persist, typically a full storage quota. */
    storageError = $state<string | null>( null );

    /** What the site actually displays. */
    dataset = $derived( mergeDataset( this.seed, this.overlay ) );

    meta = $derived( this.dataset.meta );

    /** Every page, drafts included, sorted by title. */
    entries = $derived( [ ...this.dataset.entries ].sort( ( a, b ) => a.title.localeCompare( b.title, "fr" ) ) );

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

    /** For each page slug, the slugs it links to. */
    outgoingLinks = $derived( new Map( this.entries.map( ( entry ) => [ entry.slug, extractInternalLinks( entry.body ) ] ) ) );

    /** For each page slug, the pages linking to it. */
    incomingLinks = $derived.by( () =>
    {
        // Grouped into a plain record, then frozen into a Map in one go: the Map is
        // never mutated after construction, which is what SvelteMap would be for.
        const grouped: Record<string, Entry[]> = {};

        for ( const entry of this.entries )
        {
            for ( const target of this.outgoingLinks.get( entry.slug ) ?? [] )
            {
                if ( target === entry.slug )
                {
                    continue;
                }

                // Pushed rather than rebuilt by spreading: a page cited by many others
                // would otherwise be recopied once per incoming link.
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

    /** Pages with an in universe date, in chronological order. */
    chronology = $derived(
        this.publishedEntries
            .filter( ( entry ) => entry.timelineDate )
            .sort( ( a, b ) => timelineSortKey( a.timelineDate ) - timelineSortKey( b.timelineDate ) )
    );

    /** Most recently edited pages first. */
    recentlyUpdated = $derived( [ ...this.entries ].sort( ( a, b ) => b.updatedAt.localeCompare( a.updatedAt ) ) );

    localChangeCount = $derived( countOverlayChanges( this.overlay ) );

    hasLocalChanges = $derived( this.localChangeCount > 0 );

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
        }
        catch ( error )
        {
            this.storageError = `Modifications locales illisibles : ${ String( error ) }`;
        }
        finally
        {
            this.overlayLoaded = true;
        }
    }

    /**
     * Writes the overlay back to `localStorage`.
     *
     * @author Claude
     */
    private persist(): void
    {
        if ( !browser || this.#batchDepth > 0 )
        {
            return;
        }

        try
        {
            localStorage.setItem( OVERLAY_KEY, JSON.stringify( this.overlay ) );
            this.storageError = null;
        }
        catch ( error )
        {
            this.storageError
                = "Impossible d'enregistrer les modifications locales, le stockage du navigateur est plein. "
                  + `Exportez le JSON pour ne rien perdre. (${ String( error ) })`;
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
     * Lists the existing pages a given page links to.
     *
     * @param entry Source page.
     * @returns The linked pages that exist.
     * @author Claude
     */
    outgoingOf( entry: Entry ): Entry[]
    {
        return ( this.outgoingLinks.get( entry.slug ) ?? [] )
            .map( ( slug ) => this.entriesBySlug.get( slug ) )
            .filter( ( target ): target is Entry => target !== undefined && target.slug !== entry.slug );
    }

    /**
     * Lists the pages of a category.
     *
     * @param slug Category slug.
     * @param includeDrafts Whether drafts should be listed too.
     * @returns The matching pages, sorted by title.
     * @author Claude
     */
    entriesInCategory( slug: string, includeDrafts = false ): Entry[]
    {
        const source = includeDrafts ? this.entries : this.publishedEntries;
        return source.filter( ( entry ) => entry.categories.includes( slug ) );
    }

    /**
     * Suggests pages related to a given one, by shared categories.
     *
     * @param entry Reference page.
     * @param limit Maximum number of suggestions, defaults to 4.
     * @returns Pages sharing the most categories.
     * @author Claude
     */
    relatedTo( entry: Entry, limit = 4 ): Entry[]
    {
        const reference = new Set( entry.categories );

        // Scored once per candidate rather than inside the comparator, which called
        // it twice per comparison and rescanned both category lists each time.
        const scored = this.publishedEntries
            .filter( ( candidate ) => candidate.id !== entry.id )
            .map( ( candidate ) => ( {
                candidate,
                shared: candidate.categories.filter( ( category ) => reference.has( category ) ).length
            } ) )
            .filter( ( item ) => item.shared > 0 );

        return scored
            .sort( ( a, b ) => b.shared - a.shared || a.candidate.title.localeCompare( b.candidate.title, "fr" ) )
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
     * Deletes a page, whether it comes from the seed or from the overlay.
     *
     * @param id Identifier of the page.
     * @author Claude
     */
    deleteEntry( id: string ): void
    {
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
     * Deletes a category and detaches it from every page.
     *
     * @param slug Category slug.
     * @author Claude
     */
    deleteCategory( slug: string ): void
    {
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
     * Deletes a live feed item.
     *
     * @param id Identifier of the item.
     * @author Claude
     */
    deleteLiveEntry( id: string ): void
    {
        this.overlay.live = withoutKey( this.overlay.live, id );

        const inSeed = this.seed.live.some( ( item ) => item.id === id );
        if ( inSeed && !this.overlay.deleted.live.includes( id ) )
        {
            this.overlay.deleted.live.push( id );
        }

        this.persist();
    }

    /**
     * Updates the identity of the wiki: name, tagline, description, logo.
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
     * Drops the local changes made to the identity of the wiki.
     *
     * @author Claude
     */
    resetMeta(): void
    {
        this.overlay.meta = null;
        this.persist();
    }

    /**
     * Serialises the current state as a portable JSON export.
     *
     * @returns Pretty printed JSON of the whole dataset, entries, categories and live feed.
     * @author Claude
     */
    exportJson(): string
    {
        const dataset: Dataset = {
            ...this.dataset,
            meta: { ...this.meta, updatedAt: new Date().toISOString() },
            categories: this.categories,
            entries: this.entries,
            live: this.live
        };

        return `${ JSON.stringify( dataset, null, 4 ) }\n`;
    }

    /**
     * Replaces or merges the current content with an imported JSON file.
     *
     * @param text Raw JSON.
     * @param mode `remplacer` to show exactly the imported content, `fusionner` to add to it.
     * @returns Counts of imported items.
     * @throws When the text is not valid JSON.
     * @author Claude
     */
    importJson( text: string, mode: "fusionner" | "remplacer" ): { entries: number; categories: number; live: number }
    {
        const imported = normalizeDataset( JSON.parse( text ) );

        this.overlay = buildImportOverlay( this.seed, imported, mode, this.overlay );
        this.persist();

        return {
            entries: imported.entries.length,
            categories: imported.categories.length,
            live: imported.live.length
        };
    }

    /**
     * Drops every local change and goes back to the empty seed.
     *
     * @author Claude
     */
    resetLocal(): void
    {
        this.overlay = emptyOverlay();

        if ( browser )
        {
            try
            {
                localStorage.removeItem( OVERLAY_KEY );
                this.storageError = null;
            }
            catch ( error )
            {
                this.storageError = String( error );
            }
        }
    }
}

export const wiki = new WikiStore();
