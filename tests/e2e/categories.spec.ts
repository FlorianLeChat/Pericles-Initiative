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
    description: "Les quais flottants où les cités s’amarrent.",
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

        await expect( page.getByText( `Rangée sous ${ CATEGORIES.sites.name }` ) ).toBeVisible();
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

        // The subcategory row names its parent too, «Rangée sous …», so it is left out by that line.
        await page.locator( "article" ).filter( { hasText: CATEGORIES.sites.name } ).filter( { hasNotText: "Rangée sous" } )
            .getByRole( "button", { name: "Modifier" } ).click();

        await page.getByLabel( "Adresse" ).fill( "sites-du-port" );
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page.getByText( "/categories/sites-du-port" ) ).toBeVisible();

        expect( ( await wiki.storedOverlay() )?.categories[ PONTOONS.slug ]?.parent ).toBe( "sites-du-port" );

        await page.goto( "/categories/sites-du-port" );

        await expect( page.getByRole( "link", { name: PAGES.port.title } ) ).toBeVisible();
        expect( ( await wiki.storedEntry( PAGES.port.slug ) )?.categories ).toEqual( [ "sites-du-port" ] );
    } );

    test( "deletes a category and detaches its pages without erasing them", async ( { page, wiki } ) =>
    {
        await wiki.open( "/categories/manage" );

        await page.locator( "article" ).filter( { hasText: CATEGORIES.doctrines.name } )
            .getByRole( "button", { name: "Supprimer" } ).click();

        await wiki.confirm( "Supprimer cette catégorie ?", "Supprimer" );

        await expect( page.getByText( `/categories/${ CATEGORIES.doctrines.slug }` ) ).toBeHidden();

        await page.goto( `/entries/${ PAGES.doctrine.slug }` );

        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( PAGES.doctrine.title );
        expect( ( await wiki.storedEntry( PAGES.doctrine.slug ) )?.categories ).toEqual( [] );
    } );
} );
