/**
 * Requests to an S3 compatible bucket, signed in the browser.
 *
 * The site has no server to hold a key on its behalf, so the reader's own key
 * signs each request here, with Signature Version 4 computed through Web Crypto.
 * The AWS SDK does the same thing at several times the weight of the whole
 * application, for two requests on one object, which is why it is not used.
 *
 * Nothing in this module reads the wiki or the network: it turns a connection
 * and a request into a url and its headers, and builds the two documents the
 * reader copies into their bucket, the CORS rule and the access policy.
 *
 * @author Claude
 */

import type { S3Config } from "#lib/types.ts";

/** Algorithm named in the signature, the only one S3 accepts for SigV4. */
const ALGORITHM = "AWS4-HMAC-SHA256";

/** Service name the signature is scoped to. */
const SERVICE = "s3";

/** Hash of an empty body, sent by every request that carries none. */
const EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/** Schemes an endpoint may use. */
const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set( [ "http:", "https:" ] );

/** Default key of the object, when the reader leaves the field empty. */
export const DEFAULT_S3_KEY = "pericles/wiki.json";

/**
 * Characters `encodeURIComponent` leaves alone and RFC 3986 does not.
 *
 * SigV4 encodes every character outside the unreserved set, so a key holding one
 * of these would be signed with one spelling and sent with another.
 */
const RESERVED_BY_RFC3986 = /[!'()*]/g;

/** Separators stripped from the compact ISO timestamp SigV4 expects. */
const TIMESTAMP_SEPARATORS = /[-:]|\.\d{3}/g;

/**
 * An array holding no array and no object, as `JSON.stringify` indents it over several lines.
 *
 * Matched to set it on one line: a CORS rule lists its methods and headers one per
 * line otherwise, and the document stands three times as tall as what it says.
 */
const PLAIN_ARRAY = /\[\n([^[\]{}]*)\n\s*\]/g;

/**
 * Indents a document for display and copying, its lists of plain values kept on one line.
 *
 * @param value Document to write.
 * @returns The JSON, still valid, indented by two spaces.
 * @author Claude
 */
const formatDocument = ( value: unknown ): string =>
    JSON.stringify( value, null, 2 ).replace(
        PLAIN_ARRAY,
        ( _match, items: string ) => `[ ${ items.split( "\n" ).map( ( item ) => item.trim() ).join( " " ) } ]`
    );

/** A request ready to be handed to `fetch`. */
export interface SignedRequest {
    url: string;
    headers: Record<string, string>;
}

/**
 * Encodes one segment of a path the way SigV4 expects.
 *
 * @param segment Raw segment, never containing a slash.
 * @returns The segment, percent encoded outside the unreserved set.
 * @author Claude
 */
const encodeSegment = ( segment: string ): string =>
    encodeURIComponent( segment ).replace(
        RESERVED_BY_RFC3986,
        ( character ) => `%${ character.charCodeAt( 0 ).toString( 16 ).toUpperCase() }`
    );

/**
 * Encodes an object key as a path, keeping its slashes.
 *
 * @param key Key of the object.
 * @returns The encoded path, without a leading slash.
 * @author Claude
 */
const encodeKey = ( key: string ): string => key.split( "/" ).map( encodeSegment ).join( "/" );

/**
 * Trims the key and drops its leading slashes, which S3 would keep as part of the name.
 *
 * @param key Key as typed.
 * @returns The key as stored, or the default one when empty.
 * @author Claude
 */
const cleanKey = ( key: string ): string =>
{
    let start = 0;
    const trimmed = key.trim();

    while ( trimmed[ start ] === "/" )
    {
        start += 1;
    }

    return trimmed.slice( start ) || DEFAULT_S3_KEY;
};

/**
 * Origin of the service a connection reaches, Amazon S3 itself when no endpoint is given.
 *
 * @param config Location of the snapshot.
 * @returns An origin without a trailing slash, or null when the endpoint is not a usable url.
 * @author Claude
 */
const originOf = ( config: S3Config ): URL | null =>
{
    const endpoint = config.endpoint.trim() || `https://s3.${ config.region.trim() }.amazonaws.com`;

    try
    {
        const url = new URL( endpoint );

        return ALLOWED_PROTOCOLS.has( url.protocol ) ? url : null;
    }
    catch
    {
        return null;
    }
};

/**
 * Tells whether a connection holds everything a signed request needs.
 *
 * @param config Location of the snapshot and its key.
 * @returns True when the bucket, the region, the key and a usable endpoint are all there.
 * @author Claude
 */
export const isUsableS3Config = ( config: S3Config ): boolean =>
{
    const filled = [ config.region, config.bucket, config.accessKeyId, config.secretAccessKey ]
        .every( ( value ) => value.trim() !== "" );

    return filled && originOf( config ) !== null;
};

/**
 * Builds the url of the object, the bucket in the path or in the host name.
 *
 * @param config Location of the snapshot.
 * @returns The absolute url of the object, or an empty string when the endpoint is unusable.
 * @author Claude
 */
export const s3ObjectUrl = ( config: S3Config ): string =>
{
    const origin = originOf( config );

    if ( !origin )
    {
        return "";
    }

    const bucket = config.bucket.trim();
    const path = encodeKey( cleanKey( config.key ) );

    return config.pathStyle
        ? `${ origin.protocol }//${ origin.host }/${ encodeSegment( bucket ) }/${ path }`
        : `${ origin.protocol }//${ bucket }.${ origin.host }/${ path }`;
};

/**
 * Turns bytes into lowercase hexadecimal.
 *
 * @param buffer Bytes to print.
 * @returns Two characters per byte.
 * @author Claude
 */
const toHex = ( buffer: ArrayBuffer ): string =>
    [ ...new Uint8Array( buffer ) ].map( ( byte ) => byte.toString( 16 ).padStart( 2, "0" ) ).join( "" );

/**
 * Hashes a text with SHA-256.
 *
 * @param text Text to hash, as UTF-8.
 * @returns The hash, in hexadecimal.
 * @author Claude
 */
const sha256 = async ( text: string ): Promise<string> =>
    toHex( await crypto.subtle.digest( "SHA-256", new TextEncoder().encode( text ) ) );

/**
 * Computes an HMAC-SHA256.
 *
 * @param key Raw key bytes.
 * @param text Message, as UTF-8.
 * @returns The raw signature.
 * @author Claude
 */
const hmac = async ( key: BufferSource, text: string ): Promise<ArrayBuffer> =>
{
    const imported = await crypto.subtle.importKey( "raw", key, { name: "HMAC", hash: "SHA-256" }, false, [ "sign" ] );

    return crypto.subtle.sign( "HMAC", imported, new TextEncoder().encode( text ) );
};

/**
 * Signs a request with SigV4, every header given being part of the signature.
 *
 * Kept apart from `signS3Request` and generic over the headers, so it can be held
 * against the reference examples of the AWS documentation, which sign headers
 * this site never sends.
 *
 * @param input The request: method, absolute url, headers to sign, hash of the body.
 * @param config Region and key to sign with.
 * @param now Moment of the signature, which S3 refuses fifteen minutes away from its own clock.
 * @returns The headers to send, `Authorization`, `x-amz-date` and `x-amz-content-sha256` included.
 * @author Claude
 */
const signRequest = async (
    input: { method: string; url: string; headers: Record<string, string>; payloadHash: string },
    config: Pick<S3Config, "region" | "accessKeyId" | "secretAccessKey">,
    now: Date
): Promise<Record<string, string>> =>
{
    const url = new URL( input.url );
    const stamp = now.toISOString().replace( TIMESTAMP_SEPARATORS, "" );
    const day = stamp.slice( 0, 8 );
    const region = config.region.trim();
    const scope = `${ day }/${ region }/${ SERVICE }/aws4_request`;

    const headers: Record<string, string> = {
        ...input.headers,
        "x-amz-content-sha256": input.payloadHash,
        "x-amz-date": stamp
    };

    // The browser sets `Host` itself and forbids a script from doing it, but the
    // signature still has to cover it, so it is signed without being sent.
    const signed: Record<string, string> = { ...headers, host: url.host };
    const names = Object.keys( signed ).map( ( name ) => name.toLowerCase() ).sort();
    const valueOf = ( name: string ): string =>
        Object.entries( signed ).find( ( [ key ] ) => key.toLowerCase() === name )?.[ 1 ].trim() ?? "";
    const canonicalHeaders = names.map( ( name ) => `${ name }:${ valueOf( name ) }\n` ).join( "" );
    const signedHeaders = names.join( ";" );

    const canonicalRequest = [
        input.method,
        url.pathname,
        url.search.slice( 1 ),
        canonicalHeaders,
        signedHeaders,
        input.payloadHash
    ].join( "\n" );

    const stringToSign = [ ALGORITHM, stamp, scope, await sha256( canonicalRequest ) ].join( "\n" );

    const dateKey = await hmac( new TextEncoder().encode( `AWS4${ config.secretAccessKey.trim() }` ), day );
    const regionKey = await hmac( dateKey, region );
    const serviceKey = await hmac( regionKey, SERVICE );
    const signingKey = await hmac( serviceKey, "aws4_request" );
    const signature = toHex( await hmac( signingKey, stringToSign ) );

    const credential = `${ config.accessKeyId.trim() }/${ scope }`;
    const authorization = `Credential=${ credential }, SignedHeaders=${ signedHeaders }, Signature=${ signature }`;

    return {
        ...headers,
        Authorization: `${ ALGORITHM } ${ authorization }`
    };
};

/**
 * Builds a signed request on the object holding the snapshot.
 *
 * @param config Location of the snapshot and its key.
 * @param method `GET` to read it, `PUT` to replace it.
 * @param headers Headers of the request, all of them signed.
 * @param body Body of a write, absent for a read.
 * @returns The url and the headers to send.
 * @author Claude
 */
export const signS3Request = async (
    config: S3Config,
    method: "GET" | "PUT",
    headers: Record<string, string>,
    body?: string
): Promise<SignedRequest> =>
{
    const url = s3ObjectUrl( config );
    const payloadHash = body === undefined ? EMPTY_HASH : await sha256( body );

    return {
        url,
        headers: await signRequest( { method, url, headers, payloadHash }, config, new Date() )
    };
};

/**
 * Writes the CORS rule the bucket needs for this site to reach it.
 *
 * In the JSON shape the AWS console, R2 and most providers accept as it is.
 *
 * @param origin Origin of this site, the only one allowed.
 * @returns The rule, indented for display and copying.
 * @author Claude
 */
export const s3CorsRule = ( origin: string ): string => formatDocument( [
    {
        AllowedOrigins: [ origin ],
        AllowedMethods: [ "GET", "PUT" ],
        AllowedHeaders: [ "authorization", "content-type", "if-match", "x-amz-content-sha256", "x-amz-date" ],
        ExposeHeaders: [ "ETag" ],
        MaxAgeSeconds: 3600
    }
] );

/**
 * Writes an IAM policy granting a key the two operations on this one object, and listing its bucket.
 *
 * Listing is the one right beyond the object, and it cannot be left out: a key
 * that may not list the bucket is answered `403` rather than `404` for an object
 * that does not exist yet, so the very first test of an empty bucket would read
 * as a refused key. It reveals the names of the other objects, which is why the
 * interface recommends a bucket kept for the wiki.
 *
 * @param config Location of the snapshot.
 * @returns The policy, indented for display and copying.
 * @author Claude
 */
export const s3AccessPolicy = ( config: S3Config ): string =>
{
    const bucket = `arn:aws:s3:::${ config.bucket.trim() }`;

    return formatDocument( {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: [ "s3:GetObject", "s3:PutObject" ],
                Resource: `${ bucket }/${ cleanKey( config.key ) }`
            },
            {
                Effect: "Allow",
                Action: "s3:ListBucket",
                Resource: bucket
            }
        ]
    } );
};
