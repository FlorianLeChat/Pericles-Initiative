/**
 * Categories: the overview, one category, and their management.
 *
 * Categories are the one thing keyed by slug rather than by identifier, so
 * renaming one has to move every page over, which is what the management tests
 * are really about.
 *
 * @author Claude
 */

import { expect, test } from "./utilities/fixtures";
import type { Category, Dataset } from "#lib/types.ts";
import { CATEGORIES, COUNTS, PAGES, sampleDataset } from "./utilities/dataset";

/** A category filed under one of the sample, which keeps all of its own at the top level. */
const PONTOONS: Category = {
    slug: "pontons",
    name: "Pontons",
    description: "Les quais flottants où les cités s'amarrent.",
    color: "vert",
    parent: CATEGORIES.sites.slug
};

/**
 * Builds the sample wiki with one subcategory, filed under the sites.
 *
 * @returns The dataset to install.
 * @author Claude
 */
const nestedDataset = (): Dataset =>
{
    const dataset = sampleDataset();

    dataset.categories.push( structuredClone( PONTOONS ) );

    return dataset;
};

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

        const link = page.getByRole( "link", { name: CATEGORIES.institutions.name, exact: true } );
        const row = page.getByRole( "listitem" ).filter( { has: link } );

        await expect( row ).toContainText( `${ COUNTS.institutions } fiches` );
        await expect( row ).toContainText( CATEGORIES.institutions.description );

        await link.click();

        await expect( page ).toHaveURL( new RegExp( `/categories/${ CATEGORIES.institutions.slug }/$` ) );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( CATEGORIES.institutions.name );

        // The breadcrumb starts flush with the title under it, as on an article.
        const crumbBox = await page.getByRole( "navigation", { name: "Fil d'Ariane" } ).getByRole( "link" ).first().boundingBox();
        const titleBox = await page.getByRole( "heading", { level: 1 } ).boundingBox();

        expect( Math.round( crumbBox?.x ?? -1 ) ).toBe( Math.round( titleBox?.x ?? 0 ) );

        const pages = page.getByRole( "region", { name: "Fiches de cette catégorie" } );

        await expect( pages.getByRole( "link", { name: PAGES.athena.title } ) ).toBeVisible();
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

    test( "files a new subcategory under its parent, on the overview and on both pages", async ( { page, wiki } ) =>
    {
        await wiki.open( "/categories/manage" );

        await page.getByLabel( "Nom" ).fill( PONTOONS.name );
        await page.getByLabel( "Catégorie parente" ).selectOption( { label: CATEGORIES.sites.name } );
        await page.getByRole( "button", { name: "Créer" } ).click();

        // The list follows the tree: the new subcategory stands right under its parent, behind its branch.
        const edits = page.getByRole( "button", { name: /^Modifier la catégorie / } );
        const order = await edits.evaluateAll( ( buttons ) => buttons.map( ( button ) => button.getAttribute( "aria-label" ) ) );

        expect( order.indexOf( `Modifier la catégorie ${ PONTOONS.name }` ) )
            .toBe( order.indexOf( `Modifier la catégorie ${ CATEGORIES.sites.name }` ) + 1 );
        expect( ( await wiki.storedOverlay() )?.categories[ PONTOONS.slug ]?.parent ).toBe( CATEGORIES.sites.slug );

        await page.goto( "/categories" );

        const parentLink = page.getByRole( "link", { name: CATEGORIES.sites.name, exact: true } );
        const parentRow = page.getByRole( "listitem" ).filter( { has: parentLink } );

        await expect( parentRow.getByRole( "list" ).getByRole( "link", { name: PONTOONS.name } ) ).toBeVisible();

        await parentLink.click();
        await page.getByRole( "region", { name: "Sous-catégories" } ).getByRole( "link", { name: PONTOONS.name } ).click();

        await expect( page ).toHaveURL( new RegExp( `/categories/${ PONTOONS.slug }/$` ) );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( PONTOONS.name );
        await expect( page.getByRole( "navigation", { name: "Fil d'Ariane" } )
            .getByRole( "link", { name: CATEGORIES.sites.name } ) ).toBeVisible();
    } );

    test( "renames a category, moving its pages and its subcategories to the new address", async ( { page, wiki } ) =>
    {
        await wiki.openWith( nestedDataset(), "/categories/manage" );

        await page.getByRole( "button", { name: `Modifier la catégorie ${ CATEGORIES.sites.name }`, exact: true } ).click();

        // The form may stand a screen above the row on a phone: its name field takes the focus.
        await expect( page.getByLabel( "Nom" ) ).toBeFocused();
        await page.getByLabel( "Adresse" ).fill( "sites-du-port" );
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page.getByText( "/categories/sites-du-port" ) ).toBeVisible();

        expect( ( await wiki.storedOverlay() )?.categories[ PONTOONS.slug ]?.parent ).toBe( "sites-du-port" );

        await page.goto( "/categories/sites-du-port" );

        await expect( page.getByRole( "link", { name: PAGES.port.title } ) ).toBeVisible();
        expect( ( await wiki.storedEntry( PAGES.port.slug ) )?.categories ).toEqual( [ "sites-du-port" ] );
    } );

    test( "deletes a category, detaches its pages without erasing them, and takes it back", async ( { page, wiki } ) =>
    {
        await wiki.open( "/categories/manage" );

        // The author's view counts drafts too, and says how many it holds.
        await expect( page.locator( "article" ).filter( { hasText: CATEGORIES.doctrines.name } ) )
            .toContainText( `dont ${ COUNTS.doctrineDrafts } en brouillon` );

        await page.locator( "article" ).filter( { hasText: CATEGORIES.doctrines.name } )
            .getByRole( "button", { name: "Supprimer" } ).click();

        await expect( page.getByRole( "dialog", { name: "Supprimer cette catégorie ?" } ) )
            .toContainText( "vous pourrez la rétablir juste après" );
        await wiki.confirm( "Supprimer cette catégorie ?", "Supprimer" );

        await expect( page.getByText( `/categories/${ CATEGORIES.doctrines.slug }` ) ).toBeHidden();
        expect( ( await wiki.storedEntry( PAGES.doctrine.slug ) )?.categories ).toEqual( [] );

        // The whole overlay comes back, so the category returns on every page it was taken off.
        await expect( page.getByRole( "status" ).filter( { hasText: `Catégorie « ${ CATEGORIES.doctrines.name } » supprimée.` } ) )
            .toBeVisible();
        await page.getByRole( "button", { name: "Rétablir" } ).click();

        await expect( page.getByText( `/categories/${ CATEGORIES.doctrines.slug }` ) ).toBeVisible();
        expect( ( await wiki.storedEntry( PAGES.doctrine.slug ) )?.categories ).toEqual( [ CATEGORIES.doctrines.slug ] );
    } );
} );
