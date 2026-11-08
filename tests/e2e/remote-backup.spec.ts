/**
 * Optional backup service, on the data page.
 *
 * The service is answered by `page.route` and never by a real host: the wiki has
 * no server of its own, and a test that needed one would be testing the network
 * rather than the site. Every response here follows the contract in `README.md`,
 * and a bucket is answered the way the CORS rule handed by the form makes it answer.
 *
 * @author Claude
 */

import { createHash } from "node:crypto";
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
    await page.getByRole( "radio", { name: /API de sauvegarde/ } ).check();
    await page.getByLabel( "Adresse de l'API" ).fill( BASE_URL );
    await page.getByRole( "button", { name: "Tester la connexion" } ).click();
};

/** Bucket, object and key of the S3 destination, in a region nothing ever reaches. */
const S3_BUCKET = "wiki-pericles";

const S3_KEY = "sauvegardes/wiki.json";

const S3_ACCESS_KEY = "AKIDPERICLESEXAMPLE";

/** Url of the object, the bucket named in the path as the form does by default. */
const S3_OBJECT = `https://s3.eu-west-3.amazonaws.com/${ S3_BUCKET }/${ S3_KEY }`;

/** What the CORS rule handed by the form makes a bucket answer. */
const S3_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT",
    "Access-Control-Allow-Headers": "authorization, content-type, if-match, x-amz-content-sha256, x-amz-date",
    "Access-Control-Expose-Headers": "ETag"
};

/**
 * Chooses the S3 destination, fills it in and tests it, which stores it.
 *
 * @param page Page under test.
 * @author Claude
 */
const connectBucket = async ( page: Page ): Promise<void> =>
{
    await page.getByRole( "radio", { name: /Stockage compatible S3/ } ).check();
    await page.getByLabel( "Région" ).fill( "eu-west-3" );
    await page.getByLabel( "Compartiment", { exact: true } ).fill( S3_BUCKET );
    await page.getByLabel( "Nom du fichier" ).fill( S3_KEY );
    await page.getByLabel( "Identifiant de clé d'accès" ).fill( S3_ACCESS_KEY );
    await page.getByLabel( "Clé secrète" ).fill( "secret-de-test" );
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
    test( "fires no request while unconfigured, and shows what the server must answer", async ( { page, wiki } ) =>
    {
        const calls: string[] = [];

        await page.route( "**/dataset", ( route ) =>
        {
            calls.push( route.request().url() );

            return route.abort();
        } );

        await wiki.open( "/data" );

        await expect( page.getByRole( "heading", { name: "Garder une copie" } ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Envoyer mes pages" } ) ).toBeHidden();

        const destination = page.getByRole( "group", { name: "Où garder votre copie ?" } );
        const contract = page.getByRole( "complementary", { name: "Pour la personne qui installe l'API" } );

        // With nothing stored online, the file is offered first and the online fields stay out of the way.
        await expect( destination.getByRole( "radio", { name: /Fichier sur cet appareil/ } ) ).toBeChecked();
        await expect( page.getByLabel( "Adresse de l'API" ) ).toBeHidden();

        await destination.getByRole( "radio", { name: /API de sauvegarde/ } ).check();

        await page.getByLabel( "Adresse de l'API" ).fill( `${ BASE_URL }/` );

        // The contract is for whoever installs the API, so it stays folded until asked for.
        await expect( contract.getByRole( "button", { name: /Copier les instructions/ } ) ).toBeVisible();
        await expect( contract.getByRole( "figure" ) ).toBeHidden();
        await contract.getByText( "Voir le détail" ).click();

        await expect( contract.getByText( DATASET_ROUTE ) ).toHaveCount( 2 );
        await expect( contract.getByRole( "figure" ) ).toContainText(
            `Access-Control-Allow-Origin: ${ new URL( page.url() ).origin }`
        );
        await expect( contract.getByRole( "figure" ) ).toContainText( CORS[ "Access-Control-Allow-Headers" ] );

        // Typing an address is not testing it: only the button reaches the service.
        expect( calls ).toHaveLength( 0 );
    } );

    test( "reaches an empty bucket, and sends a signed copy of the browser", async ( { page, wiki } ) =>
    {
        const writes: { body: string; headers: Record<string, string> }[] = [];

        await page.route( S3_OBJECT, ( route: Route ) =>
        {
            if ( route.request().method() === "PUT" )
            {
                writes.push( { body: route.request().postData() ?? "", headers: route.request().headers() } );

                return route.fulfill( { status: 200, headers: { ...S3_CORS, ETag: "\"obj-1\"" } } );
            }

            return route.fulfill( { status: 404, headers: S3_CORS, body: "<Error><Code>NoSuchKey</Code></Error>" } );
        } );

        await wiki.open( "/data" );
        await connectBucket( page );

        await expect( page.getByText( "Ça fonctionne. Le stockage est prêt et attend votre premier envoi." ) )
            .toBeVisible();
        await expect( page.getByRole( "complementary", { name: "Pour configurer le stockage" } ) )
            .toContainText( `arn:aws:s3:::${ S3_BUCKET }/${ S3_KEY }` );

        await page.getByRole( "button", { name: "Envoyer mes pages" } ).click();
        await wiki.confirm( "Envoyer mes pages ?", "Envoyer" );

        await expect( page.getByText( "C'est envoyé : la sauvegarde en ligne est à jour." ) ).toBeVisible();
        expect( writes ).toHaveLength( 1 );

        const { body, headers } = writes[ 0 ];
        const digest = createHash( "sha256" ).update( body ).digest( "hex" );

        expect( headers.authorization ).toMatch( new RegExp( `^AWS4-HMAC-SHA256 Credential=${ S3_ACCESS_KEY }/\\d{8}/` ) );
        expect( headers[ "x-amz-content-sha256" ] ).toBe( digest );
        expect( headers ).not.toHaveProperty( "x-pericles-secret" );
        expect( ( JSON.parse( body ) as Dataset ).entries.map( ( entry ) => entry.slug ) ).toContain( PAGES.athena.slug );

        const config = JSON.parse( await page.evaluate( ( key ) => window.localStorage.getItem( key ), REMOTE_KEY ) ?? "{}" );

        expect( config ).toMatchObject( { kind: "s3", revision: "\"obj-1\"", s3: { bucket: S3_BUCKET } } );
    } );

    test( "offers no transfer to a destination other than the one on screen", async ( { page, wiki } ) =>
    {
        await page.route( DATASET_ROUTE, ( route: Route ) => route.fulfill( { status: 404, headers: CORS } ) );

        await wiki.open( "/data" );
        await connect( page );

        const success = page.getByRole( "status" ).filter( { hasText: "Ça fonctionne" } );
        const send = page.getByRole( "button", { name: "Envoyer mes pages" } );

        await expect( success ).toBeVisible();
        await expect( send ).toBeVisible();

        await page.getByRole( "radio", { name: /Stockage compatible S3/ } ).check();

        await expect( success ).toBeHidden();
        await expect( send ).toBeHidden();

        await page.getByRole( "radio", { name: /API de sauvegarde/ } ).check();

        await expect( send ).toBeVisible();

        // Once a destination is stored, the page comes back to it rather than to the file.
        await page.reload();

        await expect( page.getByRole( "radio", { name: /API de sauvegarde/ } ) ).toBeChecked();
        await expect( send ).toBeVisible();
    } );

    test( "tells a missing bucket from a missing backup", async ( { page, wiki } ) =>
    {
        await page.route( S3_OBJECT, ( route: Route ) => route.fulfill( {
            status: 404,
            headers: S3_CORS,
            body: "<Error><Code>NoSuchBucket</Code></Error>"
        } ) );

        await wiki.open( "/data" );
        await connectBucket( page );

        await expect( page.getByText( "Compartiment introuvable" ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Oublier ce compartiment" } ) ).toBeVisible();
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

        await page.getByLabel( "Mot de passe, si l'API en demande un" ).fill( "un secret périmé" );
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

        await expect( page.getByText( "C'est envoyé : la sauvegarde en ligne est à jour." ) ).toBeVisible();
        expect( sent[ 0 ]?.entries.map( ( entry ) => entry.slug ) ).toContain( PAGES.athena.slug );

        conflict = true;

        await page.getByRole( "button", { name: "Envoyer mes pages" } ).click();
        await wiki.confirm( "Envoyer mes pages ?", "Envoyer" );

        await expect( page.getByText( "La sauvegarde a été modifiée depuis un autre appareil" ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Remplacer quand même" } ) ).toBeVisible();
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

        await page.getByRole( "button", { name: "Récupérer la sauvegarde" } ).click();
        await wiki.confirm( "Récupérer la sauvegarde en ligne ?", "Récupérer" );

        await expect( page.getByText( "Sauvegarde récupérée : 1 fiche" ) ).toBeVisible();
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
        await wiki.confirm( "Récupérer la sauvegarde en ligne ?", "Récupérer" );

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

        await expect( page.getByText( REMINDER ) ).toBeVisible();
        await page.getByRole( "button", { name: "Mettre à jour la sauvegarde" } ).click();

        await expect( page.getByText( REMINDER ) ).toBeHidden();

        const changedAt = ( await wiki.storedOverlay() )?.changedAt;

        expect( service.sent ).toHaveLength( 1 );
        expect( service.sent[ 0 ] ).toMatchObject( { changedAt } );
    } );
} );
