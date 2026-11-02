/**
 * Optional backup service, on the data page.
 *
 * The service is answered by `page.route` and never by a real host: the wiki has
 * no server of its own, and a test that needed one would be testing the network
 * rather than the site. Every response here follows the contract in `README.md`.
 *
 * @author Claude
 */

import type { Dataset } from "#lib/types.ts";
import type { Page, Route } from "@playwright/test";
import { COUNTS, LIVE, PAGES, sampleDataset } from "./utilities/dataset";
import { expect, REMOTE_KEY, test, type WikiHelper } from "./utilities/fixtures";

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
    await page.getByLabel( "Adresse du serveur" ).fill( BASE_URL );
    await page.getByRole( "button", { name: "Tester la connexion" } ).click();
};

/** Stamp of the snapshot this browser last synchronised with. */
const SYNCED_STAMP = "2026-01-10T09:00:00.000Z";

/** Stamp of a snapshot sent from another browser since. */
const NEWER_STAMP = "2026-02-20T18:30:00.000Z";

/** Sentence of the offer made on arrival when the backup is more recent. */
const NEWER_OFFER = "Une sauvegarde en ligne plus récente est disponible";

/** Sentence of the reminder shown after a change. */
const REMINDER = "Vos dernières modifications ne sont pas encore dans la sauvegarde en ligne.";

/**
 * Serves a snapshot carrying a stamp the spec can change, and counts the reads.
 *
 * @param page Page under test.
 * @param dataset Content of the snapshot.
 * @param initial Stamp the snapshot starts with.
 * @returns Accessors over the stamp served, the reads made and the bodies sent.
 * @author Claude
 */
const serveSnapshot = async ( page: Page, dataset: Dataset, initial: string ): Promise<{
    stamp: ( value: string ) => void;
    reads: () => number;
    sent: Record<string, unknown>[];
}> =>
{
    let stamp = initial;
    let reads = 0;
    const sent: Record<string, unknown>[] = [];

    await page.route( DATASET_ROUTE, ( route: Route ) =>
    {
        if ( route.request().method() === "PUT" )
        {
            sent.push( JSON.parse( route.request().postData() ?? "{}" ) as Record<string, unknown> );

            return route.fulfill( { status: 204, headers: CORS } );
        }

        reads += 1;

        return route.fulfill( { status: 200, headers: CORS, json: { ...dataset, changedAt: stamp } } );
    } );

    return {
        stamp: ( value ) =>
        {
            stamp = value;
        },
        reads: () => reads,
        sent
    };
};

/**
 * Configures the service as already synchronised with this browser, then arrives on the site again.
 *
 * Written once the overlay is in place, since the local marker is the stamp of
 * that very overlay, and followed by a reload so the arrival is a real one.
 *
 * @param page Page under test.
 * @param wiki The `wiki` fixture, to read the stored overlay.
 * @param remoteStamp Stamp of the snapshot this browser last matched.
 * @author Claude
 */
const arriveSynced = async ( page: Page, wiki: WikiHelper, remoteStamp: string ): Promise<void> =>
{
    const local = ( await wiki.storedOverlay() )?.changedAt ?? null;
    const config = { baseUrl: BASE_URL, syncedChange: local, syncedRemote: remoteStamp };

    await page.evaluate(
        ( payload ) => window.localStorage.setItem( payload.key, JSON.stringify( payload.config ) ),
        { key: REMOTE_KEY, config }
    );

    await page.reload();
    await expect( page.getByRole( "banner" ) ).toContainText( sampleDataset().meta.universe );
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
        await expect( page.getByRole( "button", { name: "Envoyer mes pages" } ) ).toBeHidden();
        expect( calls ).toHaveLength( 0 );
    } );

    test( "keeps the snapshot server as the one destination, S3 being announced only", async ( { page, wiki } ) =>
    {
        await wiki.open( "/data" );

        const destination = page.getByRole( "group", { name: "Destination" } );

        await expect( destination.getByRole( "radio", { name: /Serveur de sauvegarde/ } ) ).toBeChecked();
        await expect( destination.getByRole( "radio", { name: /Stockage compatible S3/ } ) ).toBeDisabled();
        await expect( destination ).toContainText( "Bientôt" );
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

        await expect( page.getByText( `La sauvegarde en ligne contient ${ COUNTS.entries } fiches.` ) ).toBeVisible();
        expect( await page.evaluate( ( key ) => window.localStorage.getItem( key ), REMOTE_KEY ) ).toContain( BASE_URL );

        await page.unroute( DATASET_ROUTE );
        await page.route( DATASET_ROUTE, ( route: Route ) => route.fulfill( { status: 401, headers: CORS } ) );

        await page.getByLabel( "Mot de passe, facultatif" ).fill( "un secret périmé" );
        await connect( page );

        await expect( page.getByText( "Le mot de passe a été refusé." ) ).toBeVisible();
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

        await page.getByRole( "button", { name: "Envoyer mes pages" } ).click();
        await wiki.confirm( "Envoyer mes pages ?", "Envoyer" );

        await expect( page.getByText( "Sauvegarde en ligne mise à jour." ) ).toBeVisible();
        expect( sent[ 0 ]?.entries.map( ( entry ) => entry.slug ) ).toContain( PAGES.athena.slug );

        conflict = true;

        await page.getByRole( "button", { name: "Envoyer mes pages" } ).click();
        await wiki.confirm( "Envoyer mes pages ?", "Envoyer" );

        await expect( page.getByText( "La sauvegarde en ligne a changé depuis votre dernière lecture" ) ).toBeVisible();
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
        await wiki.confirm( "Restaurer depuis le serveur ?", "Restaurer" );

        await expect( page.getByText( "Wiki restauré : 1 fiche" ) ).toBeVisible();
        await expect( page.getByRole( "banner" ) ).toContainText( "Périclès, sauvegardé" );
    } );

    test( "offers a more recent backup once, and keeps quiet across pages", async ( { page, wiki } ) =>
    {
        await page.clock.install();
        const service = await serveSnapshot( page, sampleDataset(), NEWER_STAMP );

        await wiki.open( "/" );
        await arriveSynced( page, wiki, SYNCED_STAMP );

        const offer = page.getByRole( "status" ).filter( { hasText: NEWER_OFFER } );

        await expect( offer ).toBeVisible();
        await offer.getByRole( "button", { name: "Ignorer" } ).click();
        await expect( offer ).toBeHidden();

        const readsBefore = service.reads();

        await page.clock.fastForward( "01:01" );
        await wiki.navigate( "Catégories" );

        await expect.poll( () => service.reads() ).toBeGreaterThan( readsBefore );
        await expect( offer ).toBeHidden();
    } );

    test( "offers it again once an up to date backup falls behind", async ( { page, wiki } ) =>
    {
        await page.clock.install();
        const service = await serveSnapshot( page, sampleDataset(), SYNCED_STAMP );

        await wiki.open( "/" );
        await arriveSynced( page, wiki, SYNCED_STAMP );

        await expect.poll( () => service.reads() ).toBeGreaterThan( 0 );
        await expect( page.getByText( NEWER_OFFER ) ).toBeHidden();

        service.stamp( NEWER_STAMP );

        await page.clock.fastForward( "01:01" );
        await wiki.navigate( "Catégories" );

        await expect( page.getByText( NEWER_OFFER ) ).toBeVisible();
    } );

    test( "restores the more recent backup from the offer", async ( { page, wiki } ) =>
    {
        const stored = sampleDataset();

        stored.meta.universe = "Périclès, venu d'ailleurs";
        await serveSnapshot( page, stored, NEWER_STAMP );

        await wiki.open( "/" );
        await arriveSynced( page, wiki, SYNCED_STAMP );

        await page.getByRole( "button", { name: "Récupérer la sauvegarde" } ).click();
        await wiki.confirm( "Restaurer depuis le serveur ?", "Restaurer" );

        await expect( page.getByRole( "banner" ) ).toContainText( "Périclès, venu d'ailleurs" );
        await expect( page.getByText( NEWER_OFFER ) ).toBeHidden();

        const config = await page.evaluate( ( key ) => window.localStorage.getItem( key ), REMOTE_KEY );

        expect( JSON.parse( config ?? "{}" ) ).toMatchObject( { syncedRemote: NEWER_STAMP } );
    } );

    test( "offers to update the backup after a change, and sends it", async ( { page, wiki } ) =>
    {
        const service = await serveSnapshot( page, sampleDataset(), SYNCED_STAMP );

        await wiki.open( "/live" );
        await arriveSynced( page, wiki, SYNCED_STAMP );

        await expect( page.getByText( REMINDER ) ).toBeHidden();

        await page.getByRole( "article" ).filter( { hasText: LIVE.older.title } )
            .getByRole( "button", { name: "Supprimer" } ).click();
        await wiki.confirm( "Supprimer cette entrée ?", "Supprimer" );

        await expect( page.getByText( REMINDER ) ).toBeVisible();
        await page.getByRole( "button", { name: "Mettre à jour la sauvegarde" } ).click();

        await expect( page.getByText( REMINDER ) ).toBeHidden();

        const changedAt = ( await wiki.storedOverlay() )?.changedAt;

        expect( service.sent ).toHaveLength( 1 );
        expect( service.sent[ 0 ] ).toMatchObject( { changedAt } );
    } );
} );
