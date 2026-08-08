/**
 * Static host for the end to end suite.
 *
 * `vite preview` cannot serve this site: the layout declares `prerender = true`,
 * so the preview server answers 404 for every route it has no prerendered file
 * for, which today means every page of actual content. A real static host serves
 * the SPA fallback instead, and that fallback is the whole reason the wiki works
 * with an empty seed.
 *
 * So the suite runs against exactly what gets deployed: the files in `build/`,
 * with `200.html` for anything else. Deliberately dependency free, since its only
 * job is to hand back bytes the adapter already wrote.
 *
 * @author Claude
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve( "build" );

const FALLBACK = join( ROOT, "200.html" );

const PORT = Number( process.env.PORT ?? 4173 );

/** Content types of everything the build produces. Anything else is downloaded as is. */
const TYPES = /** @type {Record<string, string | undefined>} */ ( {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8"
} );

/**
 * Resolves a request path to a file inside the build, or null when there is none.
 *
 * A path is refused rather than answered from outside `build/`, so a traversal
 * attempt reaches the fallback like any unknown route.
 *
 * @param {string} pathname Decoded request path.
 * @returns {Promise<string | null>} Absolute path of the file to serve.
 * @author Claude
 */
const locate = async ( pathname ) =>
{
    const candidate = resolve( join( ROOT, normalize( pathname ) ) );

    if ( !candidate.startsWith( ROOT ) )
    {
        return null;
    }

    const attempts = extname( candidate ) ? [ candidate ] : [ candidate, join( candidate, "index.html" ), `${ candidate }.html` ];

    for ( const attempt of attempts )
    {
        try
        {
            const stats = await stat( attempt );

            if ( stats.isFile() )
            {
                return attempt;
            }
        }
        catch
        {
            // Missing files are the normal case here: every page that only exists
            // in a browser's storage reaches this loop and falls through.
        }
    }

    return null;
};

const server = createServer( ( request, response ) =>
{
    const pathname = decodeURIComponent( new URL( request.url ?? "/", `http://localhost:${ PORT }` ).pathname );

    void locate( pathname ).then( ( file ) =>
    {
        const served = file ?? FALLBACK;

        response.writeHead( 200, {
            "Content-Type": TYPES[ extname( served ) ] ?? "application/octet-stream",
            // A test run must never read a page a previous run left in the cache.
            "Cache-Control": "no-store"
        } );

        createReadStream( served ).pipe( response );
    } );
} );

server.listen( PORT, () =>
{
    process.stdout.write( `Serving build/ on http://localhost:${ PORT }\n` );
} );
