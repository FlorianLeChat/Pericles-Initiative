/**
 * Categories: the overview, one category, and their management.
 *
 * Categories are the one thing keyed by slug rather than by identifier, so
 * renaming one has to move every page over, which is what the management tests
 * are really about.
 *
 * @author Claude
 */

import { CATEGORIES, COUNTS, PAGES } from "./utilities/dataset";
import { expect, test } from "./utilities/fixtures";

test.describe( "categories", () =>
{
    test( "invites creating the first category when there is none", async ( { page, wiki } ) =>
    {
        await wiki.openEmpty( "/categories" );

        await expect( page.getByText( "Aucune catégorie", { exact: true } ) ).toBeVisible();

        await page.getByRole( "link", { name: "Créer une catégorie" } ).click();

        await expect( page ).toHaveURL( /\/categories\/manage\/$/ );
    } );

    test( "counts and lists the pages of a category", async ( { page, wiki } ) =>
    {
        await wiki.open( "/categories" );

        const card = page.getByRole( "link" ).filter( { hasText: CATEGORIES.institutions.name } );

        await expect( card ).toContainText( `${ COUNTS.institutions } fiches` );
        await expect( card ).toContainText( CATEGORIES.institutions.description );

        await card.click();

        await expect( page ).toHaveURL( new RegExp( `/categories/${ CATEGORIES.institutions.slug }/$` ) );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( CATEGORIES.institutions.name );
        await expect( page.getByRole( "link", { name: PAGES.athena.title } ) ).toBeVisible();
    } );

    test( "creates a category and refuses an address already in use", async ( { page, wiki } ) =>
    {
        await wiki.open( "/categories/manage" );

        await page.getByLabel( "Nom" ).fill( CATEGORIES.institutions.name );

        await expect( page.getByText( "Cette adresse est déjà utilisée." ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Créer" } ) ).toBeDisabled();

        await page.getByLabel( "Nom" ).fill( "Routes et courants" );

        await expect( page.getByLabel( "Adresse" ) ).toHaveValue( "routes-et-courants" );

        await page.getByLabel( "Description" ).fill( "Ce que la mer impose aux cités." );
        await page.getByRole( "button", { name: "Créer" } ).click();

        await expect( page.getByText( "/categories/routes-et-courants" ) ).toBeVisible();

        await page.goto( "/categories" );

        await expect( page.getByRole( "link" ).filter( { hasText: "Routes et courants" } ) ).toBeVisible();
    } );

    test( "renames a category and moves its pages to the new address", async ( { page, wiki } ) =>
    {
        await wiki.open( "/categories/manage" );

        await page.locator( "article" ).filter( { hasText: CATEGORIES.doctrines.name } )
            .getByRole( "button", { name: "Modifier" } ).click();

        await page.getByLabel( "Adresse" ).fill( "doctrines-maritimes" );
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page.getByText( "/categories/doctrines-maritimes" ) ).toBeVisible();

        await page.goto( "/categories/doctrines-maritimes" );

        await expect( page.getByRole( "link", { name: PAGES.doctrine.title } ) ).toBeVisible();
        expect( ( await wiki.storedEntry( PAGES.doctrine.slug ) )?.categories ).toEqual( [ "doctrines-maritimes" ] );
    } );

    test( "deletes a category and detaches its pages without erasing them", async ( { page, wiki } ) =>
    {
        await wiki.open( "/categories/manage" );

        await page.locator( "article" ).filter( { hasText: CATEGORIES.doctrines.name } )
            .getByRole( "button", { name: "Supprimer" } ).click();

        await wiki.confirm( "Supprimer cette catégorie ?", "Supprimer" );

        await expect( page.getByText( `/categories/${ CATEGORIES.doctrines.slug }` ) ).toBeHidden();

        await page.goto( `/wiki/${ PAGES.doctrine.slug }` );

        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( PAGES.doctrine.title );
        expect( ( await wiki.storedEntry( PAGES.doctrine.slug ) )?.categories ).toEqual( [] );
    } );
} );
