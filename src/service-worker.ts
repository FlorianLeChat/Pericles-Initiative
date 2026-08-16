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

import { ACTIVATE_NOW } from "$lib/config/service-worker";
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
 * Fills the cache for this build, storing what it can.
 *
 * `addAll` was tried and dropped: it rejects as a whole over a single file the
 * host does not answer, and a rejected install is no offline mode at all rather
 * than a shell with one hole in it. A hole heals on the next visit with a
 * connection, since `respond` stores what it fetches; an empty cache never heals,
 * and it is what a reader running a preview server started before the last build
 * ends up with. Storing nothing at all is still a failure, so that the browser
 * retries the install rather than leaving a worker that answers nothing.
 *
 * @returns Resolves once the shell is stored.
 * @throws {Error} When not a single file could be fetched.
 * @author Claude
 */
const precache = async (): Promise<void> =>
{
    const cache = await caches.open( CACHE );
    const results = await Promise.allSettled( SHELL.map( ( url ) => cache.add( url ) ) );
    const stored = results.filter( ( result ) => result.status === "fulfilled" ).length;

    if ( stored === 0 )
    {
        throw new Error( "Nothing could be stored for this build." );
    }
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
        const response = await fetch( request );

        // `basic` excludes opaque and error responses, which are useless once
        // replayed: their body cannot be read and their status is always zero.
        const storable = response.ok && response.type === "basic" && request.mode !== "navigate";

        if ( storable )
        {
            event.waitUntil( cache.put( request, response.clone() ) );
        }

        return response;
    }
    catch
    {
        const stored = await cache.match( request );

        if ( stored )
        {
            return stored;
        }

        const fallback = request.mode === "navigate" ? await cache.match( FALLBACK ) : undefined;

        // A network error rather than a rethrow: the page sees the same failed
        // request either way, but rejecting inside `respondWith` is also reported
        // as an unhandled rejection, which buries the one error that matters under
        // a line of worker noise per asset.
        return fallback ?? Response.error();
    }
};

worker.addEventListener( "install", ( event: ExtendableEvent ) =>
{
    event.waitUntil( precache() );
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
