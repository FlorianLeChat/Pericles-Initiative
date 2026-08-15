/**
 * Dashboard: the state of the corpus, and what is left to write.
 *
 * Everything here is derived from the link graph, so these tests are also what
 * proves the graph is built from the bodies rather than from a stored field.
 *
 * @author Claude
 */

import type { Locator, Page } from "@playwright/test";
import { CATEGORIES, COUNTS, MISSING_SLUG, PAGES } from "./utilities/dataset";
import { expect, test } from "./utilities/fixtures";

/** How many months the activity chart draws, as `buildActivity` counts them. */
const ACTIVITY_MONTHS = 12;

/** How a month of that chart is named, as `src/lib/utilities/stats.ts` names it. */
const MONTH_LABEL = new Intl.DateTimeFormat( "fr-FR", { month: "short" } );

/** The figure of a row, the month label beside it carrying no digit of its own. */
const COUNT_IN_ROW = /\d+/;

/**
 * Locates one panel of the dashboard, by its heading.
 *
 * @param page Page under test.
 * @param heading Heading of the panel.
 * @returns The panel.
 * @author Claude
 */
const panel = ( page: Page, heading: string ): Locator =>
    page.locator( "section" ).filter( { has: page.getByRole( "heading", { name: heading, exact: true } ) } );

/**
 * Locates one figure of the dashboard, by its label.
 *
 * @param page Page under test.
 * @param label Label of the figure.
 * @returns The card holding it.
 * @author Claude
 */
const figure = ( page: Page, label: string ): Locator =>
    page.getByRole( "main" ).locator( "div" ).filter( { has: page.locator( `p:text-is("${ label }")` ) } ).last();

test.describe( "dashboard", () =>
{
    test( "counts the corpus and breaks it down", async ( { page, wiki } ) =>
    {
        await wiki.open( "/dashboard" );

        await expect( figure( page, "Fiches" ) ).toContainText( String( COUNTS.entries ) );
        await expect( figure( page, "Fiches" ) )
            .toContainText( `${ COUNTS.published } publiées, ${ COUNTS.drafts } en brouillon` );
        await expect( figure( page, "Catégories" ) ).toContainText( String( COUNTS.categories ) );
        await expect( figure( page, "Fil en direct" ) ).toContainText( String( COUNTS.live ) );

        await panel( page, "Par catégorie" ).getByRole( "link", { name: CATEGORIES.institutions.name } ).click();

        await expect( page ).toHaveURL( new RegExp( `/categories/${ CATEGORIES.institutions.slug }$` ) );
    } );

    test( "ranks the most cited pages and lists the ones the corpus is asking for", async ( { page, wiki } ) =>
    {
        await wiki.open( "/dashboard" );

        const mostLinked = panel( page, "Fiches les plus citées" ).getByRole( "listitem" ).first();

        await expect( mostLinked ).toContainText( PAGES.athena.title );
        await expect( mostLinked ).toContainText( "2 liens" );

        const missing = panel( page, "Pages à écrire" );

        await expect( missing ).toContainText( MISSING_SLUG );
        await expect( missing ).toContainText( "cité 1 fois" );

        await missing.getByRole( "link", { name: "Créer" } ).click();

        await expect( page ).toHaveURL( new RegExp( `/new\\?slug=${ MISSING_SLUG }$` ) );
    } );

    test( "spreads the edition activity over the last twelve months", async ( { page, wiki } ) =>
    {
        await wiki.open( "/dashboard" );

        const months = panel( page, "Activité d'édition" ).getByRole( "listitem" );

        await expect( months ).toHaveCount( ACTIVITY_MONTHS );
        await expect( months.last() ).toContainText( MONTH_LABEL.format( new Date() ) );

        // Every page of the fixture was edited within the last week, so the whole
        // corpus is somewhere in the strip whatever day the suite runs on.
        const rows = await months.allInnerTexts();
        const counted = rows.reduce( ( total, row ) => total + Number( COUNT_IN_ROW.exec( row )?.[ 0 ] ?? 0 ), 0 );

        expect( counted ).toBe( COUNTS.entries );
    } );

    test( "points at what the corpus is missing", async ( { page, wiki } ) =>
    {
        await wiki.open( "/dashboard" );

        const issues = panel( page, "Points d'attention" );

        await expect( issues ).toContainText( "Sans résumé" );
        await expect( issues ).toContainText( "Sans date de référence" );
        await expect( issues.getByRole( "link", { name: PAGES.sceau.title } ).first() ).toBeVisible();
        await expect( issues.getByRole( "link", { name: PAGES.bureau.title } ).first() ).toBeVisible();

        await expect( panel( page, "Dernières modifications" ).getByRole( "listitem" ).first() )
            .toContainText( PAGES.athena.title );
    } );
} );
