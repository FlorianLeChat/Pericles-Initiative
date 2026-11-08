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
import { CATEGORIES, COUNTS, PAGES, sampleDataset } from "./utilities/dataset";

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
        await wiki.openEmpty( "/entries" );

        await expect( page.getByText( "Aucune fiche pour le moment" ) ).toBeVisible();
        await expect( page.getByRole( "region", { name: "Filtres" } ) ).toBeHidden();
        await expect( page.getByText( "Filtrez par catégorie" ) ).toHaveCount( 0 );
        await expect( page.getByRole( "main" ).getByRole( "link", { name: /contenu de démonstration/ } ) ).toBeVisible();

        await page.getByRole( "link", { name: "Créer une fiche" } ).click();

        await expect( page ).toHaveURL( /\/new\/$/ );
    } );

    test( "lists every page, drafts included, each row a single link", async ( { page, wiki } ) =>
    {
        await wiki.open( "/entries" );

        await expect( page.getByText( `${ COUNTS.entries } fiches, dont ${ COUNTS.drafts } en brouillon.` ) ).toBeVisible();
        await expect( rows( page ) ).toHaveCount( COUNTS.entries );

        // Creating a page is the header's job: nothing of the index stands between its lede and its filters.
        await expect( page.getByRole( "main" ).getByRole( "link", { name: "Nouvelle fiche" } ) ).toHaveCount( 0 );

        const draft = rows( page ).filter( { has: page.getByRole( "link", { name: PAGES.sceau.title } ) } );

        await expect( draft.getByText( "Brouillon", { exact: true } ) ).toBeVisible();

        const row = rows( page ).filter( { has: page.getByRole( "link", { name: PAGES.athena.title } ) } );

        await expect( row.getByRole( "link" ) ).toHaveCount( 1 );
        await expect( row.getByRole( "list", { name: "Catégories" } ) ).toHaveText( CATEGORIES.institutions.name );
        await expect( row.getByText( "Brouillon", { exact: true } ) ).toHaveCount( 0 );
    } );

    test( "sorts by title under letter headings, by in universe date and by last edit", async ( { page, wiki } ) =>
    {
        // A title opening on an article files under its next word, as a catalogue drawer does.
        const dataset = sampleDataset();
        const articled = `La ${ PAGES.doctrine.title.toLowerCase() }`;

        dataset.entries = dataset.entries.map( ( entry ) =>
            ( entry.slug === PAGES.doctrine.slug ? { ...entry, title: articled } : entry ) );
        await wiki.openWith( dataset, "/entries" );

        const initial = PAGES.athena.title.charAt( 0 );

        await expect( page.getByRole( "heading", { level: 2, name: initial, exact: true } ) ).toBeVisible();
        await expect( page.getByRole( "heading", { level: 2, name: "D", exact: true } ) ).toBeVisible();
        await expect( page.getByRole( "heading", { level: 2, name: "L", exact: true } ) ).toHaveCount( 0 );
        await expect( page.getByRole( "heading", { name: articled } ) ).toBeVisible();

        await showFilters( page );
        await page.getByLabel( "Tri" ).selectOption( "chronologique" );

        await expect( rows( page ).first().getByRole( "heading" ) ).toHaveText( PAGES.port.title );

        await page.getByLabel( "Tri" ).selectOption( "recent" );

        await expect( page.getByRole( "heading", { level: 2, name: initial, exact: true } ) ).toHaveCount( 0 );
        await expect( page.getByRole( "heading", { level: 2, name: "Les plus récemment modifiées" } ) ).toBeVisible();

        await page.getByLabel( "Tri" ).selectOption( "alphabetique" );

        await expect( rows( page ).first().getByRole( "heading" ) ).toHaveText( PAGES.athena.title );
    } );

    test( "opens on the ordering the address asks for", async ( { page, wiki } ) =>
    {
        await wiki.open( "/entries/?tri=recent" );

        await expect( rows( page ).first().getByRole( "heading" ) ).toHaveText( PAGES.athena.title );
        await expect( rows( page ).last().getByRole( "heading" ) ).toHaveText( PAGES.doctrine.title );

        await showFilters( page );

        await expect( page.getByLabel( "Tri" ) ).toHaveValue( "recent" );
    } );

    test( "filters by keyword, by category and by status", async ( { page, wiki } ) =>
    {
        await wiki.open( "/entries" );
        await page.getByLabel( "Filtrer les fiches" ).fill( "navigatrice" );

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

        // Filtered to drafts, the rows can be published together, and taken back from the toast.
        const publish = page.getByRole( "button", { name: "Publier la sélection" } );

        await expect( publish ).toBeDisabled();
        await page.getByRole( "checkbox", { name: `Sélectionner « ${ PAGES.sceau.title } »` } ).check();
        await expect( page.getByText( "1 fiche sélectionnée" ) ).toBeVisible();
        await publish.click();

        await expect( page.getByText( `Fiche « ${ PAGES.sceau.title } » publiée.` ) ).toBeVisible();
        await expect( rows( page ) ).toHaveCount( COUNTS.drafts - 1 );
        expect( ( await wiki.storedEntry( PAGES.sceau.slug ) )?.status ).toBe( "publie" );

        await page.getByRole( "button", { name: "Rétablir" } ).click();

        await expect( rows( page ) ).toHaveCount( COUNTS.drafts );
        expect( ( await wiki.storedEntry( PAGES.sceau.slug ) )?.status ).toBe( "brouillon" );
    } );

    test( "counts what the filters keep, explains when it is nothing, and clears them", async ( { page, wiki } ) =>
    {
        await wiki.open( "/entries" );

        const count = page.getByRole( "region", { name: "Filtres" } ).getByRole( "status" );

        // Unfiltered, the lede already counts every page: the filters say nothing until they narrow it.
        await expect( count ).toHaveText( "" );
        await expect( page.getByRole( "button", { name: "Réinitialiser les filtres" } ) ).toBeHidden();

        await page.getByLabel( "Filtrer les fiches" ).fill( PAGES.doctrine.title );

        await expect( count ).toHaveText( `1 fiche sur ${ COUNTS.entries }` );

        await page.getByLabel( "Filtrer les fiches" ).fill( "une requête qui ne mène nulle part" );

        await expect( page.getByText( "Aucune fiche ne correspond" ) ).toBeVisible();

        await page.getByRole( "button", { name: "Réinitialiser les filtres" } ).click();

        await expect( rows( page ) ).toHaveCount( COUNTS.entries );
        await expect( page.getByLabel( "Filtrer les fiches" ) ).toHaveValue( "" );
    } );
} );
