/**
 * Home page: the front page of the universe.
 *
 * @author Claude
 */

import { expect, test } from "./utilities/fixtures";
import { CATEGORIES, COUNTS, DESCRIPTION, LIVE, PAGES, UNIVERSE } from "./utilities/dataset";

/** The pages the fixture puts forward, in the order its settings list them. */
const FEATURED = [ PAGES.athena, PAGES.port, PAGES.traite ];

test.describe( "home page", () =>
{
    test( "invites writing the first page when the browser holds nothing", async ( { page, wiki } ) =>
    {
        await wiki.openEmpty();

        await expect( page.getByText( "Aucune fiche pour le moment" ) ).toBeVisible();
        await expect( page.getByRole( "heading", { name: "À la une" } ) ).toBeHidden();
        await expect( page.getByRole( "link", { name: "Essayer le contenu de démonstration" } ) ).toBeVisible();

        await page.getByRole( "link", { name: "Créer une fiche" } ).click();

        await expect( page ).toHaveURL( /\/new\/$/ );
    } );

    test( "opens on the universe, describes it once in its head, and searches it", async ( { page, wiki } ) =>
    {
        await wiki.open();

        await expect( page ).toHaveTitle( UNIVERSE );

        /*
         * Counts as much as it reads: the shell used to carry a description of its
         * own, injected ahead of the one the page renders, so the document held two
         * and the wrong one won.
         */
        const description = page.locator( "meta[name=\"description\"]" );

        await expect( page.locator( "title" ) ).toHaveCount( 1 );
        await expect( description ).toHaveCount( 1 );
        await expect( description ).toHaveAttribute( "content", DESCRIPTION );

        await expect( page.locator( "meta[property=\"og:title\"]" ) ).toHaveAttribute( "content", UNIVERSE );
        await expect( page.locator( "meta[name=\"twitter:description\"]" ) ).toHaveAttribute( "content", DESCRIPTION );

        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( UNIVERSE );
        await expect( page.getByRole( "main" ).getByText( DESCRIPTION ) ).toBeVisible();
        await expect( page.getByRole( "main" ).locator( "dl" ) ).toHaveCount( 0 );

        await page.getByRole( "button", { name: "Trouver une fiche, un lieu, un personnage" } ).click();

        await expect( page.getByRole( "dialog", { name: "Rechercher une fiche" } ) ).toBeVisible();
    } );

    test( "puts the chosen pages forward, and lists the latest edits without repeating them", async ( { page, wiki } ) =>
    {
        await wiki.open();

        const highlight = page.getByRole( "region", { name: "À la une" } );

        for ( const entry of FEATURED )
        {
            await expect( highlight.getByRole( "heading", { name: entry.title } ) ).toBeVisible();
        }

        const latest = page.getByRole( "region", { name: "Dernières modifications" } );

        await expect( latest.getByRole( "heading", { name: PAGES.bureau.title } ) ).toBeVisible();
        await expect( latest.getByRole( "heading", { name: PAGES.doctrine.title } ) ).toBeVisible();
        await expect( latest.getByRole( "heading", { name: PAGES.athena.title } ) ).toBeHidden();
        await expect( latest.getByRole( "heading", { level: 3 } ) ).toHaveCount( COUNTS.published - FEATURED.length );
        await expect( page.getByText( PAGES.sceau.title ) ).toBeHidden();

        await highlight.getByRole( "link", { name: PAGES.athena.title } ).click();

        await expect( page ).toHaveURL( new RegExp( `/entries/${ PAGES.athena.slug }/$` ) );
    } );

    test( "picks up the live feed, marks what is pinned, and counts every category", async ( { page, wiki } ) =>
    {
        await wiki.open();

        const feed = page.getByRole( "region", { name: "En direct" } );

        await expect( feed.getByRole( "link", { name: LIVE.recent.title } ) ).toBeVisible();

        const pinned = feed.getByRole( "listitem" ).filter( { hasText: LIVE.pinned.title } );
        const recent = feed.getByRole( "listitem" ).filter( { hasText: LIVE.recent.title } );

        await expect( pinned.getByText( "Épinglée" ) ).toBeVisible();
        await expect( recent.getByText( "Épinglée" ) ).toBeHidden();

        await expect( page.getByRole( "link", {
            name: `${ CATEGORIES.institutions.name } ${ COUNTS.institutions }`
        } ) ).toBeVisible();

        await feed.getByRole( "link", { name: "Tout le fil" } ).click();

        await expect( page ).toHaveURL( /\/live\/$/ );
    } );
} );
