/**
 * Transport for the optional remote snapshot service.
 *
 * The contract implemented here is specified in `REMOTE-API.md`, at the root of
 * the repository: two endpoints, a whole dataset per transfer, and a server that
 * stores bytes rather than understanding them. Node-RED is only one possible
 * implementation, so nothing in this module assumes anything about the server
 * beyond that document.
 *
 * This is the only module in the project that performs network requests, and it
 * holds no state: the configuration is passed in, the caller decides when to
 * fire. A snapshot read from the service is untrusted input, exactly like an
 * imported file, so it always goes through `normalizeDataset`.
 *
 * @author Claude
 */

import type { RemoteConfig, RemoteFailure, RemoteSnapshot } from "$lib/types";
import { asNullableString, asRecord, asTrimmed, normalizeDataset } from "./dataset";

/** Path appended to the configured base url, per the contract. */
const DATASET_PATH = "dataset";

/** Header carrying the shared secret. Never sent when the secret is empty. */
const SECRET_HEADER = "X-Pericles-Secret";

/** How long a request may take before it is abandoned, in milliseconds. */
const REQUEST_TIMEOUT = 15_000;

/** Schemes an endpoint may use. A backup target is always absolute and HTTP. */
const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set( [ "http:", "https:" ] );

/**
 * Status codes the contract gives the same meaning to whatever the method.
 *
 * Anything else that is not a success is reported as a server failure, since
 * there is nothing useful the reader could do differently about it.
 */
const FAILURE_BY_STATUS: ReadonlyMap<number, RemoteFailure> = new Map( [
    [ 401, "refused" ],
    [ 403, "refused" ],
    [ 405, "unsupported" ],
    [ 412, "conflict" ]
] );

/**
 * A remote request that did not succeed, carrying a machine readable cause.
 *
 * The `message` is technical and meant for a developer console. The sentence the
 * reader sees is derived from `kind` by the component that displays it, which is
 * how this project avoids a message catalogue for its single language.
 *
 * @author Claude
 */
export class RemoteError extends Error
{
    /** Why the request failed, as one of the documented causes. */
    readonly kind: RemoteFailure;

    /**
     * @param kind Documented cause of the failure.
     * @param message Technical detail, in English, for logs.
     * @author Claude
     */
    constructor( kind: RemoteFailure, message: string )
    {
        super( message );

        this.name = "RemoteError";
        this.kind = kind;
    }
}

/**
 * Builds an unconfigured connection, which is what an absent key degrades into.
 *
 * @returns A `RemoteConfig` with no endpoint, meaning the site works from the overlay alone.
 * @author Claude
 */
export const emptyRemoteConfig = (): RemoteConfig => ( {
    baseUrl: "",
    secret: "",
    revision: null,
    lastPulledAt: null,
    lastPushedAt: null,
    syncedChange: null
} );

/**
 * Normalises a connection read from `localStorage`.
 *
 * A missing key, a truncated write or a hand edited value must all degrade into
 * an unconfigured connection rather than throw, since this runs on the very
 * first paint of the data page.
 *
 * @param value Parsed JSON of any shape.
 * @returns A usable `RemoteConfig`.
 * @author Claude
 */
export const normalizeRemoteConfig = ( value: unknown ): RemoteConfig =>
{
    const raw = asRecord( value );

    return {
        baseUrl: asTrimmed( raw.baseUrl ),
        secret: asTrimmed( raw.secret ),
        revision: asNullableString( raw.revision ),
        lastPulledAt: asNullableString( raw.lastPulledAt ),
        lastPushedAt: asNullableString( raw.lastPushedAt ),
        syncedChange: asNullableString( raw.syncedChange )
    };
};

/**
 * Tells whether a base url can be turned into an endpoint.
 *
 * Kept separate from `datasetEndpoint` so the form can disable its buttons
 * before anything is attempted, rather than reporting a failure that never left
 * the browser.
 *
 * @param baseUrl Value typed by the user.
 * @returns True when it is an absolute http or https url.
 * @author Claude
 */
export const isUsableBaseUrl = ( baseUrl: string ): boolean =>
{
    const trimmed = baseUrl.trim();
    if ( trimmed === "" )
    {
        return false;
    }

    try
    {
        return ALLOWED_PROTOCOLS.has( new URL( trimmed ).protocol );
    }
    catch
    {
        return false;
    }
};

/**
 * Removes the trailing slashes of a base url, so the path is joined exactly once.
 *
 * A regular expression would read better, but `/\/+$/` backtracks: on a run of
 * slashes it consumes them all, fails the anchor, gives one back and retries,
 * from every starting position, which is quadratic in the length of the run and
 * is what SonarQube reports. JavaScript has no possessive quantifier to forbid
 * that, so the scan is written by hand and stays linear.
 *
 * @param value Base url, already trimmed of its whitespace.
 * @returns The same url without a single trailing slash left.
 * @author Claude
 */
const withoutTrailingSlashes = ( value: string ): string =>
{
    let end = value.length;

    while ( end > 0 && value[ end - 1 ] === "/" )
    {
        end -= 1;
    }

    return value.slice( 0, end );
};

/**
 * Builds the dataset endpoint from a base url.
 *
 * Deliberately not `isSafeUrl` from `./url`: that function answers whether a url
 * may stay in a rendered page, and therefore accepts relative paths and
 * `mailto:`. A backup target has to be absolute and HTTP, which is a different
 * question. The url is rebuilt from what the user typed rather than from the
 * parsed value, so a path prefix survives untouched.
 *
 * @param baseUrl Configured base url.
 * @returns The absolute url of the dataset endpoint.
 * @throws {RemoteError} With kind `network` when the base url is unusable.
 * @author Claude
 */
export const datasetEndpoint = ( baseUrl: string ): string =>
{
    const trimmed = baseUrl.trim();

    if ( !isUsableBaseUrl( trimmed ) )
    {
        throw new RemoteError( "network", `Unusable base url: ${ trimmed || "(empty)" }` );
    }

    return `${ withoutTrailingSlashes( trimmed ) }/${ DATASET_PATH }`;
};

/**
 * Reads a snapshot payload, in either of the two accepted shapes.
 *
 * A bare dataset is what a statically served JSON file produces, an envelope is
 * what a server tracking its own revisions produces. The contents always go
 * through `normalizeDataset`: this is the boundary where an untrusted document
 * becomes a dataset.
 *
 * Only the `ETag` header can be replayed as `If-Match`, so the envelope's own
 * `revision` field is informational and is not used for conditional writes.
 *
 * @param payload Parsed JSON body.
 * @param revision `ETag` of the response, when the server sent one.
 * @returns The normalised snapshot.
 * @author Claude
 */
export const parseSnapshot = ( payload: unknown, revision: string | null ): RemoteSnapshot =>
{
    const raw = asRecord( payload );
    const enveloped = typeof raw.dataset === "object" && raw.dataset !== null;

    return {
        dataset: normalizeDataset( enveloped ? raw.dataset : raw ),
        revision,
        updatedAt: enveloped ? asNullableString( raw.updatedAt ) : null
    };
};

/**
 * Assembles the request headers, adding the secret only when there is one.
 *
 * @param config Connection to the service.
 * @param extra Headers specific to the request.
 * @returns The headers to send.
 * @author Claude
 */
const buildHeaders = ( config: RemoteConfig, extra: Record<string, string> ): Record<string, string> =>
{
    const secret = config.secret.trim();

    return {
        ...extra,
        ...( secret ? { [ SECRET_HEADER ]: secret } : {} )
    };
};

/**
 * Performs a request, turning any transport level failure into a `RemoteError`.
 *
 * @param endpoint Absolute url to call.
 * @param init Request options, without the timeout.
 * @returns The response, whatever its status.
 * @throws {RemoteError} With kind `network` when the request never completed.
 * @author Claude
 */
const request = async ( endpoint: string, init: RequestInit ): Promise<Response> =>
{
    try
    {
        return await fetch( endpoint, { ...init, signal: AbortSignal.timeout( REQUEST_TIMEOUT ) } );
    }
    catch ( error )
    {
        // A browser cannot tell a refused CORS preflight from an unreachable host:
        // both reject with no status at all, so both are reported as a network
        // failure and the message points at the two of them.
        throw new RemoteError( "network", `Request to ${ endpoint } never completed: ${ String( error ) }` );
    }
};

/**
 * Maps a failed response to the documented cause.
 *
 * `404` is the one status whose meaning depends on the method. On a read it means
 * the service simply holds no snapshot yet, which is a legitimate state. On a
 * write it cannot mean that: a service asked to create a resource has no business
 * reporting that the resource is missing, so the route itself is what is absent.
 * Reporting both the same way told the reader there was no backup at the exact
 * moment they were trying to create one.
 *
 * @param status HTTP status of the response.
 * @param notFound Cause to use for a `404`, which differs between reading and writing.
 * @returns The matching cause.
 * @author Claude
 */
const failureOf = ( status: number, notFound: RemoteFailure ): RemoteFailure =>
    status === 404 ? notFound : ( FAILURE_BY_STATUS.get( status ) ?? "server" );

/**
 * Fetches the snapshot currently stored by the service.
 *
 * The body is read as text before being parsed, so an HTML error page served by
 * a misconfigured proxy is reported as unreadable rather than as a mysterious
 * empty dataset.
 *
 * @param config Connection to the service.
 * @returns The normalised snapshot.
 * @throws {RemoteError} On any transport, status or parsing failure. Kind `missing` means the
 *         service simply holds no snapshot yet, which is a legitimate state.
 * @author Claude
 */
export const readRemoteSnapshot = async ( config: RemoteConfig ): Promise<RemoteSnapshot> =>
{
    const endpoint = datasetEndpoint( config.baseUrl );
    const response = await request( endpoint, {
        method: "GET",
        headers: buildHeaders( config, { Accept: "application/json" } ),
        cache: "no-store"
    } );

    if ( !response.ok )
    {
        throw new RemoteError(
            failureOf( response.status, "missing" ),
            `GET ${ endpoint } answered ${ response.status }.`
        );
    }

    const text = await response.text();
    let payload: unknown;

    try
    {
        payload = JSON.parse( text );
    }
    catch ( error )
    {
        throw new RemoteError( "unreadable", `GET ${ endpoint } did not return JSON: ${ String( error ) }` );
    }

    const isObject = typeof payload === "object" && payload !== null && !Array.isArray( payload );

    if ( !isObject )
    {
        throw new RemoteError( "unreadable", `GET ${ endpoint } returned JSON that is not an object.` );
    }

    return parseSnapshot( payload, response.headers.get( "ETag" ) );
};

/**
 * Replaces the snapshot stored by the service.
 *
 * The body is the export as it stands, so the service receives exactly the file
 * the download button produces.
 *
 * @param config Connection to the service.
 * @param json Serialised dataset, as returned by `WikiStore.exportJson`.
 * @param conditional Whether the known revision is replayed as `If-Match`, which turns a concurrent
 *        change into a `conflict` rather than an overwrite. False forces the write.
 * @returns The new revision, when the service reported one.
 * @throws {RemoteError} On any transport or status failure. Kind `conflict` means the stored snapshot
 *         changed since it was last read.
 * @author Claude
 */
export const writeRemoteSnapshot = async (
    config: RemoteConfig,
    json: string,
    conditional = true
): Promise<string | null> =>
{
    const endpoint = datasetEndpoint( config.baseUrl );
    const revision = conditional ? config.revision : null;
    const response = await request( endpoint, {
        method: "PUT",
        headers: buildHeaders( config, {
            "Content-Type": "application/json",
            ...( revision ? { "If-Match": revision } : {} )
        } ),
        body: json
    } );

    if ( !response.ok )
    {
        throw new RemoteError(
            failureOf( response.status, "unsupported" ),
            `PUT ${ endpoint } answered ${ response.status }.`
        );
    }

    return response.headers.get( "ETag" );
};
