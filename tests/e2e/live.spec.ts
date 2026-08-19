/**
 * Live feed: reading it, filtering it, and writing into it.
 *
 * The site wide alert banner belongs here too, since what raises it is a feed
 * item recent enough, and nothing else.
 *
 * @author Claude
 */

import type { Locator, Page } from "@playwright/test";
import { breakingDataset, COUNTS, LIVE, PAGES } from "./utilities/dataset";
import { expect, test } from "./utilities/fixtures";

/**
 * Locates one item of the feed, by its title.
 *
 * @param page Page under test.
 * @param title Title of the item.
 * @returns The item.
 * @author Claude
 */
const item = ( page: Page, title: string ): Locator => page.getByRole( "article" ).filter( { hasText: title } );

test.describe( "live feed", () =>
{
    test( "reads as an empty feed on a browser holding nothing", async ( { page, wiki } ) =>
    {
        await wiki.openEmpty( "/live" );

        await expect( page.getByText( "0 entrée." ) ).toBeVisible();
        await expect( page.getByText( "Aucune entrée à cette gravité" ) ).toBeVisible();
    } );

    test( "shows the pinned items first, then one group per day", async ( { page, wiki } ) =>
    {
        await wiki.open( "/live" );

        await expect( page.getByText( `${ COUNTS.live } entrées.` ) ).toBeVisible();
        await expect( page.getByRole( "heading", { level: 2 } ).first() ).toHaveText( "Épinglées" );
        await expect( item( page, LIVE.pinned.title ) ).toContainText( "Épinglée" );
        await expect( item( page, LIVE.older.title ) ).toContainText( "Source : Conseil des parties" );

        await item( page, LIVE.recent.title ).getByRole( "link", { name: "Lire la fiche complète" } ).click();

        await expect( page ).toHaveURL( new RegExp( `/wiki/${ PAGES.athena.slug }/$` ) );
    } );

    test( "filters by severity and by tag, and clears an empty result", async ( { page, wiki } ) =>
    {
        await wiki.open( "/live" );

        await page.getByRole( "radio", { name: "Urgent", exact: true } ).check();

        await expect( page.getByRole( "article" ) ).toHaveCount( 1 );
        await expect( item( page, LIVE.older.title ) ).toBeVisible();

        await page.getByRole( "radio", { name: "Toutes gravités" } ).check();
        await page.getByLabel( "Filtrer par étiquette" ).selectOption( "port" );

        await expect( page.getByRole( "article" ) ).toHaveCount( 1 );
        await expect( item( page, LIVE.pinned.title ) ).toBeVisible();

        await page.getByRole( "radio", { name: "Alerte", exact: true } ).check();

        await expect( page.getByText( "Aucune entrée à cette gravité" ) ).toBeVisible();

        await page.getByRole( "button", { name: "Tout afficher" } ).click();

        await expect( page.getByRole( "article" ) ).toHaveCount( COUNTS.live );
    } );

    test( "publishes an item, which shows up straight away", async ( { page, wiki } ) =>
    {
        await wiki.open( "/live" );

        await page.getByRole( "button", { name: "Publier une entrée" } ).click();

        await page.getByLabel( "Titre" ).fill( "Le détroit rouvre à la navigation" );
        await page.getByLabel( "Corps" ).fill( "Les quatre sas fonctionnent de nouveau." );
        await page.getByRole( "group", { name: "Gravité", exact: true } )
            .getByRole( "radio", { name: "Important", exact: true } ).check();
        await page.getByLabel( "Étiquettes" ).fill( "detroit" );
        await page.getByLabel( "Étiquettes" ).press( "Enter" );
        await page.getByRole( "button", { name: "Publier", exact: true } ).click();

        await expect( item( page, "Le détroit rouvre à la navigation" ) ).toBeVisible();
        await expect( page.getByRole( "article" ) ).toHaveCount( COUNTS.live + 1 );

        const stored = Object.values( ( await wiki.storedOverlay() )?.live ?? {} );

        expect( stored.map( ( entry ) => entry.title ) ).toContain( "Le détroit rouvre à la navigation" );
    } );

    test( "edits an item, then removes it", async ( { page, wiki } ) =>
    {
        await wiki.open( "/live" );

        await item( page, LIVE.older.title ).getByRole( "button", { name: "Modifier" } ).click();

        await expect( page.getByLabel( "Titre" ) ).toHaveValue( LIVE.older.title );

        await page.getByLabel( "Titre" ).fill( "Le traité des marées est suspendu" );
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( item( page, "Le traité des marées est suspendu" ) ).toBeVisible();

        await item( page, "Le traité des marées est suspendu" ).getByRole( "button", { name: "Supprimer" } ).click();
        await wiki.confirm( "Supprimer cette entrée ?", "Supprimer" );

        await expect( page.getByRole( "article" ) ).toHaveCount( COUNTS.live - 1 );
        expect( ( await wiki.storedOverlay() )?.live[ LIVE.older.id ] ).toBeUndefined();
    } );

    test( "raises a site wide banner while an alert is recent, until it is waved away", async ( { page, wiki } ) =>
    {
        const title = "Rupture de la digue nord";

        await wiki.openWith( breakingDataset( title ), "/" );

        const banner = page.getByRole( "complementary", { name: "Alerte en cours" } );

        await expect( banner.getByRole( "link", { name: title } ) ).toBeVisible();

        await banner.getByRole( "button", { name: "Masquer l'alerte" } ).click();

        await expect( banner ).toBeHidden();
    } );
} );
