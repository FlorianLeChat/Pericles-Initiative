/**
 * Settings: the identity of the wiki and the pages it puts forward.
 *
 * These fields live in `meta`, so a change here is a local change like any
 * other: it has to reach the header, the home page and the browser's storage.
 *
 * @author Claude
 */

import type { Page } from "@playwright/test";
import { PAGES, UNIVERSE } from "./utilities/dataset";
import { expect, isNarrow, test, type WikiHelper } from "./utilities/fixtures";

/**
 * Reaches the settings the way a reader does, from a page already open.
 *
 * Deliberately not a direct `goto`: the form snapshots the identity when the
 * component initialises, and on a cold load that happens before the overlay has
 * been read, so the fields come up empty. Unlike `/edit/[slug]`, which waits for
 * `wiki.overlayLoaded`, this page has no such guard. The link lives in the
 * authoring tools, hidden behind a burger below the `lg` breakpoint.
 *
 * @param page Page under test.
 * @param wiki Fixture helper.
 * @author Claude
 */
const openSettings = async ( page: Page, wiki: WikiHelper ): Promise<void> =>
{
    await wiki.open( "/" );

    if ( isNarrow( page ) )
    {
        await page.getByRole( "button", { name: "Ouvrir la navigation" } ).click();
        await page.getByRole( "navigation", { name: "Navigation mobile" } )
            .getByRole( "link", { name: "Paramètres" } ).click();
    }
    else
    {
        await page.getByRole( "button", { name: "Outils" } ).click();
        await page.getByRole( "banner" ).getByRole( "link", { name: "Paramètres" } ).click();
    }

    await expect( page ).toHaveURL( /\/settings$/ );
};

test.describe( "settings", () =>
{
    test( "renames the universe everywhere, and remembers it", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );

        await expect( page.getByLabel( "Nom de l'univers" ) ).toHaveValue( UNIVERSE );

        await page.getByLabel( "Nom de l'univers" ).fill( "" );

        await expect( page.getByRole( "button", { name: "Enregistrer" } ) ).toBeDisabled();

        await page.getByLabel( "Nom de l'univers" ).fill( "Périclès, second cycle" );

        await expect( page.getByText( "Modifications non enregistrées" ) ).toBeVisible();

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page.getByText( "Identité enregistrée." ) ).toBeVisible();
        await expect( page.getByRole( "banner" ) ).toContainText( "Périclès, second cycle" );

        await page.reload();

        await expect( page.getByRole( "banner" ) ).toContainText( "Périclès, second cycle" );
        expect( ( await wiki.storedOverlay() )?.meta?.universe ).toBe( "Périclès, second cycle" );
    } );

    test( "changes the pages put forward on the home page", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );

        const featured = page.locator( "section" ).filter( { hasText: "Fiches à la une" } );

        await expect( featured.getByRole( "listitem" ) ).toHaveCount( 3 );

        await featured.getByRole( "listitem" ).filter( { hasText: PAGES.athena.title } )
            .getByRole( "button", { name: "Retirer" } ).click();

        await featured.getByRole( "button", { name: "Ajouter une fiche" } ).click();
        await page.getByPlaceholder( "Titre de la fiche à lier" ).fill( PAGES.doctrine.title );
        await page.getByRole( "button", { name: `${ PAGES.doctrine.title } /wiki/${ PAGES.doctrine.slug }` } ).click();

        await expect( featured.getByRole( "listitem" ) ).toHaveCount( 3 );

        await page.getByRole( "button", { name: "Enregistrer" } ).click();
        await page.goto( "/" );

        const highlight = page.locator( "section" ).filter( { hasText: "À la une" } );

        await expect( highlight.getByRole( "heading", { name: PAGES.port.title } ) ).toBeVisible();
        await expect( highlight.getByRole( "heading", { name: PAGES.athena.title } ) ).toBeHidden();
    } );

    test( "goes back to the default identity once confirmed", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );

        await page.getByLabel( "Signature" ).fill( "Une signature de passage." );
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await page.getByRole( "button", { name: "Revenir à l'identité par défaut" } ).click();
        await page.getByRole( "dialog", { name: "Revenir à l'identité par défaut ?" } )
            .getByRole( "button", { name: "Revenir" } ).click();

        // The seed is empty for every reader, so the default identity is the nameless one.
        await expect( page.getByLabel( "Nom de l'univers" ) ).toHaveValue( "Univers sans nom" );
        expect( ( await wiki.storedOverlay() )?.meta ).toBeNull();
    } );
} );
