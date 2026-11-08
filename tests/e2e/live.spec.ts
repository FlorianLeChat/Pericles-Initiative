/**
 * Live feed: reading it, filtering it, and writing into it.
 *
 * The site wide alert banner belongs here too, since what raises it is a feed
 * item recent enough, and nothing else.
 *
 * @author Claude
 */

import { expect, isNarrow, test } from "./utilities/fixtures";
import type { Locator, Page } from "@playwright/test";
import { breakingDataset, COUNTS, LIVE, midnightDataset, PAGES } from "./utilities/dataset";

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

        await expect( page.getByText( "0 entrée." ) ).toHaveCount( 0 );
        await expect( page.getByText( "Rien dans le fil pour l'instant" ) ).toBeVisible();
        await expect( page.getByText( "Aucune entrée à cette gravité" ) ).toHaveCount( 0 );
        await expect( page.getByRole( "radio" ) ).toHaveCount( 0 );
    } );

    test( "shows the pinned items first, then one group per day dated from the newest", async ( { page, wiki } ) =>
    {
        await wiki.open( "/live" );

        await expect( page.getByText( `${ COUNTS.live } entrées.` ) ).toBeVisible();
        await expect( page.getByRole( "heading", { level: 2 } ).first() ).toHaveText( "Épinglées" );
        // The heading says it of every item under it, so no item repeats it on its dateline.
        const pinnedGroup = page.locator( "section" ).filter( { has: page.getByRole( "heading", { name: "Épinglées" } ) } );

        await expect( pinnedGroup.getByRole( "article" ) ).toHaveText( [ new RegExp( LIVE.pinned.title ) ] );
        await expect( pinnedGroup.getByText( "Épinglée", { exact: true } ) ).toHaveCount( 0 );
        await expect( item( page, LIVE.older.title ) ).toContainText( "Source : Conseil des parties" );

        // Beside the feed on a desktop, an index names the groups and jumps to each.
        if ( !isNarrow( page ) )
        {
            const days = page.getByRole( "navigation", { name: "Dans le fil" } ).getByRole( "link" );

            await expect( days.first() ).toContainText( "Épinglées" );
            await days.last().click();
            await expect( page ).toHaveURL( /#live-\d{4}-\d{2}-\d{2}$/ );
        }

        // The fixture pins an older item, which the sentence used to read since it heads the feed.
        const sentence = page.getByText( "Dernière entrée" );

        await expect( sentence.locator( "time" ) ).toHaveAttribute( "datetime", LIVE.recent.publishedAt );

        await item( page, LIVE.recent.title ).getByRole( "link", { name: /^Lire la fiche « / } ).click();

        await expect( page ).toHaveURL( new RegExp( `/entries/${ PAGES.athena.slug }/$` ) );
    } );

    test.describe( "in Paris", () =>
    {
        test.use( { timezoneId: "Europe/Paris" } );

        test( "files a dispatch published after midnight under the reader's day", async ( { page, wiki } ) =>
        {
            const title = "La relève de minuit";

            await wiki.openWith( midnightDataset( title ), "/live" );

            // 23:32 in UTC is already the 7th in Paris, which the UTC prefix of the timestamp would miss.
            await expect( page.getByRole( "heading", { level: 2, name: "7 novembre 2026" } ) ).toBeVisible();
            await expect( page.getByRole( "heading", { level: 2, name: "6 novembre 2026" } ) ).toHaveCount( 0 );
        } );
    } );

    test( "filters by severity and by tag, and clears an empty result", async ( { page, wiki } ) =>
    {
        await wiki.open( "/live" );

        // A phone folds the filters behind a button, which then counts the ones narrowing the feed.
        const toggle = page.getByRole( "button", { name: /^Filtres/ } );

        if ( isNarrow( page ) )
        {
            await expect( page.getByRole( "radio", { name: "Urgent", exact: true } ) ).toBeHidden();
            await toggle.click();
        }

        await page.getByRole( "radio", { name: "Urgent", exact: true } ).check();

        await expect( page.getByRole( "article" ) ).toHaveCount( 1 );
        await expect( item( page, LIVE.older.title ) ).toBeVisible();

        if ( isNarrow( page ) )
        {
            await expect( toggle ).toHaveText( /Filtres\s*1/ );
        }

        await page.getByRole( "radio", { name: "Toutes gravités" } ).check();
        await page.getByLabel( "Filtrer par étiquette" ).selectOption( "port" );

        await expect( page.getByRole( "article" ) ).toHaveCount( 1 );
        await expect( item( page, LIVE.pinned.title ) ).toBeVisible();

        await page.getByRole( "radio", { name: "Alerte", exact: true } ).check();

        await expect( page.getByText( "Aucune entrée à cette gravité" ) ).toBeVisible();

        await page.getByRole( "button", { name: "Tout afficher" } ).click();

        await expect( page.getByRole( "article" ) ).toHaveCount( COUNTS.live );
    } );

    test( "publishes an item, which shows up straight away, then closes the form", async ( { page, wiki } ) =>
    {
        await wiki.open( "/live" );

        const open = page.getByRole( "button", { name: "Publier une entrée" } );

        await open.click();

        await expect( open ).toBeHidden();
        await expect( page.getByLabel( "Étiquettes" ) ).toBeHidden();

        await page.getByLabel( "Titre" ).fill( "Le détroit rouvre à la navigation" );
        await page.getByLabel( "Corps" ).fill( "Les quatre sas fonctionnent de nouveau." );

        // What an «Alerte» does to the whole site is said while it is picked, and only then.
        const gravity = page.getByRole( "group", { name: "Gravité", exact: true } );
        const bannerHint = page.getByText( "Affiche un bandeau sur tout le site pendant vingt-quatre heures." );

        await expect( bannerHint ).toBeHidden();
        await gravity.getByRole( "radio", { name: "Alerte", exact: true } ).check();
        await expect( bannerHint ).toBeVisible();
        await gravity.getByRole( "radio", { name: "Important", exact: true } ).check();
        await expect( bannerHint ).toBeHidden();
        await page.getByText( "Plus de précisions" ).click();
        await page.getByLabel( "Étiquettes" ).fill( "detroit" );
        await page.getByLabel( "Étiquettes" ).press( "Enter" );
        await page.getByRole( "button", { name: "Publier", exact: true } ).click();

        await expect( item( page, "Le détroit rouvre à la navigation" ) ).toBeVisible();
        await expect( page.getByRole( "article" ) ).toHaveCount( COUNTS.live + 1 );

        const stored = Object.values( ( await wiki.storedOverlay() )?.live ?? {} );

        expect( stored.map( ( entry ) => entry.title ) ).toContain( "Le détroit rouvre à la navigation" );

        await page.getByRole( "button", { name: "Fermer", exact: true } ).click();

        await expect( page.getByLabel( "Titre" ) ).toBeHidden();
        await expect( open ).toBeFocused();
    } );

    test( "edits an item, then removes it", async ( { page, wiki } ) =>
    {
        await wiki.open( "/live" );

        const edit = item( page, LIVE.older.title )
            .getByRole( "button", { name: `Modifier l'entrée « ${ LIVE.older.title } »` } );

        // A fingertip's 44px on a phone, the denser 36px where a pointer is likelier.
        expect( ( await edit.boundingBox() )?.height ).toBe( isNarrow( page ) ? 44 : 36 );

        await edit.click();

        await expect( page.getByLabel( "Titre" ) ).toHaveValue( LIVE.older.title );
        await expect( page.getByLabel( "Étiquettes" ) ).toBeVisible();

        await page.getByLabel( "Titre" ).fill( "Le traité des marées est suspendu" );
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( item( page, "Le traité des marées est suspendu" ) ).toBeVisible();

        await item( page, "Le traité des marées est suspendu" )
            .getByRole( "button", { name: "Supprimer l'entrée « Le traité des marées est suspendu »" } ).click();

        // No confirmation stands in front of it: the toast is the way back.
        await expect( page.getByRole( "dialog" ) ).toHaveCount( 0 );

        await expect( page.getByRole( "article" ) ).toHaveCount( COUNTS.live - 1 );
        expect( ( await wiki.storedOverlay() )?.live[ LIVE.older.id ] ).toBeUndefined();

        const undo = page.getByRole( "status" ).filter( { hasText: "Entrée « Le traité des marées est suspendu » retirée du fil." } );

        await expect( undo ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Fermer ce message" } ) ).toBeVisible();

        // The offer belongs to the page it was made on, and leaves with the reader.
        await wiki.navigate( "Encyclopédie" );

        await expect( page ).toHaveURL( /\/entries\/$/ );
        await expect( undo ).toBeHidden();

        await wiki.navigate( "En direct" );

        await expect( page.getByRole( "article" ) ).toHaveCount( COUNTS.live - 1 );
        await expect( undo ).toBeHidden();
    } );

    test( "raises a site wide banner while an alert is recent, until it is waved away", async ( { page, wiki } ) =>
    {
        const title = "Rupture de la digue nord";

        // Read in the dark theme, where the badge once took the accent rather than the catalogue red.
        await page.emulateMedia( { colorScheme: "dark" } );
        await wiki.openWith( breakingDataset( title ), "/" );

        const banner = page.getByRole( "complementary", { name: "Alerte en cours" } );

        await expect( banner.getByRole( "link", { name: title } ) ).toBeVisible();

        await banner.getByRole( "button", { name: "Masquer l'alerte" } ).click();

        await expect( banner ).toBeHidden();

        await wiki.navigate( "En direct" );
        await expect( page.locator( "html" ) ).toHaveClass( /\bdark\b/ );

        const badge = item( page, title ).getByText( "Alerte", { exact: true } );

        await expect( badge ).toHaveCSS( "background-color", "rgb(168, 35, 28)" );
    } );
} );
