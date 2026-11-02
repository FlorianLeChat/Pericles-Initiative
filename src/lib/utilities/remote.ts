/**
 * Transport for the optional remote snapshot service.
 *
 * The contract implemented here is described in `README.md`, at the root of the
 * repository: two endpoints, a whole dataset per transfer, and a server that
 * stores bytes rather than understanding them. Node-RED is only one possible
 * implementation, so nothing in this module assumes anything about the server
 * beyond that document. An object of an S3 compatible bucket honours the same
 * contract on its own once `./s3` has signed the request: `GET` and `PUT` on one
 * url, an `ETag`, and `If-Match` turning a concurrent write into a `412`.
 *
 * This is the only module in the project that performs network requests, and it
 * holds no state: the configuration is passed in, the caller decides when to
 * fire. A snapshot read from the service is untrusted input, exactly like an
 * imported file, so it always goes through `normalizeDataset`.
 *
 * @author Claude
 */

import { asBoolean, asNullableString, asRecord, asTrimmed, normalizeDataset } from "./dataset";
import type { RemoteConfig, RemoteFailure, RemoteKind, RemoteSnapshot, S3Config } from "#lib/types.ts";
import { DEFAULT_S3_KEY, isUsableS3Config, s3ObjectUrl, signS3Request, type SignedRequest } from "./s3";

/** Path appended to the configured base url, per the contract. */
const DATASET_PATH = "dataset";

/** Header carrying the shared secret. Never sent when the secret is empty. */
export const SECRET_HEADER = "X-Pericles-Secret";

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
    [ 412, "conflict" ],
    [ 501, "unsupported" ]
] );

/**
 * Code S3 puts in the body of a `404` when the bucket itself is missing.
 *
 * On a read, the same status otherwise means the object is not there yet, which
 * is a legitimate state, while a missing bucket is a mistake in the form.
 */
const NO_SUCH_BUCKET = "<Code>NoSuchBucket</Code>";

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
 * Builds an empty bucket location, the bucket named in the path as most providers expect.
 *
 * @returns An `S3Config` with no bucket and no key.
 * @author Claude
 */
export const emptyS3Config = (): S3Config => ( {
    endpoint: "",
    region: "",
    bucket: "",
    key: DEFAULT_S3_KEY,
    accessKeyId: "",
    secretAccessKey: "",
    pathStyle: true
} );

/**
 * Builds an unconfigured connection, which is what an absent key degrades into.
 *
 * @returns A `RemoteConfig` with no endpoint, meaning the site works from the overlay alone.
 * @author Claude
 */
export const emptyRemoteConfig = (): RemoteConfig => ( {
    kind: "api",
    baseUrl: "",
    secret: "",
    s3: emptyS3Config(),
    revision: null,
    autoPush: false,
    lastPulledAt: null,
    lastPushedAt: null,
    syncedChange: null,
    syncedRemote: null
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
    const s3 = asRecord( raw.s3 );
    const empty = emptyS3Config();

    return {
        // A connection stored before S3 existed carries no kind, and one stored before
        // the rename carries `serveur`: both reached an API.
        kind: raw.kind === "s3" ? "s3" : "api",
        baseUrl: asTrimmed( raw.baseUrl ),
        secret: asTrimmed( raw.secret ),
        s3: {
            endpoint: asTrimmed( s3.endpoint ),
            region: asTrimmed( s3.region ),
            bucket: asTrimmed( s3.bucket ),
            key: asTrimmed( s3.key ) || empty.key,
            accessKeyId: asTrimmed( s3.accessKeyId ),
            secretAccessKey: asTrimmed( s3.secretAccessKey ),
            pathStyle: asBoolean( s3.pathStyle, empty.pathStyle )
        },
        revision: asNullableString( raw.revision ),
        autoPush: asBoolean( raw.autoPush ),
        lastPulledAt: asNullableString( raw.lastPulledAt ),
        lastPushedAt: asNullableString( raw.lastPushedAt ),
        syncedChange: asNullableString( raw.syncedChange ),
        syncedRemote: asNullableString( raw.syncedRemote )
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
 * Writes the CORS headers the API answers with, `OPTIONS` included, for this site to reach it.
 *
 * Built from the headers this module sends, so the example shown to the reader
 * cannot drift from the requests it describes.
 *
 * @param origin Origin of this site, the only one allowed.
 * @returns One header per line, ready to paste into a server configuration.
 * @author Claude
 */
export const apiCorsHeaders = ( origin: string ): string => [
    `Access-Control-Allow-Origin: ${ origin }`,
    "Access-Control-Allow-Methods: GET, PUT, OPTIONS",
    `Access-Control-Allow-Headers: Content-Type, If-Match, ${ SECRET_HEADER }`,
    "Access-Control-Expose-Headers: ETag"
].join( "\n" );

/**
 * Tells whether a connection leads somewhere, whichever its destination.
 *
 * @param config Connection as stored or as typed.
 * @returns True when a request could be built from it.
 * @author Claude
 */
export const isUsableRemoteConfig = ( config: Pick<RemoteConfig, "kind" | "baseUrl" | "s3"> ): boolean =>
    config.kind === "s3" ? isUsableS3Config( config.s3 ) : isUsableBaseUrl( config.baseUrl );

/**
 * Names the snapshot a connection reads and writes, so a move to another one can be noticed.
 *
 * The keys and the secret are left out: changing them reaches the same
 * snapshot, and the revision known for it stays valid.
 *
 * @param config Connection as stored or as typed.
 * @returns The destination and the location of the snapshot.
 * @author Claude
 */
export const remoteTarget = ( config: Pick<RemoteConfig, "kind" | "baseUrl" | "s3"> ): string =>
    config.kind === "s3"
        ? `s3 ${ config.s3.region.trim() } ${ s3ObjectUrl( config.s3 ) }`
        : `api ${ config.baseUrl.trim() }`;

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
 * The `changedAt` stamp sits beside the dataset in the exported file, so it is
 * read from the dataset itself, whichever shape wraps it. The envelope's
 * `updatedAt` is only a fallback: it says when the server stored the bytes,
 * not when their content last moved.
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
    const content = enveloped ? asRecord( raw.dataset ) : raw;
    const storedAt = enveloped ? asNullableString( raw.updatedAt ) : null;

    return {
        dataset: normalizeDataset( content ),
        revision,
        changedAt: asNullableString( content.changedAt ) ?? storedAt
    };
};

/**
 * Builds the url and the headers of a request, for either destination.
 *
 * A server receives the secret when there is one; a bucket receives a signature
 * covering every header, so the two only share the headers of the contract.
 *
 * @param config Connection to the service.
 * @param method `GET` to read the snapshot, `PUT` to replace it.
 * @param extra Headers specific to the request.
 * @param body Body of a write.
 * @returns The url to call and the headers to send.
 * @throws {RemoteError} With kind `network` when the connection is unusable.
 * @author Claude
 */
const prepare = async (
    config: RemoteConfig,
    method: "GET" | "PUT",
    extra: Record<string, string>,
    body?: string
): Promise<SignedRequest> =>
{
    if ( config.kind === "s3" )
    {
        if ( !isUsableS3Config( config.s3 ) )
        {
            throw new RemoteError( "network", "Incomplete S3 connection." );
        }

        return signS3Request( config.s3, method, extra, body );
    }

    const secret = config.secret.trim();

    return {
        url: datasetEndpoint( config.baseUrl ),
        headers: { ...extra, ...( secret ? { [ SECRET_HEADER ]: secret } : {} ) }
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
 * Maps a failed read to its cause, telling a missing bucket from a missing object.
 *
 * @param kind Destination that answered.
 * @param response The failed response, whose body is only read for a bucket.
 * @returns The matching cause.
 * @author Claude
 */
const readFailureOf = async ( kind: RemoteKind, response: Response ): Promise<RemoteFailure> =>
{
    const bucketChecked = kind === "s3" && response.status === 404;
    const bucketMissing = bucketChecked && ( await response.text() ).includes( NO_SUCH_BUCKET );

    return bucketMissing ? "unsupported" : failureOf( response.status, "missing" );
};

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
    const { url: endpoint, headers } = await prepare( config, "GET", { Accept: "application/json" } );
    const response = await request( endpoint, { method: "GET", headers, cache: "no-store" } );

    if ( !response.ok )
    {
        throw new RemoteError(
            await readFailureOf( config.kind, response ),
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
    const revision = conditional ? config.revision : null;
    const { url: endpoint, headers } = await prepare(
        config,
        "PUT",
        { "Content-Type": "application/json", ...( revision ? { "If-Match": revision } : {} ) },
        json
    );
    const response = await request( endpoint, { method: "PUT", headers, body: json } );

    if ( !response.ok )
    {
        throw new RemoteError(
            failureOf( response.status, "unsupported" ),
            `PUT ${ endpoint } answered ${ response.status }.`
        );
    }

    return response.headers.get( "ETag" );
};
