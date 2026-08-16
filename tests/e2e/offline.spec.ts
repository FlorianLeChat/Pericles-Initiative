/**
 * The offline shell.
 *
 * The wiki lives in `localStorage`, so its content never needed a connection.
 * What did was the application around it, and `src/service-worker.ts` is what
 * stores that. These specs go through the real registration, wait for the shell
 * to be on disk, then cut the network and ask for pages back.
 *
 * @author Claude
 */

import type { Page } from "@playwright/test";
import { PAGES } from "./utilities/dataset";
import { expect, test } from "./utilities/fixtures";

/**
 * Files the shell is worthless without.
 *
 * `200.html` is what every page of content is served from, there being no
 * prerendered HTML for any of them. `_app/env.js` is dynamically imported while
 * the client boots, and a shell missing it paints the prerendered markup and then
 * dies on that import, leaving the fallback blank: the failure this spec exists
 * for, since nothing else about the site looks wrong when it happens.
 */
const REQUIRED = [ "/200.html", "/_app/env.js" ];

/** Where the Milkdown editor writes, once it has finished booting. */
const BODY = "[contenteditable=\"true\"]";

/**
 * Waits for the worker to have stored what the site cannot start without.
 *
 * @param page Page under test.
 * @returns Resolves once every required file is in a cache.
 * @author Claude
 */
const waitForShell = async ( page: Page ): Promise<void> =>
{
    await expect
        .poll(
            async () =>
                page.evaluate(
                    async ( required ) =>
                    {
                        const found = await Promise.all( required.map( ( path ) => caches.match( path ) ) );

                        return found.every( ( response ) => response !== undefined );
                    },
                    REQUIRED
                ),
            { timeout: 45000 }
        )
        .toBe( true );
};

// A context left offline hangs on teardown, and does so long after the assertions
// have all passed, which reads as a failure of the spec rather than of its exit.
test.afterEach( async ( { context } ) =>
{
    await context.setOffline( false );
} );

test.describe( "Offline", () =>
{
    test( "serves the shell and a page of content with no connection", async ( { page, context, wiki } ) =>
    {
        test.slow();

        const errors: string[] = [];

        page.on( "pageerror", ( error ) => errors.push( error.message ) );

        await wiki.open();
        await waitForShell( page );

        await context.setOffline( true );

        await page.reload();

        await expect( page.getByRole( "banner" ) ).toBeVisible();

        // Reached by url rather than by a click: a cold start on a route with no
        // prerendered HTML is the case the fallback exists for, and the one a
        // client side navigation would never exercise.
        await page.goto( `/wiki/${ PAGES.athena.slug }` );

        await expect( page.getByRole( "heading", { level: 1, name: PAGES.athena.title } ) ).toBeVisible();
        expect( errors ).toEqual( [] );
    } );

    test( "opens the editor with no connection, down to the Milkdown chunk", async ( { page, context, wiki } ) =>
    {
        test.slow();

        await wiki.open();
        await waitForShell( page );

        await context.setOffline( true );

        await page.goto( "/new" );

        // The heaviest files of the build are the editor's, so they are the ones a
        // precache drops first when the host stops answering. A wiki that reads
        // offline but cannot be written to is half a wiki, and nothing else in the
        // suite would notice them missing.
        await expect( page.getByLabel( "Titre", { exact: true } ) ).toBeVisible();
        await expect( page.locator( BODY ) ).toBeVisible();
    } );

    test( "arrives from nowhere, with no tab of the site left open", async ( { page, context, wiki } ) =>
    {
        test.slow();

        await wiki.open();
        await waitForShell( page );
        await page.close();

        await context.setOffline( true );

        // The reader who loses their connection elsewhere and then comes here has no
        // client of this origin left running, so nothing of the site is in memory to
        // answer with. The browser starts the stored worker for the navigation
        // itself, which is the whole reason a shell survives a closed tab.
        const visitor = await context.newPage();

        await visitor.goto( `/wiki/${ PAGES.athena.slug }` );

        await expect( visitor.getByRole( "heading", { level: 1, name: PAGES.athena.title } ) ).toBeVisible();
    } );
} );
