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
 *    service specified in `REMOTE-API.md` lives on another origin, and serving it
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
 * The built application: chunks, stylesheets, and everything under `static/`.
 *
 * The Milkdown editor is a lazily loaded chunk, and `build` contains it. Leaving
 * it out would give a site that reads offline but cannot be written to, which is
 * half of what an offline wiki is for.
 */
const ASSETS = [ ...build, ...files ];

/** Prerendered HTML, plus the fallback that carries every other route. */
const PAGES = [ ...prerendered, FALLBACK ];

/**
 * Fills the cache for this build.
 *
 * Assets are required: a build whose own chunks cannot be fetched is broken, and
 * failing here leaves the previous worker in place rather than installing a shell
 * with holes in it. Pages are best effort, since a listing that fails to render
 * at build time should not cost the reader the whole offline mode.
 *
 * @returns Resolves once the shell is stored.
 * @author Claude
 */
const precache = async (): Promise<void> =>
{
    const cache = await caches.open( CACHE );

    await cache.addAll( ASSETS );
    await Promise.allSettled( PAGES.map( ( page ) => cache.add( page ) ) );
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
 * @returns The response to hand back to the page.
 * @throws {TypeError} When the request fails and nothing was cached for it.
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
    catch ( error )
    {
        const stored = await cache.match( request );

        if ( stored )
        {
            return stored;
        }

        const fallback = request.mode === "navigate" ? await cache.match( FALLBACK ) : undefined;

        if ( fallback )
        {
            return fallback;
        }

        throw error;
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
