/**
 * Settings: the identity of the wiki and the pages it puts forward.
 *
 * These fields live in `meta`, so a change here is a local change like any
 * other: it has to reach the header, the home page and the browser's storage.
 *
 * @author Claude
 */

import type { Locator, Page } from "@playwright/test";
import { ACCENTS, DEFAULT_ACCENT, type Accent } from "$lib/config/accents";
import { PAGES, UNIVERSE } from "./utilities/dataset";
import { expect, isNarrow, test, waitForDrawer, type WikiHelper } from "./utilities/fixtures";

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
        await waitForDrawer( page );
    }
    else
    {
        await page.getByRole( "button", { name: "Outils" } ).click();
        await page.getByRole( "menuitem", { name: "Paramètres" } ).click();
    }

    await expect( page ).toHaveURL( /\/settings$/ );
};

/**
 * Reads the colour one pill of the accent picker is painted in.
 *
 * The radio is stretched over its pill and invisible, so the surface to measure is
 * the label around it.
 *
 * @param radio Radio the pill wraps.
 * @returns Computed background colour of the pill.
 * @author Claude
 */
const tintOf = ( radio: Locator ): Promise<string> =>
    radio.evaluate( ( input ) => getComputedStyle( input.closest( "label" ) as HTMLElement ).backgroundColor );

test.describe( "settings", () =>
{
    test( "renames the universe everywhere, and remembers it", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );

        await expect( page.getByLabel( "Nom de l'univers" ) ).toHaveValue( UNIVERSE );

        await page.getByLabel( "Nom de l'univers" ).fill( "" );

        await expect( page.getByRole( "button", { name: "Enregistrer" } ) ).toBeDisabled();

        await page.getByLabel( "Nom de l'univers" ).fill( "Périclès, second cycle" );

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page.getByText( "Enregistré." ) ).toBeVisible();
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

    test( "repaints the whole site in the chosen colour, and remembers it", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );

        const chosen = ACCENTS.find( ( accent ) => accent.key !== DEFAULT_ACCENT ) as Accent;
        const pill = ( accent: Accent ): Locator => page.getByRole( "radio", { name: accent.label } );

        await expect( page.locator( "html" ) ).toHaveAttribute( "data-accent", DEFAULT_ACCENT );

        const tints = await Promise.all( ACCENTS.map( ( accent ) => tintOf( pill( accent ) ) ) );

        expect( new Set( tints ).size ).toBe( ACCENTS.length );

        await pill( chosen ).check();
        await expect( page.locator( "html" ) ).toHaveAttribute( "data-accent", DEFAULT_ACCENT );

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page.locator( "html" ) ).toHaveAttribute( "data-accent", chosen.key );

        await page.reload();

        await expect( page.locator( "html" ) ).toHaveAttribute( "data-accent", chosen.key );
        expect( ( await wiki.storedOverlay() )?.meta?.accent ).toBe( chosen.key );
    } );

    test( "goes back to the default identity once confirmed", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );

        await page.getByLabel( "Signature" ).fill( "Une signature de passage." );
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await page.getByRole( "button", { name: "Tout remettre par défaut" } ).click();
        await wiki.confirm( "Tout remettre par défaut ?", "Remettre" );

        // The seed is empty for every reader, so the default identity is the nameless one.
        await expect( page.getByLabel( "Nom de l'univers" ) ).toHaveValue( "Univers sans nom" );
        expect( ( await wiki.storedOverlay() )?.meta ).toBeNull();
    } );
} );
