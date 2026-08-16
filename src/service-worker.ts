/**
 * Offline shell for the site.
 *
 * The wiki was already offline capable by accident: its content lives in
 * `localStorage` and no page ever queried a server for it. What was missing was
 * surviving a reload, since the shell itself, the HTML, the chunks and the
 * stylesheets, still came from the network. This worker precaches that shell so
 * a cold start with no connection reaches the same site.
 *
 * Two rules govern what it may touch:
 *
 *  - **Cross origin requests are never intercepted.** The remote snapshot
 *    service described in `README.md` lives on another origin, and serving it
 *    a cached answer would hand the reader an old backup, or make a failed send
 *    look like a success. Backups are a network concern and stay one.
 *  - **Content is never cached here.** Pages are built in the browser from the
 *    overlay, so what this worker stores is the application, never the wiki.
 *    Clearing this cache loses nothing an author wrote.
 *
 * @author Claude
 */

import { ACTIVATE_NOW, PRECACHE_STATUS } from "$lib/config/service-worker";
import { base, build, files, prerendered, version } from "$service-worker";

// SvelteKit excludes this file from the application's `tsconfig.json`, because
// `lib.dom` and `lib.webworker` declare the same hundreds of identifiers and
// cannot sit in one program. It is checked on its own, by `tsconfig.worker.json`,
// which `npm run check` runs after `svelte-check`.
const worker = self as unknown as ServiceWorkerGlobalScope;

/** One cache per build, so activating a new worker drops the previous shell whole. */
const CACHE = `pericles-${ version }`;

/**
 * The SPA fallback, which `prerendered` does not list.
 *
 * Only ten pages are built as HTML: the listings, plus this one. Every page of
 * actual content exists solely in the overlay, so it is served by booting the
 * client router from here. Without it in the cache, the site would work offline
 * on `/wiki` and fail on `/wiki/athena-vance`, which is most of the wiki.
 */
const FALLBACK = `${ base }/200.html`;

/** Hashed assets, whose name changes whenever their content does. */
const IMMUTABLE_PREFIX = `${ base }/_app/immutable/`;

/**
 * Files SvelteKit writes into the build but leaves out of `$service-worker`.
 *
 * `_app/env.js` holds the `PUBLIC_` variables and is dynamically imported while
 * the client boots. Without it in the cache the shell still paints, since the
 * prerendered listings carry their server rendered markup, and then hydration
 * dies on the failed import: every route served through `200.html`, which is all
 * of the content, stays blank. `_app/version.json` is what the client reads to
 * notice a new deployment, and a stored copy is the right answer offline, there
 * being no new deployment to see.
 */
const GENERATED = [ `${ base }/_app/env.js`, `${ base }/_app/version.json` ];

/**
 * The whole shell for this build: chunks, stylesheets, everything under
 * `static/`, the prerendered listings, and the fallback carrying every other
 * route.
 *
 * The Milkdown editor is a lazily loaded chunk, and `build` contains it. Leaving
 * it out would give a site that reads offline but cannot be written to, which is
 * half of what an offline wiki is for.
 */
const SHELL = [ ...build, ...files, ...prerendered, FALLBACK, ...GENERATED ];

/**
 * How many files are fetched at a time while filling the cache.
 *
 * The whole shell in one go asks for two hundred and sixty odd responses at the
 * same instant, and a host answers a share of that burst with a reset rather
 * than with bytes. Which files are lost is not fixed: it is whatever the host
 * was in the middle of when the burst hit, so a different file goes missing
 * from one build to the next. Ten at a time asks less of the host at once.
 */
const BATCH = 10;

/**
 * How many times a batch is attempted before its failures are given up on.
 *
 * A local host answers everything from disk and never drops a request, which is
 * why this never showed up against `tests/e2e/utilities/host.js`. A real host
 * fronting the built site over an actual network occasionally resets one, and
 * retrying is what a browser tab does on its own for a single asset it needs;
 * the install has to do the same for every file at once, since nothing here can
 * tell in advance which one the host will drop.
 */
const ATTEMPTS = 3;

/**
 * Pauses between attempts, so whatever caused the previous one to drop a file
 * has time to pass before the next.
 *
 * @param ms Milliseconds to wait.
 * @returns Resolves once the delay is over.
 * @author Claude
 */
const wait = ( ms: number ): Promise<void> => new Promise( ( resolve ) => setTimeout( resolve, ms ) );

/**
 * Prefix on every line this worker logs, so its output is recognisable amid
 * the rest of a page's console, and greppable in a report from a reader.
 */
const LOG = "[sw]";

/**
 * Fills the cache for this build, storing what it can, a handful at a time.
 *
 * `addAll` was tried and dropped: it rejects as a whole over a single file the
 * host does not answer, and a rejected install is no offline mode at all rather
 * than a shell with one hole in it. A hole heals on the next visit with a
 * connection, since `respond` stores what it fetches; an empty cache never heals,
 * and it is what a reader running a preview server started before the last build
 * ends up with. Storing nothing at all is still a failure, so that the browser
 * retries the install rather than leaving a worker that answers nothing.
 *
 * The files still missing once every attempt is spent are returned rather than
 * swallowed: a reader offline before their next online visit never gets the
 * chance described above to heal that hole through `respond`, which is exactly
 * what turns into a `fetchError` on a page that looks like it should work
 * offline. `install` logs this list and hands it to every open page, so a
 * report of "it fails on this page" can be matched against what the build
 * actually failed to store, instead of guessed at.
 *
 * @returns The files that could not be stored for this build, empty when the
 * whole shell made it in.
 * @throws {Error} When not a single file could be fetched.
 * @author Claude
 */
const precache = async (): Promise<string[]> =>
{
    const cache = await caches.open( CACHE );
    let pending = SHELL;
    let stored = 0;

    for ( let attempt = 0; attempt < ATTEMPTS && pending.length > 0; attempt += 1 )
    {
        if ( attempt > 0 )
        {
            console.debug( `${ LOG } precache attempt ${ attempt + 1 }/${ ATTEMPTS }, ${ pending.length } file(s) left` );
            await wait( 1_000 );
        }

        const failed: string[] = [];

        for ( let start = 0; start < pending.length; start += BATCH )
        {
            const batch = pending.slice( start, start + BATCH );
            const results = await Promise.allSettled( batch.map( ( url ) => cache.add( url ) ) );

            results.forEach( ( result, index ) =>
            {
                if ( result.status === "fulfilled" )
                {
                    stored += 1;
                }
                else
                {
                    failed.push( batch[ index ] );
                }
            } );
        }

        pending = failed;
    }

    if ( stored === 0 )
    {
        throw new Error( "Nothing could be stored for this build." );
    }

    if ( pending.length > 0 )
    {
        console.warn( `${ LOG } ${ pending.length }/${ SHELL.length } file(s) never made it into the cache:`, pending );
    }
    else
    {
        console.info( `${ LOG } shell fully cached, ${ stored } file(s)` );
    }

    return pending;
};

/**
 * Drops the caches of previous builds and takes control of open pages.
 *
 * @returns Resolves once this worker owns every client.
 * @author Claude
 */
const cleanup = async (): Promise<void> =>
{
    const keys = await caches.keys();
    const stale = keys.filter( ( key ) => key.startsWith( "pericles-" ) && key !== CACHE );

    await Promise.all( stale.map( ( key ) => caches.delete( key ) ) );
    await worker.clients.claim();
};

/**
 * How many times a live request is attempted against the network before this
 * worker falls back to the cache.
 *
 * `precache` already knows the host drops a share of a burst of requests; a
 * page hydrating a route it has never loaded asks for several chunks at once,
 * which is the same kind of burst, on the same host. Unlike `precache`, this
 * path never retried before, so a single dropped request permanently failed
 * whatever needed it, offline or not, which is the `fetchError` this worker
 * has been reported to produce "like the other times".
 */
const RESPOND_ATTEMPTS = 3;

/** Pause before a retried request, in milliseconds. Short: this runs inline in a page load. */
const RESPOND_RETRY_DELAY = 300;

/**
 * Fetches a request, retrying it a handful of times before giving up.
 *
 * A reader genuinely offline fails every attempt in under a second, which is
 * an acceptable cost for the readers whose request only needed a second try
 * because the host, not the connection, dropped the first one.
 *
 * @param request Request being fetched. Must be a `GET`, so retrying never
 * risks replaying a body already consumed by a previous attempt.
 * @returns The network response.
 * @throws Whatever the last attempt failed with.
 * @author Claude
 */
const fetchWithRetry = async ( request: Request ): Promise<Response> =>
{
    let lastError: unknown;

    for ( let attempt = 0; attempt < RESPOND_ATTEMPTS; attempt += 1 )
    {
        if ( attempt > 0 )
        {
            console.debug( `${ LOG } retrying ${ request.url } (attempt ${ attempt + 1 }/${ RESPOND_ATTEMPTS })` );
            await wait( RESPOND_RETRY_DELAY );
        }

        try
        {
            return await fetch( request );
        }
        catch ( error )
        {
            lastError = error;
        }
    }

    throw lastError;
};

/**
 * Answers a request from the cache, the network, or the offline fallback.
 *
 * Hashed assets are read from the cache without consulting the network, since a
 * different content would have a different name. Everything else prefers the
 * network, so a deployed fix is picked up on the next load rather than after the
 * cache expires, and falls back to whatever was stored when the network fails.
 *
 * @param event Fetch event being handled.
 * @returns The response to hand back to the page, or a network error.
 * @author Claude
 */
const respond = async ( event: FetchEvent ): Promise<Response> =>
{
    const request = event.request;
    const cache = await caches.open( CACHE );
    const immutable = new URL( request.url ).pathname.startsWith( IMMUTABLE_PREFIX );

    if ( immutable )
    {
        const stored = await cache.match( request );

        if ( stored )
        {
            return stored;
        }
    }

    try
    {
        const response = await fetchWithRetry( request );

        // `basic` excludes opaque and error responses, which are useless once
        // replayed: their body cannot be read and their status is always zero.
        const storable = response.ok && response.type === "basic" && request.mode !== "navigate";

        if ( storable )
        {
            event.waitUntil( cache.put( request, response.clone() ) );
        }

        return response;
    }
    catch ( error )
    {
        const stored = await cache.match( request );

        if ( stored )
        {
            console.debug( `${ LOG } network failed for ${ request.url }, served from cache instead`, error );

            return stored;
        }

        const fallback = request.mode === "navigate" ? await cache.match( FALLBACK ) : undefined;

        if ( fallback )
        {
            console.debug( `${ LOG } network failed for ${ request.url }, served the offline fallback shell instead`, error );
        }
        else
        {
            console.warn( `${ LOG } ${ request.url } is unreachable and was never cached`, error );
        }

        // A network error rather than a rethrow: the page sees the same failed
        // request either way, but rejecting inside `respondWith` is also reported
        // as an unhandled rejection, which buries the one error that matters under
        // a line of worker noise per asset.
        return fallback ?? Response.error();
    }
};

worker.addEventListener( "install", ( event: ExtendableEvent ) =>
{
    event.waitUntil( precache().then( async ( missing ) =>
    {
        const clients = await worker.clients.matchAll( { includeUncontrolled: true } );

        clients.forEach( ( client ) => client.postMessage( { type: PRECACHE_STATUS, missing } ) );
    } ) );
} );

worker.addEventListener( "activate", ( event: ExtendableEvent ) =>
{
    event.waitUntil( cleanup() );
} );

worker.addEventListener( "fetch", ( event: FetchEvent ) =>
{
    const request = event.request;
    const sameOrigin = new URL( request.url ).origin === location.origin;
    const cacheable = request.method === "GET" && sameOrigin;

    // The dev server rebuilds on every change and `build` is empty there, so an
    // intercepting worker would only ever serve a stale module graph.
    if ( import.meta.env.DEV || !cacheable )
    {
        return;
    }

    event.respondWith( respond( event ) );
} );

// A new shell only takes over when the reader accepts it, so a page is never
// swapped under a half written article.
worker.addEventListener( "message", ( event: ExtendableMessageEvent ) =>
{
    if ( event.data === ACTIVATE_NOW )
    {
        void worker.skipWaiting();
    }
} );
