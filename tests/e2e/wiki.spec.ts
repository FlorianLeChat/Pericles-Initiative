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
 * Unfolds the filter panel when the viewport keeps it folded.
 *
 * The pills and the three menus are `hidden` below `sm`, behind a «Filtres»
 * button, so on the phone project every spec touching them has to open the panel
 * first. The button's own visibility is what decides, rather than a width: it is
 * the very condition being worked around, and it answers for whichever project
 * is running.
 *
 * @param page Page under test.
 * @returns Resolves once the controls can be reached.
 * @author Claude
 */
const showFilters = async ( page: Page ): Promise<void> =>
{
    const toggle = page.getByRole( "button", { name: /^Filtres/ } );

    if ( await toggle.isVisible() )
    {
        await toggle.click();
    }

    await expect( page.getByLabel( "Catégorie" ) ).toBeVisible();
};

test.describe( "encyclopedia index", () =>
{
    test( "invites writing the first page when the corpus is empty", async ( { page, wiki } ) =>
    {
        await wiki.openEmpty( "/wiki" );

        await expect( page.getByText( "Aucune fiche pour le moment" ) ).toBeVisible();
        await expect( page.getByRole( "region", { name: "Filtres" } ) ).toBeHidden();

        await page.getByRole( "link", { name: "Créer une fiche" } ).click();

        await expect( page ).toHaveURL( /\/new$/ );
    } );

    test( "lists every page, drafts included", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );

        await expect( page.getByText( `${ COUNTS.entries } fiches, dont ${ COUNTS.drafts } en brouillon.` ) ).toBeVisible();
        await expect( cards( page ) ).toHaveCount( COUNTS.entries );
        await expect( page.getByRole( "link", { name: PAGES.sceau.title } ) ).toBeVisible();
        await expect( page.getByText( "Brouillon", { exact: true } ) ).toBeVisible();
    } );

    test( "filters by keyword, by category and by status", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );
        await page.getByLabel( "Filtrer les fiches" ).fill( "athena" );

        await expect( cards( page ) ).toHaveCount( 1 );
        await expect( page.getByRole( "link", { name: PAGES.athena.title } ) ).toBeVisible();

        await page.getByLabel( "Filtrer les fiches" ).fill( "" );
        await showFilters( page );
        await page.getByLabel( "Catégorie" ).selectOption( CATEGORIES.institutions.slug );

        await expect( cards( page ) ).toHaveCount( COUNTS.institutions );

        await page.getByLabel( "Catégorie" ).selectOption( "toutes" );
        await page.getByLabel( "Statut" ).selectOption( "brouillon" );

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
        await showFilters( page );

        await page.getByLabel( "Tri" ).selectOption( "chronologique" );

        await expect( cards( page ).first().getByRole( "heading" ) ).toHaveText( PAGES.port.title );

        await page.getByLabel( "Tri" ).selectOption( "alphabetique" );

        await expect( cards( page ).first().getByRole( "heading" ) ).toHaveText( PAGES.athena.title );
    } );

    test( "counts what the filters keep, and clears them from the panel", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );

        const count = page.getByRole( "status" ).filter( { hasText: "fiche" } );

        await expect( count ).toHaveText( `${ COUNTS.entries } fiches` );
        await expect( page.getByRole( "button", { name: "Réinitialiser les filtres" } ) ).toBeHidden();

        await page.getByLabel( "Filtrer les fiches" ).fill( PAGES.athena.title );

        await expect( count ).toHaveText( `1 fiche sur ${ COUNTS.entries }` );

        await page.getByRole( "button", { name: "Réinitialiser les filtres" } ).click();

        await expect( cards( page ) ).toHaveCount( COUNTS.entries );
        await expect( page.getByLabel( "Filtrer les fiches" ) ).toHaveValue( "" );
    } );
} );
