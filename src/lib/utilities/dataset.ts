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
import { SEVERITY_IDS } from "$lib/config/severities";
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

const DEFAULT_COLOR = "pierre";

/** Distinguishes the identifiers minted within the same millisecond by the fallback below. */
let mintedIds = 0;

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

    mintedIds += 1;

    return `id-${ Date.now().toString( 36 ) }-${ mintedIds.toString( 36 ) }`;
};

/**
 * Reads a value as an object, so unknown keys can be inspected safely.
 *
 * Exported because the remote configuration in `src/lib/utilities/remote.ts`
 * normalises the same kind of untrusted JSON, and both must judge a malformed
 * value identically.
 *
 * @param value Parsed JSON of any shape.
 * @returns The value as a record, or an empty one when it is not an object.
 * @author Claude
 */
export const asRecord = ( value: unknown ): Record<string, unknown> =>
    typeof value === "object" && value !== null ? ( value as Record<string, unknown> ) : {};

const asString = ( value: unknown, fallback = "" ): string => ( typeof value === "string" ? value : fallback );

/**
 * Reads a value as a trimmed string.
 *
 * @param value Parsed JSON of any shape.
 * @param fallback Value used when it is not a string.
 * @returns The trimmed string.
 * @author Claude
 */
export const asTrimmed = ( value: unknown, fallback = "" ): string => asString( value, fallback ).trim();

const asStringArray = ( value: unknown ): string[] =>
    Array.isArray( value ) ? value.filter( ( item ): item is string => typeof item === "string" ) : [];

/**
 * Reads a value as a boolean, falling back when it is anything else.
 *
 * @param value Parsed JSON of any shape.
 * @param fallback Value to use when it is not a boolean.
 * @returns The boolean to store.
 * @author Claude
 */
export const asBoolean = ( value: unknown, fallback = false ): boolean =>
    ( typeof value === "boolean" ? value : fallback );

/**
 * Reads a value as a non empty trimmed string, or null.
 *
 * @param value Parsed JSON of any shape.
 * @returns The trimmed string, or null when it is empty or not a string.
 * @author Claude
 */
export const asNullableString = ( value: unknown ): string | null =>
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
        severity: SEVERITY_IDS.includes( severity ) ? severity : "info",
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
    meta: null,
    changedAt: null
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
    overlay.changedAt = asNullableString( raw.changedAt );

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
 * Counts the items the overlay holds.
 *
 * With an empty seed the overlay is not a delta but the whole content of the
 * wiki, so this is a count of what this browser stores, not of changes pending
 * anything. Deletions are counted too: a recorded deletion is one more thing
 * this browser knows and a backup does not.
 *
 * @param overlay Content stored in this browser.
 * @returns The number of stored or deleted items, the wiki identity included.
 * @author Claude
 */
export const countOverlayItems = ( overlay: Overlay ): number =>
    Object.keys( overlay.entries ).length
    + Object.keys( overlay.categories ).length
    + Object.keys( overlay.live ).length
    + overlay.deleted.entries.length
    + overlay.deleted.categories.length
    + overlay.deleted.live.length
    + ( overlay.meta ? 1 : 0 );

/**
 * Turns an imported dataset into an overlay.
 *
 * An import is complete and replaces everything: the overlay is rebuilt from the
 * import alone, so whatever this browser held and the import does not mention is
 * gone. Seed items missing from the import are marked as deleted, which is what
 * makes the site show exactly what was imported once a backend feeds a seed.
 *
 * There is deliberately no merging mode. Combining two datasets means deciding
 * which of two independently created pages wins, and nothing in the data answers
 * that: identifiers are minted per browser, so the same page authored twice has
 * two of them and no shared history. A complete export and a complete import are
 * a pair a reader can reason about.
 *
 * @param seed Dataset loaded from JSON, currently always empty.
 * @param imported Dataset read from the imported file or from the backup service.
 * @returns The overlay to store.
 * @author Claude
 */
export const buildImportOverlay = ( seed: Dataset, imported: Dataset ): Overlay =>
{
    const overlay = emptyOverlay();

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

    overlay.deleted = {
        entries: seed.entries.filter( ( entry ) => !( entry.id in overlay.entries ) ).map( ( entry ) => entry.id ),
        categories: seed.categories
            .filter( ( category ) => !( category.slug in overlay.categories ) )
            .map( ( category ) => category.slug ),
        live: seed.live.filter( ( item ) => !( item.id in overlay.live ) ).map( ( item ) => item.id )
    };

    return overlay;
};
