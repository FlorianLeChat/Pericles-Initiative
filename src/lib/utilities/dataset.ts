/**
 * Dataset normalisation and merging.
 *
 * The JSON file is hand editable, so everything read from it goes through a
 * defensive normalisation step: a missing or malformed field never breaks a
 * page, it falls back to a sane default.
 *
 * @author Claude
 */

import { isEntryType } from "$lib/config/entry-types";
import { PALETTE_KEYS } from "$lib/config/palette";
import type { Category,
    Dataset,
    Entry,
    EntryImage,
    InfoboxField,
    LiveEntry,
    LiveSeverity,
    Overlay,
    WikiMeta } from "$lib/types";
import { slugify } from "./slug";
import { isSafeUrl } from "./url";

const LIVE_SEVERITIES: ReadonlySet<LiveSeverity> = new Set( [ "info", "important", "urgent", "breaking" ] );

const DEFAULT_COLOR = "pierre";

/**
 * Generates a stable identifier for a new item.
 *
 * @returns A random identifier, using `crypto.randomUUID` when available.
 * @author Claude
 */
export const createId = (): string =>
{
    if ( typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" )
    {
        return crypto.randomUUID();
    }

    return `id-${ Date.now().toString( 36 ) }-${ Math.random().toString( 36 ).slice( 2, 10 ) }`;
};

const asRecord = ( value: unknown ): Record<string, unknown> =>
    typeof value === "object" && value !== null ? ( value as Record<string, unknown> ) : {};

const asString = ( value: unknown, fallback = "" ): string => ( typeof value === "string" ? value : fallback );

const asTrimmed = ( value: unknown, fallback = "" ): string => asString( value, fallback ).trim();

const asStringArray = ( value: unknown ): string[] =>
    Array.isArray( value ) ? value.filter( ( item ): item is string => typeof item === "string" ) : [];

const asBoolean = ( value: unknown, fallback = false ): boolean => ( typeof value === "boolean" ? value : fallback );

const asNullableString = ( value: unknown ): string | null =>
{
    const text = asTrimmed( value );
    return text || null;
};

const normalizeInfobox = ( value: unknown ): InfoboxField[] =>
    ( Array.isArray( value ) ? value : [] )
        .map( asRecord )
        .map( ( field ) => ( { label: asTrimmed( field.label ), value: asTrimmed( field.value ) } ) )
        .filter( ( field ) => field.label !== "" || field.value !== "" );

/**
 * Keeps an image source only when it is a path or an allowed absolute url.
 *
 * Refusing the other schemes is what keeps `data:` base64 payloads out of the
 * dataset, where they would eat the `localStorage` quota shared with all the
 * text. A relative path is left exactly as written: the shape of the path is
 * the author's business, only its scheme is ours.
 *
 * @param value Raw image source.
 * @returns The source, or an empty string when its scheme is refused.
 * @author Claude
 */
const normalizeImageSource = ( value: unknown ): string =>
{
    const src = asTrimmed( value );
    return isSafeUrl( src ) ? src : "";
};

const normalizeImage = ( value: unknown ): EntryImage | null =>
{
    const raw = asRecord( value );
    const src = normalizeImageSource( raw.src );
    if ( !src )
    {
        return null;
    }

    const caption = asTrimmed( raw.caption );
    return {
        src,
        alt: asTrimmed( raw.alt ),
        ...( caption ? { caption } : {} )
    };
};

/**
 * Normalises a raw page read from JSON or produced by the editor form.
 *
 * @param value Raw page object.
 * @returns A complete `Entry`, with defaults applied.
 * @author Claude
 */
export const normalizeEntry = ( value: unknown ): Entry =>
{
    const raw = asRecord( value );
    const title = asTrimmed( raw.title ) || "Sans titre";
    const createdAt = asTrimmed( raw.createdAt );

    return {
        id: asTrimmed( raw.id ) || createId(),
        slug: slugify( asTrimmed( raw.slug ) || title ),
        title,
        type: isEntryType( raw.type ) ? raw.type : "concept",
        summary: asTrimmed( raw.summary ),
        body: asString( raw.body ),
        categories: [ ...new Set( asStringArray( raw.categories ).map( slugify ) ) ],
        infobox: normalizeInfobox( raw.infobox ),
        image: normalizeImage( raw.image ),
        timelineDate: asNullableString( raw.timelineDate ),
        status: raw.status === "brouillon" ? "brouillon" : "publie",
        aliases: [
            ...new Set(
                asStringArray( raw.aliases )
                    .map( ( alias ) => alias.trim() )
                    .filter( Boolean )
            )
        ],
        createdAt,
        updatedAt: asTrimmed( raw.updatedAt ) || createdAt
    };
};

/**
 * Normalises a raw category.
 *
 * @param value Raw category object.
 * @returns A complete `Category`, with defaults applied.
 * @author Claude
 */
export const normalizeCategory = ( value: unknown ): Category =>
{
    const raw = asRecord( value );
    const name = asTrimmed( raw.name ) || "Sans nom";
    const color = asTrimmed( raw.color );

    return {
        slug: slugify( asTrimmed( raw.slug ) || name ),
        name,
        description: asTrimmed( raw.description ),
        color: PALETTE_KEYS.includes( color ) ? color : DEFAULT_COLOR,
        parent: asNullableString( raw.parent )
    };
};

/**
 * Normalises a raw live feed item.
 *
 * @param value Raw live item object.
 * @returns A complete `LiveEntry`, with defaults applied.
 * @author Claude
 */
export const normalizeLiveEntry = ( value: unknown ): LiveEntry =>
{
    const raw = asRecord( value );
    const severity = asTrimmed( raw.severity ) as LiveSeverity;

    return {
        id: asTrimmed( raw.id ) || createId(),
        publishedAt: asTrimmed( raw.publishedAt ),
        title: asTrimmed( raw.title ) || "Sans titre",
        body: asString( raw.body ),
        severity: LIVE_SEVERITIES.has( severity ) ? severity : "info",
        tags: [
            ...new Set(
                asStringArray( raw.tags )
                    .map( ( tag ) => tag.trim() )
                    .filter( Boolean )
            )
        ],
        entrySlug: asNullableString( raw.entrySlug ),
        source: asNullableString( raw.source ),
        pinned: asBoolean( raw.pinned )
    };
};

/**
 * Normalises the universe metadata.
 *
 * @param value Raw meta object.
 * @returns A complete `WikiMeta`, with defaults applied.
 * @author Claude
 */
export const normalizeMeta = ( value: unknown ): WikiMeta =>
{
    const raw = asRecord( value );

    return {
        universe: asTrimmed( raw.universe ) || "Univers sans nom",
        tagline: asTrimmed( raw.tagline ),
        description: asTrimmed( raw.description ),
        logo: normalizeImageSource( raw.logo ),
        version: asTrimmed( raw.version ) || "0.0.0",
        updatedAt: asTrimmed( raw.updatedAt ),
        featured: [ ...new Set( asStringArray( raw.featured ).map( slugify ) ) ]
    };
};

/**
 * Normalises the partial metadata carried by an overlay.
 *
 * The overlay only stores the fields that were actually edited, so this cannot
 * reuse `normalizeMeta`, which fills in defaults and would turn every absent
 * field into a local change. Unknown keys are dropped and every kept value is
 * forced to its declared type: the overlay comes from `localStorage` or from an
 * imported file, and a number where a string is expected reaches `.trim()` on
 * the very first render.
 *
 * @param value Raw meta patch.
 * @returns The recognised fields, or null when none survives.
 * @author Claude
 */
export const normalizeMetaPatch = ( value: unknown ): Partial<WikiMeta> | null =>
{
    const raw = asRecord( value );
    const patch: Partial<WikiMeta> = {};

    if ( "universe" in raw )
    {
        patch.universe = asTrimmed( raw.universe ) || "Univers sans nom";
    }
    if ( "tagline" in raw )
    {
        patch.tagline = asTrimmed( raw.tagline );
    }
    if ( "description" in raw )
    {
        patch.description = asTrimmed( raw.description );
    }
    if ( "logo" in raw )
    {
        patch.logo = normalizeImageSource( raw.logo );
    }
    if ( "version" in raw )
    {
        patch.version = asTrimmed( raw.version ) || "0.0.0";
    }
    if ( "updatedAt" in raw )
    {
        patch.updatedAt = asTrimmed( raw.updatedAt );
    }
    if ( "featured" in raw )
    {
        patch.featured = [ ...new Set( asStringArray( raw.featured ).map( slugify ) ) ];
    }

    return Object.keys( patch ).length > 0 ? patch : null;
};

/**
 * Builds an empty dataset, used before the JSON file is loaded.
 *
 * @returns An empty `Dataset`.
 * @author Claude
 */
export const emptyDataset = (): Dataset => ( {
    meta: normalizeMeta( {} ),
    categories: [],
    entries: [],
    live: []
} );

/**
 * Builds an empty overlay, used when no local change exists yet.
 *
 * @returns An empty `Overlay`.
 * @author Claude
 */
export const emptyOverlay = (): Overlay => ( {
    version: 1,
    entries: {},
    categories: {},
    live: {},
    deleted: { entries: [], categories: [], live: [] },
    meta: null
} );

/**
 * Normalises a whole dataset, whatever shape the JSON actually has.
 *
 * @param value Parsed JSON.
 * @returns A usable `Dataset`.
 * @author Claude
 */
export const normalizeDataset = ( value: unknown ): Dataset =>
{
    const raw = asRecord( value );

    return {
        meta: normalizeMeta( raw.meta ),
        categories: ( Array.isArray( raw.categories ) ? raw.categories : [] ).map( normalizeCategory ),
        entries: ( Array.isArray( raw.entries ) ? raw.entries : [] ).map( normalizeEntry ),
        live: ( Array.isArray( raw.live ) ? raw.live : [] ).map( normalizeLiveEntry )
    };
};

/**
 * Normalises an overlay read from `localStorage`.
 *
 * @param value Parsed JSON.
 * @returns A usable `Overlay`.
 * @author Claude
 */
export const normalizeOverlay = ( value: unknown ): Overlay =>
{
    const raw = asRecord( value );
    const deleted = asRecord( raw.deleted );
    const overlay = emptyOverlay();

    for ( const entry of Object.values( asRecord( raw.entries ) ) )
    {
        const normalized = normalizeEntry( entry );
        overlay.entries[ normalized.id ] = normalized;
    }
    for ( const category of Object.values( asRecord( raw.categories ) ) )
    {
        const normalized = normalizeCategory( category );
        overlay.categories[ normalized.slug ] = normalized;
    }
    for ( const item of Object.values( asRecord( raw.live ) ) )
    {
        const normalized = normalizeLiveEntry( item );
        overlay.live[ normalized.id ] = normalized;
    }

    overlay.deleted = {
        entries: asStringArray( deleted.entries ),
        categories: asStringArray( deleted.categories ),
        live: asStringArray( deleted.live )
    };
    overlay.meta = normalizeMetaPatch( raw.meta );

    return overlay;
};

/**
 * Applies the local overlay on top of the dataset loaded from JSON.
 *
 * Upserts replace the seed item sharing their identifier, deletions remove it,
 * and anything untouched is left as published.
 *
 * @param seed Seed dataset, currently always empty in the absence of a backend.
 * @param overlay Local changes.
 * @returns The dataset actually displayed by the site.
 * @author Claude
 */
export const mergeDataset = ( seed: Dataset, overlay: Overlay ): Dataset =>
{
    const deletedEntries = new Set( overlay.deleted.entries );
    const deletedCategories = new Set( overlay.deleted.categories );
    const deletedLive = new Set( overlay.deleted.live );

    return {
        meta: { ...seed.meta, ...overlay.meta },
        categories: [
            ...seed.categories.filter(
                ( category ) => !deletedCategories.has( category.slug ) && !( category.slug in overlay.categories )
            ),
            ...Object.values( overlay.categories ).filter( ( category ) => !deletedCategories.has( category.slug ) )
        ],
        entries: [
            ...seed.entries.filter( ( entry ) => !deletedEntries.has( entry.id ) && !( entry.id in overlay.entries ) ),
            ...Object.values( overlay.entries ).filter( ( entry ) => !deletedEntries.has( entry.id ) )
        ],
        live: [
            ...seed.live.filter( ( item ) => !deletedLive.has( item.id ) && !( item.id in overlay.live ) ),
            ...Object.values( overlay.live ).filter( ( item ) => !deletedLive.has( item.id ) )
        ]
    };
};

/**
 * Copies a record without one of its keys.
 *
 * Preferred over `delete record[ key ]`, which reads as a mutation of an
 * arbitrary key and is rejected by the lint rules.
 *
 * @param record Record to copy.
 * @param key Key to leave out.
 * @returns A copy without that key.
 * @author Claude
 */
export const withoutKey = <T>( record: Record<string, T>, key: string ): Record<string, T> =>
    Object.fromEntries( Object.entries( record ).filter( ( [ candidate ] ) => candidate !== key ) );

/**
 * Counts the local changes waiting to be exported.
 *
 * @param overlay Local changes.
 * @returns The number of created, edited or deleted items.
 * @author Claude
 */
export const countOverlayChanges = ( overlay: Overlay ): number =>
    Object.keys( overlay.entries ).length
    + Object.keys( overlay.categories ).length
    + Object.keys( overlay.live ).length
    + overlay.deleted.entries.length
    + overlay.deleted.categories.length
    + overlay.deleted.live.length
    + ( overlay.meta ? 1 : 0 );

/**
 * Copies an overlay, detaching it from any reactive proxy.
 *
 * @param overlay Overlay to copy.
 * @returns An independent copy.
 * @author Claude
 */
const cloneOverlay = ( overlay: Overlay ): Overlay => normalizeOverlay( structuredClone( overlay ) );

/**
 * Turns an imported dataset into an overlay.
 *
 * In `fusionner` mode the import is layered on top of the changes already made
 * in this browser, which are therefore preserved. In `remplacer` mode the
 * overlay is rebuilt from the import alone, and the published items missing
 * from it are marked as deleted, so the site shows exactly what was imported.
 *
 * An imported item that had been deleted locally comes back: re-importing it is
 * an explicit intent that outweighs the earlier deletion.
 *
 * @param seed Dataset loaded from JSON.
 * @param imported Dataset read from the imported file.
 * @param mode Import strategy.
 * @param current Overlay currently stored, kept in `fusionner` mode.
 * @returns The overlay to store.
 * @author Claude
 */
export const buildImportOverlay = (
    seed: Dataset,
    imported: Dataset,
    mode: "fusionner" | "remplacer",
    current: Overlay = emptyOverlay()
): Overlay =>
{
    const overlay = mode === "fusionner" ? cloneOverlay( current ) : emptyOverlay();

    for ( const entry of imported.entries )
    {
        overlay.entries[ entry.id ] = entry;
    }
    for ( const category of imported.categories )
    {
        overlay.categories[ category.slug ] = category;
    }
    for ( const item of imported.live )
    {
        overlay.live[ item.id ] = item;
    }
    overlay.meta = imported.meta;

    if ( mode === "remplacer" )
    {
        overlay.deleted = {
            entries: seed.entries.filter( ( entry ) => !( entry.id in overlay.entries ) ).map( ( entry ) => entry.id ),
            categories: seed.categories
                .filter( ( category ) => !( category.slug in overlay.categories ) )
                .map( ( category ) => category.slug ),
            live: seed.live.filter( ( item ) => !( item.id in overlay.live ) ).map( ( item ) => item.id )
        };

        return overlay;
    }

    const importedEntries = new Set( imported.entries.map( ( entry ) => entry.id ) );
    const importedCategories = new Set( imported.categories.map( ( category ) => category.slug ) );
    const importedLive = new Set( imported.live.map( ( item ) => item.id ) );

    overlay.deleted = {
        entries: overlay.deleted.entries.filter( ( id ) => !importedEntries.has( id ) ),
        categories: overlay.deleted.categories.filter( ( slug ) => !importedCategories.has( slug ) ),
        live: overlay.deleted.live.filter( ( id ) => !importedLive.has( id ) )
    };

    return overlay;
};
