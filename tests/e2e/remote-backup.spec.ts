/**
 * Optional backup service, on the data page.
 *
 * The service is answered by `page.route` and never by a real host: the wiki has
 * no server of its own, and a test that needed one would be testing the network
 * rather than the site. Every response here follows `REMOTE-API.md`.
 *
 * @author Claude
 */

import type { Page, Route } from "@playwright/test";
import type { Dataset } from "$lib/types";
import { COUNTS, PAGES, sampleDataset } from "./utilities/dataset";
import { expect, REMOTE_KEY, test } from "./utilities/fixtures";

/** Endpoint the panel is pointed at, on a host that must never be reached. */
const BASE_URL = "https://sauvegarde.invalid/pericles";

const DATASET_ROUTE = `${ BASE_URL }/dataset`;

/** Headers a browser needs to accept a cross origin answer, preflight included. */
const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, If-Match, X-Pericles-Secret",
    "Access-Control-Expose-Headers": "ETag"
};

/**
 * Fills in the address of the service and stores it, which testing the
 * connection also does.
 *
 * @param page Page under test.
 * @author Claude
 */
const connect = async ( page: Page ): Promise<void> =>
{
    await page.getByLabel( "Adresse du service" ).fill( BASE_URL );
    await page.getByRole( "button", { name: "Tester la connexion" } ).click();
};

test.describe( "remote backup", () =>
{
    test( "fires no request at all while no service is configured", async ( { page, wiki } ) =>
    {
        const calls: string[] = [];

        await page.route( "**/dataset", ( route ) =>
        {
            calls.push( route.request().url() );

            return route.abort();
        } );

        await wiki.open( "/data" );

        await expect( page.getByRole( "heading", { name: "Sauvegarde en ligne" } ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Envoyer la sauvegarde" } ) ).toBeHidden();
        expect( calls ).toHaveLength( 0 );
    } );

    test( "reports what the service holds, and why it could not be read", async ( { page, wiki } ) =>
    {
        await page.route( DATASET_ROUTE, ( route: Route ) => route.fulfill( {
            status: 200,
            headers: { ...CORS, ETag: "\"rev-1\"" },
            json: sampleDataset()
        } ) );

        await wiki.open( "/data" );
        await connect( page );

        await expect( page.getByText( `La sauvegarde distante contient ${ COUNTS.entries } fiches.` ) ).toBeVisible();
        expect( await page.evaluate( ( key ) => window.localStorage.getItem( key ), REMOTE_KEY ) )
            .toContain( BASE_URL );

        await page.unroute( DATASET_ROUTE );
        await page.route( DATASET_ROUTE, ( route: Route ) => route.fulfill( { status: 401, headers: CORS } ) );

        await page.getByLabel( "Secret, facultatif" ).fill( "un secret périmé" );
        await connect( page );

        await expect( page.getByText( "Secret refusé par le serveur." ) ).toBeVisible();
    } );

    test( "sends the content of the browser, and stops on a concurrent change", async ( { page, wiki } ) =>
    {
        const sent: Dataset[] = [];
        let conflict = false;

        await page.route( DATASET_ROUTE, ( route: Route ) =>
        {
            if ( route.request().method() !== "PUT" )
            {
                return route.fulfill( { status: 200, headers: { ...CORS, ETag: "\"rev-1\"" }, json: sampleDataset() } );
            }

            if ( conflict )
            {
                return route.fulfill( { status: 412, headers: CORS } );
            }

            sent.push( JSON.parse( route.request().postData() ?? "{}" ) as Dataset );

            return route.fulfill( { status: 204, headers: { ...CORS, ETag: "\"rev-2\"" } } );
        } );

        await wiki.open( "/data" );
        await connect( page );

        await page.getByRole( "button", { name: "Envoyer la sauvegarde" } ).click();
        await page.getByRole( "dialog", { name: "Envoyer la sauvegarde ?" } )
            .getByRole( "button", { name: "Envoyer" } ).click();

        await expect( page.getByText( "Sauvegarde en ligne mise à jour." ) ).toBeVisible();
        expect( sent[ 0 ]?.entries.map( ( entry ) => entry.slug ) ).toContain( PAGES.athena.slug );

        conflict = true;

        await page.getByRole( "button", { name: "Envoyer la sauvegarde" } ).click();
        await page.getByRole( "dialog", { name: "Envoyer la sauvegarde ?" } )
            .getByRole( "button", { name: "Envoyer" } ).click();

        await expect( page.getByText( "La sauvegarde distante a changé depuis votre dernière lecture." ) )
            .toBeVisible();
        await expect( page.getByRole( "button", { name: "Écraser quand même" } ) ).toBeVisible();
    } );

    test( "restores the snapshot into the browser, replacing everything", async ( { page, wiki } ) =>
    {
        const stored = sampleDataset();

        stored.entries = stored.entries.slice( 0, 1 );
        stored.meta.universe = "Périclès, sauvegardé";

        await page.route( DATASET_ROUTE, ( route: Route ) => route.fulfill( {
            status: 200,
            headers: CORS,
            json: stored
        } ) );

        await wiki.open( "/data" );
        await connect( page );

        await page.getByRole( "button", { name: "Restaurer depuis le serveur" } ).click();
        await page.getByRole( "dialog", { name: "Restaurer depuis le serveur ?" } )
            .getByRole( "button", { name: "Restaurer" } ).click();

        await expect( page.getByText( "Restauration réussie : 1 fiche" ) ).toBeVisible();
        await expect( page.getByRole( "banner" ) ).toContainText( "Périclès, sauvegardé" );
    } );
} );
