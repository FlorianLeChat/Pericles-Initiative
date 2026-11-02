/**
 * The frame around every page: navigation, search palette and theme.
 *
 * The header shows its links from the `lg` breakpoint up and hides them behind a
 * burger below, so these tests branch on the viewport of the running project
 * rather than assuming a desktop.
 *
 * @author Claude
 */

import { PAGES } from "./utilities/dataset";
import { expect, test, THEME_KEY } from "./utilities/fixtures";

test.describe( "site frame", () =>
{
    test( "reaches every reading section from the header", async ( { page, wiki } ) =>
    {
        await wiki.open();

        await wiki.navigate( "Encyclopédie" );
        await expect( page ).toHaveURL( /\/entries\/$/ );

        await wiki.navigate( "Catégories" );
        await expect( page ).toHaveURL( /\/categories\/$/ );

        await wiki.navigate( "En direct" );
        await expect( page ).toHaveURL( /\/live\/$/ );

        await wiki.navigate( "Chronologie" );
        await expect( page ).toHaveURL( /\/timeline\/$/ );
    } );

    test( "moves between the tools through their tabs, marking the current one", async ( { page, wiki } ) =>
    {
        await wiki.open( "/dashboard/" );

        const tabs = page.getByRole( "navigation", { name: "Outils" } );

        await expect( tabs.getByRole( "link", { name: "Tableau de bord" } ) ).toHaveAttribute( "aria-current", "page" );

        await tabs.getByRole( "link", { name: "Sauvegardes" } ).click();

        await expect( page ).toHaveURL( /\/data\/$/ );
        await expect( tabs.getByRole( "link", { name: "Sauvegardes" } ) ).toHaveAttribute( "aria-current", "page" );
        await expect( tabs.getByRole( "link", { name: "Tableau de bord" } ) ).not.toHaveAttribute( "aria-current" );

        await tabs.getByRole( "link", { name: "Paramètres" } ).click();

        await expect( page ).toHaveURL( /\/settings\/$/ );
        await expect( page.getByRole( "heading", { name: "Paramètres", level: 1 } ) ).toBeVisible();
    } );

    test( "offers the last edits, searches by alias, and creates what nothing matches", async ( { page, wiki } ) =>
    {
        await wiki.open();

        await page.keyboard.press( "Control+k" );

        const palette = page.getByRole( "dialog", { name: "Rechercher une fiche" } );

        await expect( palette.getByText( "Modifiées récemment" ) ).toBeVisible();
        await expect( palette.getByRole( "option" ).first() ).toHaveAttribute( "aria-selected", "true" );

        await page.keyboard.type( "zzzz" );

        await expect( palette ).toContainText( "Aucune fiche ne correspond" );

        await page.keyboard.press( "Escape" );

        await expect( palette ).toBeHidden();

        await page.getByRole( "button", { name: "Rechercher" } ).click();
        await page.keyboard.type( "la vance" );

        await expect( palette.getByRole( "option" ).first() ).toContainText( PAGES.athena.title );
        await expect( palette.getByRole( "option" ).first() ).toHaveAttribute( "aria-selected", "true" );

        await page.keyboard.press( "Enter" );

        await expect( page ).toHaveURL( new RegExp( `/entries/${ PAGES.athena.slug }/$` ) );

        await page.keyboard.press( "Control+k" );
        await page.keyboard.type( "Phare du Nord" );

        const create = palette.getByRole( "option", { name: "Créer la fiche « Phare du Nord »" } );

        await expect( create ).toHaveAttribute( "aria-selected", "true" );

        await page.keyboard.press( "Enter" );

        await expect( page ).toHaveURL( /\/new\/\?slug=phare-du-nord&titre=Phare%20du%20Nord$/ );
        await expect( page.getByLabel( "Titre", { exact: true } ) ).toHaveValue( "Phare du Nord" );
    } );

    test( "flips the theme and remembers the choice", async ( { page, wiki } ) =>
    {
        await wiki.open();

        await page.getByRole( "button", { name: "Passer au thème sombre" } ).click();

        await expect( page.locator( "html" ) ).toHaveClass( /dark/ );
        expect( await page.evaluate( ( key ) => window.localStorage.getItem( key ), THEME_KEY ) ).toBe( "dark" );

        await page.reload();

        await expect( page.locator( "html" ) ).toHaveClass( /dark/ );

        await page.getByRole( "button", { name: "Passer au thème clair" } ).click();

        await expect( page.locator( "html" ) ).not.toHaveClass( /dark/ );
    } );
} );
