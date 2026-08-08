/**
 * Index of the encyclopedia: filtering, sorting and the empty states.
 *
 * This listing is also what the prerenderer crawls, which is why it must show
 * drafts alongside published pages.
 *
 * @author Claude
 */

import type { Locator, Page } from "@playwright/test";
import { CATEGORIES, COUNTS, PAGES } from "./utilities/dataset";
import { expect, test } from "./utilities/fixtures";

/**
 * Locates the cards of the listing, one per page shown.
 *
 * @param page Page under test.
 * @returns Every card currently displayed.
 * @author Claude
 */
const cards = ( page: Page ): Locator => page.getByRole( "main" ).locator( "article" );

/**
 * Locates one of the filter dropdowns, by an option only it offers.
 *
 * Their labels wrap the control, so the accessible name of each one carries the
 * text of all of its options and no two of them can be told apart by name.
 *
 * @param page Page under test.
 * @param option Value of an option unique to the wanted dropdown.
 * @returns The dropdown.
 * @author Claude
 */
const dropdown = ( page: Page, option: string ): Locator =>
    page.locator( "select" ).filter( { has: page.locator( `option[value="${ option }"]` ) } );

test.describe( "encyclopedia index", () =>
{
    test( "invites writing the first page when the corpus is empty", async ( { page, wiki } ) =>
    {
        await wiki.openEmpty( "/wiki" );

        await expect( page.getByText( "Aucune fiche pour le moment" ) ).toBeVisible();

        await page.getByRole( "link", { name: "Créer une fiche" } ).click();

        await expect( page ).toHaveURL( /\/new$/ );
    } );

    test( "lists every page, drafts included", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );

        await expect( page.getByText( `${ COUNTS.entries } fiches, dont ${ COUNTS.drafts } en brouillon.` ) )
            .toBeVisible();
        await expect( cards( page ) ).toHaveCount( COUNTS.entries );
        await expect( page.getByRole( "link", { name: PAGES.sceau.title } ) ).toBeVisible();
        await expect( page.getByText( "Brouillon", { exact: true } ) ).toBeVisible();
    } );

    test( "filters by keyword, by nature, by category and by status", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );

        // Accents aside: the query is deburred before it is matched.
        await page.getByLabel( "Filtrer les fiches" ).fill( "athena" );

        await expect( cards( page ) ).toHaveCount( 1 );
        await expect( page.getByRole( "link", { name: PAGES.athena.title } ) ).toBeVisible();

        await page.getByLabel( "Filtrer les fiches" ).fill( "" );
        await page.getByRole( "button", { name: "Lieux" } ).click();

        await expect( cards( page ) ).toHaveCount( 1 );
        await expect( page.getByRole( "link", { name: PAGES.port.title } ) ).toBeVisible();

        await page.getByRole( "button", { name: "Toutes natures" } ).click();
        await dropdown( page, CATEGORIES.institutions.slug ).selectOption( CATEGORIES.institutions.slug );

        await expect( cards( page ) ).toHaveCount( COUNTS.institutions );

        await dropdown( page, CATEGORIES.institutions.slug ).selectOption( "toutes" );
        await dropdown( page, "brouillon" ).selectOption( "brouillon" );

        await expect( cards( page ) ).toHaveCount( COUNTS.drafts );
        await expect( page.getByRole( "link", { name: PAGES.sceau.title } ) ).toBeVisible();
    } );

    test( "explains a combination of filters matching nothing, and clears it", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );

        await page.getByLabel( "Filtrer les fiches" ).fill( "une requête qui ne mène nulle part" );

        await expect( page.getByText( "Aucune fiche ne correspond" ) ).toBeVisible();

        await page.getByRole( "button", { name: "Réinitialiser les filtres" } ).click();

        await expect( cards( page ) ).toHaveCount( COUNTS.entries );
    } );

    test( "sorts by in universe date", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );

        await dropdown( page, "chronologique" ).selectOption( "chronologique" );

        await expect( cards( page ).first().getByRole( "heading" ) ).toHaveText( PAGES.port.title );

        await dropdown( page, "chronologique" ).selectOption( "alphabetique" );

        await expect( cards( page ).first().getByRole( "heading" ) ).toHaveText( PAGES.athena.title );
    } );
} );
