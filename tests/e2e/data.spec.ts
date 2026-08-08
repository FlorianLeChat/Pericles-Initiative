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
import type { Dataset } from "$lib/types";
import { COUNTS, PAGES } from "./utilities/dataset";
import { expect, test } from "./utilities/fixtures";

/** A minimal wiki, pasted into the import area to replace everything. */
const IMPORTED: Dataset = {
    meta: {
        universe: "Archipel importé",
        tagline: "Venu d’un fichier.",
        description: "",
        logo: "",
        featured: []
    },
    categories: [],
    entries: [
        {
            id: "imported-vigie",
            slug: "vigie-du-nord",
            title: "Vigie du nord",
            type: "lieu",
            summary: "La tour qui surveille le seuil.",
            body: "Une tour, un fanal, deux gardiens.\n",
            categories: [],
            infobox: [],
            image: null,
            timelineDate: null,
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

        await expect( page.getByText( "Ce navigateur ne contient aucun contenu pour le moment." ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Effacer le contenu de ce navigateur" } ) ).toBeDisabled();

        await wiki.open( "/data" );

        await expect( page.getByText( "éléments enregistrés dans ce navigateur." ) ).toBeVisible();
        await expect( page.getByRole( "link", { name: PAGES.port.title } ) ).toBeVisible();
    } );

    test( "writes the whole wiki to a file", async ( { page, wiki } ) =>
    {
        await wiki.open( "/data" );

        const download = page.waitForEvent( "download" );

        await page.getByRole( "button", { name: "Télécharger wiki.json" } ).click();

        const file = await download;

        expect( file.suggestedFilename() ).toBe( "wiki.json" );

        const exported = JSON.parse( await readFile( await file.path(), "utf8" ) ) as Dataset;

        expect( exported.entries ).toHaveLength( COUNTS.entries );
        expect( exported.entries.map( ( entry ) => entry.slug ) ).toContain( PAGES.athena.slug );
        await expect( page.getByText( "Fichier téléchargé." ) ).toBeVisible();
    } );

    test( "replaces everything with a pasted file, and refuses an unreadable one", async ( { page, wiki } ) =>
    {
        await wiki.open( "/data" );

        await page.getByLabel( "Ou coller le JSON" ).fill( "{ ceci n’est pas du JSON" );
        await page.getByRole( "button", { name: "Charger ce contenu" } ).click();
        await page.getByRole( "dialog", { name: "Charger ce JSON ?" } ).getByRole( "button", { name: "Charger" } )
            .click();

        await expect( page.getByText( "JSON illisible" ) ).toBeVisible();

        await page.getByLabel( "Ou coller le JSON" ).fill( JSON.stringify( IMPORTED ) );
        await page.getByRole( "button", { name: "Charger ce contenu" } ).click();
        await page.getByRole( "dialog", { name: "Charger ce JSON ?" } ).getByRole( "button", { name: "Charger" } )
            .click();

        await expect( page.getByText( "Import réussi : 1 fiche, 0 catégories, 0 entrées de direct." ) ).toBeVisible();

        await page.goto( "/wiki" );

        await expect( page.getByRole( "link", { name: "Vigie du nord" } ) ).toBeVisible();
        await expect( page.getByRole( "link", { name: PAGES.athena.title } ) ).toBeHidden();
    } );

    test( "erases the content of the browser once confirmed", async ( { page, wiki } ) =>
    {
        await wiki.open( "/data" );

        await page.getByRole( "button", { name: "Effacer le contenu de ce navigateur" } ).click();
        await page.getByRole( "dialog", { name: "Effacer le contenu de ce navigateur ?" } )
            .getByRole( "button", { name: "Effacer" } ).click();

        await expect( page.getByText( "Contenu de ce navigateur effacé." ) ).toBeVisible();
        expect( await wiki.storedOverlay() ).toBeNull();
    } );
} );
