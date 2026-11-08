/**
 * The frame around every page: navigation, search palette and theme.
 *
 * The header shows its links from the `lg` breakpoint up and hides them behind a
 * burger below, so these tests branch on the viewport of the running project
 * rather than assuming a desktop.
 *
 * @author Claude
 */

import { CATEGORIES, MISSING_SLUG, PAGES } from "./utilities/dataset";
import { expect, isNarrow, test, THEME_KEY } from "./utilities/fixtures";

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

        // A mistyped address is told in the reader's language, and names what was asked for.
        await wiki.open( "/nulle-part" );

        await expect( page.getByRole( "heading", { level: 1, name: "Cette page ne figure pas dans les archives" } ) )
            .toBeVisible();
        await expect( page.getByRole( "main" ) ).toContainText( "Aucune page n'est rangée à l'adresse /nulle-part/" );
        await expect( page.getByText( "Not Found" ) ).toHaveCount( 0 );

        // A mistyped address usually means a page under another spelling, so the search is one press away.
        await page.getByRole( "main" ).getByRole( "button", { name: "Chercher une fiche" } ).click();

        const palette = page.getByRole( "dialog", { name: "Rechercher une fiche" } );

        await expect( palette ).toBeVisible();
        await page.keyboard.press( "Escape" );
        await expect( palette ).toBeHidden();

        if ( isNarrow( page ) )
        {
            // The drawer's two groups are headings, and the tools a list named by the second.
            await page.getByRole( "button", { name: "Ouvrir la navigation" } ).click();

            const drawer = page.getByRole( "dialog" );

            await expect( drawer.getByRole( "heading", { level: 2, name: "Navigation" } ) ).toBeVisible();
            await expect( drawer.getByRole( "list", { name: "Outils" } ).getByRole( "link" ) ).toHaveCount( 3 );
        }
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

    test( "offers the last edits, explains its hits, hands them to the index, and creates", async ( { page, wiki } ) =>
    {
        await wiki.open();

        await page.keyboard.press( "Control+k" );

        const palette = page.getByRole( "dialog", { name: "Rechercher une fiche" } );

        await expect( palette.getByText( "Modifiées récemment" ) ).toBeVisible();
        await expect( palette.getByRole( "option" ).first() ).toHaveAttribute( "aria-selected", "true" );

        await page.keyboard.type( "zzzz" );

        await expect( palette ).toContainText( "Aucune fiche ne correspond" );

        // A phone has no Escape key: the palette carries its own way out there.
        const close = palette.getByRole( "button", { name: "Fermer" } );

        if ( isNarrow( page ) )
        {
            await close.click();
        }
        else
        {
            await expect( close ).toBeHidden();
            await page.keyboard.press( "Escape" );
        }

        await expect( palette ).toBeHidden();

        await page.getByRole( "button", { name: "Rechercher" } ).click();
        await page.keyboard.type( "la vance" );

        const byAlias = palette.getByRole( "option" ).first();

        await expect( byAlias ).toContainText( PAGES.athena.title );
        await expect( byAlias ).toContainText( "Autre nom : La Vance" );
        await expect( byAlias ).toContainText( CATEGORIES.institutions.name );
        await expect( byAlias ).toHaveAttribute( "aria-selected", "true" );
        await expect( palette.getByRole( "option", { name: "Créer la fiche « La vance »" } ) ).toBeVisible();

        await page.keyboard.press( "Enter" );

        await expect( page ).toHaveURL( new RegExp( `/entries/${ PAGES.athena.slug }/$` ) );
        await expect( page.getByRole( "heading", { name: PAGES.athena.title, level: 1 } ) ).toBeVisible();

        await page.keyboard.press( "Control+k" );
        await page.keyboard.type( "athena" );

        await expect( palette.getByRole( "option", { name: new RegExp( PAGES.port.title ) } ) ).toContainText( "Athéna Vance" );

        const found = await palette.getByRole( "option" ).filter( { hasNotText: /Voir tous|Créer la fiche/ } ).count();

        await palette.getByRole( "option", { name: "Voir tous les résultats pour « athena » dans l'encyclopédie" } ).click();

        await expect( page ).toHaveURL( /\/entries\/\?q=athena$/ );
        await expect( page.getByLabel( "Filtrer les fiches" ) ).toHaveValue( "athena" );
        await expect( page.getByRole( "main" ).getByRole( "article" ) ).toHaveCount( found );

        // A page still to write is found too, with who waits for it, and takes the place of its creation.
        await page.keyboard.press( "Control+k" );
        await page.keyboard.type( "conseil des parties" );

        const waiting = palette.getByRole( "option", { name: /^Conseil des parties À écrire/ } );

        await expect( waiting ).toContainText( /À écrire · citée \d+ fois/ );
        await expect( palette.getByRole( "option", { name: /^Créer la fiche/ } ) ).toHaveCount( 0 );

        await waiting.click();

        await expect( page ).toHaveURL( new RegExp( `/entries/${ MISSING_SLUG }/$` ) );

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
