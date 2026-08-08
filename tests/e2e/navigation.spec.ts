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
import { expect, isNarrow, test, THEME_KEY } from "./utilities/fixtures";

test.describe( "site frame", () =>
{
    test( "reaches every reading section from the header", async ( { page, wiki } ) =>
    {
        await wiki.open();

        await wiki.navigate( "Encyclopédie" );
        await expect( page ).toHaveURL( /\/wiki$/ );

        await wiki.navigate( "Catégories" );
        await expect( page ).toHaveURL( /\/categories$/ );

        await wiki.navigate( "En direct" );
        await expect( page ).toHaveURL( /\/live$/ );

        await wiki.navigate( "Chronologie" );
        await expect( page ).toHaveURL( /\/timeline$/ );
    } );

    test( "reaches the authoring tools", async ( { page, wiki } ) =>
    {
        await wiki.open();

        if ( isNarrow( page ) )
        {
            await page.getByRole( "button", { name: "Ouvrir la navigation" } ).click();
            await page.getByRole( "navigation", { name: "Navigation mobile" } )
                .getByRole( "link", { name: "Tableau de bord" } ).click();
        }
        else
        {
            await page.getByRole( "button", { name: "Outils" } ).click();
            await page.getByRole( "banner" ).getByRole( "link", { name: "Tableau de bord" } ).click();
        }

        await expect( page ).toHaveURL( /\/dashboard$/ );
    } );

    test( "searches by title, by alias, and says when nothing matches", async ( { page, wiki } ) =>
    {
        await wiki.open();

        await page.keyboard.press( "Control+k" );

        const palette = page.getByRole( "dialog", { name: "Rechercher une fiche" } );

        await expect( palette ).toBeVisible();

        await page.keyboard.type( "zzzz" );

        await expect( palette ).toContainText( "Aucune fiche ne correspond" );

        // The field is a `search` input, and Chromium gives it the first Escape to
        // empty itself. The palette closes on the next one.
        await page.keyboard.press( "Escape" );
        await page.keyboard.press( "Escape" );

        await expect( palette ).toBeHidden();

        await page.getByRole( "button", { name: "Rechercher" } ).click();
        await page.keyboard.type( "la vance" );

        // The best match leads, and it is the one Entrée validates.
        await expect( palette.getByRole( "button" ).first() ).toContainText( PAGES.athena.title );

        await page.keyboard.press( "Enter" );

        await expect( page ).toHaveURL( new RegExp( `/wiki/${ PAGES.athena.slug }$` ) );
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
