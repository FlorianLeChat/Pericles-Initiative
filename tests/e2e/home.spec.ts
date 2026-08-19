/**
 * Home page: the editorial entry point into the encyclopedia.
 *
 * @author Claude
 */

import { CATEGORIES, COUNTS, DESCRIPTION, LIVE, PAGES, UNIVERSE } from "./utilities/dataset";
import { expect, heroFigure, test } from "./utilities/fixtures";

test.describe( "home page", () =>
{
    test( "invites writing the first page when the browser holds nothing", async ( { page, wiki } ) =>
    {
        await wiki.openEmpty();

        await expect( heroFigure( page, "Fiches" ) ).toHaveText( "0" );
        await expect( page.getByText( "Aucune fiche pour le moment" ) ).toBeVisible();
        await expect( page.getByRole( "heading", { name: "À la une" } ) ).toBeHidden();

        await page.getByRole( "link", { name: "Créer une fiche" } ).click();

        await expect( page ).toHaveURL( /\/new\/$/ );
    } );

    test( "presents the universe and counts what the corpus holds", async ( { page, wiki } ) =>
    {
        await wiki.open();

        await expect( page ).toHaveTitle( UNIVERSE );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( UNIVERSE );
        await expect( page.getByRole( "main" ).getByText( DESCRIPTION ) ).toBeVisible();

        await expect( heroFigure( page, "Fiches" ) ).toHaveText( String( COUNTS.published ) );
        await expect( heroFigure( page, "Catégories" ) ).toHaveText( String( COUNTS.categories ) );
        await expect( heroFigure( page, "Fiches datées" ) ).toHaveText( String( COUNTS.dated ) );
        await expect( heroFigure( page, "Brouillons" ) ).toHaveText( String( COUNTS.drafts ) );
    } );

    test( "highlights the chosen pages and the latest edits, never a draft", async ( { page, wiki } ) =>
    {
        await wiki.open();

        const highlight = page.locator( "section" ).filter( { hasText: "À la une" } );

        await expect( highlight.getByRole( "heading", { name: PAGES.athena.title } ) ).toBeVisible();
        await expect( highlight.getByRole( "heading", { name: PAGES.port.title } ) ).toBeVisible();

        const latest = page.locator( "section" ).filter( { hasText: "Dernières modifications" } );

        await expect( latest.getByRole( "heading", { level: 3 } ) ).toHaveCount( COUNTS.published );
        await expect( page.getByText( PAGES.sceau.title ) ).toBeHidden();

        await highlight.getByRole( "link", { name: "Lire la fiche" } ).click();

        await expect( page ).toHaveURL( new RegExp( `/wiki/${ PAGES.athena.slug }/$` ) );
    } );

    test( "picks up the live feed and counts every category", async ( { page, wiki } ) =>
    {
        await wiki.open();

        const feed = page.locator( "section" ).filter( { hasText: "En direct" } );

        await expect( feed.getByRole( "link", { name: LIVE.recent.title } ) ).toBeVisible();
        await expect( feed.getByRole( "link", { name: LIVE.pinned.title } ) ).toBeVisible();

        await expect( page.getByRole( "link", {
            name: `${ CATEGORIES.institutions.name } ${ COUNTS.institutions }`
        } ) ).toBeVisible();

        await feed.getByRole( "link", { name: "Tout le fil" } ).click();

        await expect( page ).toHaveURL( /\/live\/$/ );
    } );
} );
