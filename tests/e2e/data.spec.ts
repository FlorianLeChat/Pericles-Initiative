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

        await expect( page.getByText( "Rien n'est encore enregistré sur cet appareil." ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Effacer tout mon wiki" } ) ).toBeDisabled();

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

    test( "replaces everything with a pasted file, and refuses an unreadable one", async ( { page, wiki } ) =>
    {
        await wiki.open( "/data" );

        await page.getByLabel( "Ou coller le contenu d'une sauvegarde" ).fill( "{ ceci n’est pas du JSON" );
        await page.getByRole( "button", { name: "Restaurer cette sauvegarde" } ).click();
        await wiki.confirm( "Remplacer votre wiki ?", "Restaurer" );

        await expect( page.getByText( "Ce contenu n'est pas une sauvegarde valide." ) ).toBeVisible();

        await page.getByLabel( "Ou coller le contenu d'une sauvegarde" ).fill( JSON.stringify( IMPORTED ) );
        await page.getByRole( "button", { name: "Restaurer cette sauvegarde" } ).click();
        await wiki.confirm( "Remplacer votre wiki ?", "Restaurer" );

        await expect( page.getByText( "Sauvegarde restaurée : 1 fiche, 0 catégorie et 0 entrée du fil." ) ).toBeVisible();
        await expect( page.locator( "html" ) ).toHaveAttribute( "data-accent", IMPORTED.meta.accent );

        await page.goto( "/wiki" );

        await expect( page.getByRole( "link", { name: "Vigie du nord" } ) ).toBeVisible();
        await expect( page.getByRole( "link", { name: PAGES.athena.title } ) ).toBeHidden();
    } );

    test( "erases the content of the browser once confirmed", async ( { page, wiki } ) =>
    {
        await wiki.open( "/data" );

        await page.getByRole( "button", { name: "Effacer tout mon wiki" } ).click();
        await wiki.confirm( "Effacer tout votre wiki ?", "Effacer" );

        await expect( page.getByText( "Votre wiki a été effacé de cet appareil." ) ).toBeVisible();
        expect( await wiki.storedOverlay() ).toBeNull();
    } );
} );
