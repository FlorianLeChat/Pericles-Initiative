/**
 * Index of the encyclopedia: filtering, sorting and the empty states.
 *
 * This listing is also what the prerenderer crawls, which is why it must show
 * drafts alongside published pages.
 *
 * @author Claude
 */

import { expect, test } from "./utilities/fixtures";
import type { Locator, Page } from "@playwright/test";
import { CATEGORIES, COUNTS, DATES, PAGES } from "./utilities/dataset";

/**
 * Locates the rows of the listing, one per page shown.
 *
 * @param page Page under test.
 * @returns Every row currently displayed.
 * @author Claude
 */
const rows = ( page: Page ): Locator => page.getByRole( "main" ).locator( "article" );

/**
 * Unfolds the filter panel when the viewport keeps it folded.
 *
 * The three menus are `hidden` below `sm`, behind a «Filtres»
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

    await expect( page.getByLabel( "Catégorie", { exact: true } ) ).toBeVisible();
};

test.describe( "encyclopedia index", () =>
{
    test( "invites writing the first page when the corpus is empty", async ( { page, wiki } ) =>
    {
        await wiki.openEmpty( "/wiki" );

        await expect( page.getByText( "Aucune fiche pour le moment" ) ).toBeVisible();
        await expect( page.getByRole( "region", { name: "Filtres" } ) ).toBeHidden();

        await page.getByRole( "link", { name: "Créer une fiche" } ).click();

        await expect( page ).toHaveURL( /\/new\/$/ );
    } );

    test( "lists every page, drafts included", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );

        await expect( page.getByText( `${ COUNTS.entries } fiches, dont ${ COUNTS.drafts } en brouillon.` ) ).toBeVisible();
        await expect( rows( page ) ).toHaveCount( COUNTS.entries );
        await expect( page.getByRole( "link", { name: PAGES.sceau.title } ) ).toBeVisible();

        const draft = rows( page ).filter( { has: page.getByRole( "link", { name: PAGES.sceau.title } ) } );

        await expect( draft.getByText( "Brouillon", { exact: true } ) ).toBeVisible();
    } );

    test( "gives each row a single link, its call number and its categories as plain text", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );

        const row = rows( page ).filter( { has: page.getByRole( "link", { name: PAGES.athena.title } ) } );

        // Three letters of the first category, the earliest year, three of the title.
        const callNumber = [
            CATEGORIES.institutions.name.slice( 0, 3 ),
            DATES.naissance.value.slice( 0, 4 ),
            PAGES.athena.title.slice( 0, 3 )
        ].join( " " ).toUpperCase();

        await expect( row.getByRole( "link" ) ).toHaveCount( 1 );
        await expect( row.getByText( callNumber, { exact: true } ) ).toBeVisible();
        await expect( row.getByRole( "list", { name: "Catégories" } ) ).toHaveText( CATEGORIES.institutions.name );
        await expect( row.getByText( "Brouillon", { exact: true } ) ).toHaveCount( 0 );
    } );

    test( "gathers the alphabetical ordering under letter headings", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );

        const initial = PAGES.athena.title.charAt( 0 );

        await expect( page.getByRole( "heading", { level: 2, name: initial, exact: true } ) ).toBeVisible();

        await showFilters( page );
        await page.getByLabel( "Tri" ).selectOption( "recent" );

        await expect( page.getByRole( "heading", { level: 2, name: initial, exact: true } ) ).toHaveCount( 0 );
        await expect( page.getByRole( "heading", { level: 2, name: "Les plus récemment modifiées" } ) ).toBeVisible();
    } );

    test( "opens on the ordering the address asks for", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki/?tri=recent" );

        await expect( rows( page ).first().getByRole( "heading" ) ).toHaveText( PAGES.athena.title );
        await expect( rows( page ).last().getByRole( "heading" ) ).toHaveText( PAGES.doctrine.title );

        await showFilters( page );

        await expect( page.getByLabel( "Tri" ) ).toHaveValue( "recent" );
    } );

    test( "filters by keyword, by category and by status", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );
        await page.getByLabel( "Filtrer les fiches" ).fill( "athena" );

        await expect( rows( page ) ).toHaveCount( 1 );
        await expect( page.getByRole( "link", { name: PAGES.athena.title } ) ).toBeVisible();

        await page.getByLabel( "Filtrer les fiches" ).fill( "" );
        await showFilters( page );
        await page.getByLabel( "Catégorie", { exact: true } ).selectOption( CATEGORIES.institutions.slug );

        await expect( rows( page ) ).toHaveCount( COUNTS.institutions );

        await page.getByLabel( "Catégorie", { exact: true } ).selectOption( "toutes" );
        await page.getByLabel( "Statut" ).selectOption( "brouillon" );

        await expect( rows( page ) ).toHaveCount( COUNTS.drafts );
        await expect( page.getByRole( "link", { name: PAGES.sceau.title } ) ).toBeVisible();
    } );

    test( "explains a combination of filters matching nothing, and clears it", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );

        await page.getByLabel( "Filtrer les fiches" ).fill( "une requête qui ne mène nulle part" );

        await expect( page.getByText( "Aucune fiche ne correspond" ) ).toBeVisible();

        await page.getByRole( "button", { name: "Réinitialiser les filtres" } ).click();

        await expect( rows( page ) ).toHaveCount( COUNTS.entries );
    } );

    test( "sorts by in universe date", async ( { page, wiki } ) =>
    {
        await wiki.open( "/wiki" );
        await showFilters( page );

        await page.getByLabel( "Tri" ).selectOption( "chronologique" );

        await expect( rows( page ).first().getByRole( "heading" ) ).toHaveText( PAGES.port.title );

        await page.getByLabel( "Tri" ).selectOption( "alphabetique" );

        await expect( rows( page ).first().getByRole( "heading" ) ).toHaveText( PAGES.athena.title );
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

        await expect( rows( page ) ).toHaveCount( COUNTS.entries );
        await expect( page.getByLabel( "Filtrer les fiches" ) ).toHaveValue( "" );
    } );
} );
