/**
 * Data page: what this browser holds, and the file backup around it.
 *
 * Losing the browser storage loses everything, so the export and the import are
 * the only safety net there is: they get checked on their content, not just on
 * their confirmation message.
 *
 * @author Claude
 */

import { readFile } from "node:fs/promises";
import type { Dataset } from "#lib/types.ts";
import { expect, test } from "./utilities/fixtures";
import { COUNTS, PAGES, UNIVERSE } from "./utilities/dataset";

/**
 * A minimal wiki, pasted into the import area to replace everything.
 *
 * Its accent is not the default one, so restoring it also proves that the colour
 * of a wiki travels in its backup like the rest of the identity.
 */
const IMPORTED: Dataset = {
    meta: {
        universe: "Archipel importé",
        description: "",
        logo: "",
        accent: "ambre",
        featured: []
    },
    categories: [],
    entries: [
        {
            id: "imported-vigie",
            slug: "vigie-du-nord",
            title: "Vigie du nord",
            summary: "La tour qui surveille le seuil.",
            body: "Une tour, un fanal, deux gardiens.\n",
            categories: [],
            infobox: [],
            image: null,
            dates: [],
            status: "publie",
            aliases: [],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
        }
    ],
    live: []
};

test.describe( "data page", () =>
{
    test( "inventories what the browser holds, and nothing when it holds nothing", async ( { page, wiki } ) =>
    {
        await wiki.openEmpty( "/data" );

        await expect( page.getByText( "Rien n'est encore enregistré sur cet appareil." ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Effacer tout mon contenu" } ) ).toBeDisabled();

        await wiki.open( "/data" );

        await expect( page.getByText( "éléments enregistrés sur cet appareil." ) ).toBeVisible();
        await expect( page.getByRole( "link", { name: PAGES.port.title } ) ).toBeVisible();
    } );

    test( "writes the whole wiki to a file", async ( { page, wiki } ) =>
    {
        await wiki.open( "/data" );

        const download = page.waitForEvent( "download" );

        await page.getByRole( "button", { name: "Télécharger ma sauvegarde" } ).click();

        const file = await download;

        expect( file.suggestedFilename() ).toBe( "wiki.json" );

        const exported = JSON.parse( await readFile( await file.path(), "utf8" ) ) as Dataset;

        expect( exported.entries ).toHaveLength( COUNTS.entries );
        expect( exported.entries.map( ( entry ) => entry.slug ) ).toContain( PAGES.athena.slug );
        await expect( page.getByText( "Sauvegarde téléchargée." ) ).toBeVisible();
    } );

    test( "refuses an unreadable file before asking anything, and leaves the wiki alone", async ( { page, wiki } ) =>
    {
        await wiki.open( "/data" );

        await page.getByLabel( "Votre fichier de sauvegarde" ).setInputFiles( {
            name: "wiki.json",
            mimeType: "application/json",
            buffer: Buffer.from( "{ ceci n’est pas du JSON" )
        } );
        await page.getByRole( "button", { name: "Restaurer cette sauvegarde" } ).click();

        await expect( page.getByRole( "alert" ) ).toContainText( "Impossible de lire cette sauvegarde" );
        await expect( page.getByRole( "alert" ) ).toContainText( "Choisissez le fichier wiki.json" );
        await expect( page.getByRole( "dialog" ) ).toBeHidden();

        await page.getByLabel( "Ou coller le contenu d'une sauvegarde" ).fill( "[ 1, 2, 3 ]" );
        await page.getByRole( "button", { name: "Restaurer cette sauvegarde" } ).click();

        await expect( page.getByRole( "alert" ) ).toContainText( "Impossible de lire cette sauvegarde" );
        await expect( page.getByRole( "dialog" ) ).toBeHidden();

        const overlay = await wiki.storedOverlay();

        expect( Object.keys( overlay?.entries ?? {} ) ).toHaveLength( COUNTS.entries );
    } );

    test( "compares the wiki with the file, offers a copy first, then replaces everything", async ( { page, wiki } ) =>
    {
        await wiki.open( "/data" );

        await page.getByLabel( "Ou coller le contenu d'une sauvegarde" ).fill( JSON.stringify( IMPORTED ) );
        await page.getByRole( "button", { name: "Restaurer cette sauvegarde" } ).click();

        const dialog = page.getByRole( "dialog", { name: "Remplacer votre wiki ?" } );
        const current
            = `${ COUNTS.entries } fiches, ${ COUNTS.categories } catégories et ${ COUNTS.live } entrées du fil`;

        const values = dialog.getByRole( "definition" );

        await expect( dialog.getByRole( "term" ) ).toHaveText( [ "Sur cet appareil", "Dans le fichier" ] );
        await expect( values.nth( 0 ) ).toHaveText( current );
        await expect( values.nth( 1 ) ).toHaveText( "1 fiche, 0 catégorie et 0 entrée du fil" );
        const universes = `« ${ IMPORTED.meta.universe } » remplacera « ${ UNIVERSE } »`;

        await expect( values.nth( 2 ) ).toContainText( universes );
        await expect( dialog.getByRole( "button", { name: "Remplacer", exact: true } ) ).toHaveClass( /bg-red-/ );

        const download = page.waitForEvent( "download" );

        await dialog.getByRole( "button", { name: "Télécharger la version actuelle d'abord" } ).click();

        const file = await download;
        const exported = JSON.parse( await readFile( await file.path(), "utf8" ) ) as Dataset;

        expect( file.suggestedFilename() ).toBe( "wiki.json" );
        expect( exported.entries ).toHaveLength( COUNTS.entries );
        await expect( dialog ).toBeVisible();
        const downloaded = dialog.getByRole( "status" );

        await expect( downloaded ).toHaveText( "Version actuelle téléchargée dans le fichier wiki.json." );

        await wiki.confirm( "Remplacer votre wiki ?", "Remplacer" );

        await expect( page.getByText( "Sauvegarde restaurée : 1 fiche, 0 catégorie et 0 entrée du fil." ) ).toBeVisible();
        await expect( page.locator( "html" ) ).toHaveAttribute( "data-accent", IMPORTED.meta.accent );

        await page.goto( "/entries" );

        await expect( page.getByRole( "link", { name: "Vigie du nord" } ) ).toBeVisible();
        await expect( page.getByRole( "link", { name: PAGES.athena.title } ) ).toBeHidden();
    } );

    test( "erases the content of the browser once confirmed, and spares the settings", async ( { page, wiki } ) =>
    {
        await wiki.open( "/data" );

        await page.getByRole( "button", { name: "Effacer tout mon contenu" } ).click();
        await wiki.confirm( "Effacer tout votre contenu ?", "Effacer" );

        await expect( page.getByText( "Le contenu de votre wiki a été effacé de cet appareil." ) ).toBeVisible();

        const overlay = await wiki.storedOverlay();

        expect( Object.keys( overlay?.entries ?? {} ) ).toHaveLength( 0 );
        expect( Object.keys( overlay?.categories ?? {} ) ).toHaveLength( 0 );
        expect( overlay?.meta?.universe ).toBe( UNIVERSE );
        await expect( page.getByRole( "banner" ) ).toContainText( UNIVERSE );
    } );
} );
