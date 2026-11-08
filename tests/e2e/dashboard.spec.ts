/**
 * Dashboard: the state of the corpus, and what is left to write.
 *
 * Everything here is derived from the link graph, so these tests are also what
 * proves the graph is built from the bodies rather than from a stored field.
 *
 * @author Claude
 */

import { expect, test } from "./utilities/fixtures";
import type { Locator, Page } from "@playwright/test";
import { CATEGORIES, COUNTS, MISSING_SLUG, PAGES, sampleDataset } from "./utilities/dataset";

/** A date of edit past the twelve months of the activity chart, whatever day the suite runs on. */
const QUIET_YEARS_AGO = "2001-01-01T00:00:00.000Z";

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
 * Locates one figure of the summary row, by its label.
 *
 * @param page Page under test.
 * @param label Label of the figure.
 * @returns The cell holding the label, the figure and its hint.
 * @author Claude
 */
const figure = ( page: Page, label: string ): Locator =>
    page.getByRole( "main" ).locator( "dl > div" ).filter( { has: page.locator( `dt:text-is("${ label }")` ) } );

/** How the dashboard titles a page nobody wrote yet: its slug, spaced, with a capital. */
const MISSING_TITLE = "Conseil des parties";

test.describe( "dashboard", () =>
{
    test( "ranks the most cited pages and lists the ones the corpus is asking for", async ( { page, wiki } ) =>
    {
        await wiki.open( "/dashboard" );

        const mostLinked = panel( page, "Fiches les plus citées" ).getByRole( "listitem" ).first();

        await expect( mostLinked ).toContainText( PAGES.athena.title );
        await expect( mostLinked ).toContainText( "citée 2 fois" );

        const missing = panel( page, "Pages à écrire" );

        const redLink = missing.getByRole( "link", { name: MISSING_TITLE, exact: true } );

        await expect( redLink ).toHaveClass( /wiki-link-missing/ );
        await expect( redLink ).toHaveAttribute( "href", `/entries/${ MISSING_SLUG }/` );
        await expect( missing ).toContainText( "citée 1 fois" );

        await missing.getByRole( "link", { name: `Créer la fiche « ${ MISSING_TITLE } »` } ).click();

        await expect( page ).toHaveURL( new RegExp( `/new/\\?slug=${ MISSING_SLUG }&titre=` ) );
    } );

    test( "spreads the edition activity over the last twelve months", async ( { page, wiki } ) =>
    {
        await wiki.open( "/dashboard" );

        const activity = panel( page, "Activité d'édition" );
        const months = activity.getByRole( "listitem" );

        await expect( activity ).toContainText( "Fiches modifiées chaque mois, de" );

        await expect( months ).toHaveCount( ACTIVITY_MONTHS );
        await expect( months.last() ).toContainText( MONTH_LABEL.format( new Date() ) );

        // Every page of the fixture was edited within the last week, so the whole
        // corpus is somewhere in the strip whatever day the suite runs on.
        const rows = await months.allInnerTexts();
        const counted = rows.reduce( ( total, row ) => total + Number( COUNT_IN_ROW.exec( row )?.[ 0 ] ?? 0 ), 0 );

        expect( counted ).toBe( COUNTS.entries );
    } );

    test( "invites an empty wiki to start, and says a quiet year in a sentence", async ( { page, wiki } ) =>
    {
        await wiki.openEmpty( "/dashboard" );

        // An empty wiki draws no panel of zeros: it points at the first page and at the demonstration.
        await expect( page.getByText( "Aucune fiche pour le moment" ) ).toBeVisible();
        await expect( page.getByRole( "main" ).getByRole( "link", { name: "Créer une fiche" } ) ).toBeVisible();
        await expect( page.getByRole( "main" ).getByRole( "link", { name: /contenu de démonstration/ } ) ).toBeVisible();
        await expect( page.getByRole( "heading", { name: "Activité d'édition" } ) ).toHaveCount( 0 );
        await expect( page.getByRole( "main" ).locator( "dl" ) ).toHaveCount( 0 );

        // A wiki whose pages were all edited long ago says so rather than drawing a year of zeros.
        const dataset = sampleDataset();

        dataset.entries = dataset.entries.map( ( entry ) => ( { ...entry, updatedAt: QUIET_YEARS_AGO } ) );
        await wiki.openWith( dataset, "/dashboard" );

        const activity = panel( page, "Activité d'édition" );

        await expect( activity ).toContainText( "Aucune fiche modifiée sur les douze derniers mois." );
        await expect( activity.getByRole( "listitem" ) ).toHaveCount( 0 );
    } );

    test( "counts the corpus, points at what it lacks, and breaks it down", async ( { page, wiki } ) =>
    {
        await wiki.open( "/dashboard" );

        await expect( figure( page, "Fiches" ) ).toContainText( String( COUNTS.entries ) );
        await expect( figure( page, "Fiches" ) )
            .toContainText( `${ COUNTS.published } publiées, ${ COUNTS.drafts } en brouillon` );
        await expect( figure( page, "Catégories" ) ).toContainText( String( COUNTS.categories ) );
        await expect( figure( page, "En direct" ) ).toContainText( String( COUNTS.live ) );

        const issues = panel( page, "Points d'attention" );

        // The panel says what it checks before it lists anything.
        await expect( issues ).toContainText( "moins de 50 mots" );

        // One row per page, carrying every gap it has, however many there are.
        await expect( issues ).toContainText( "sans résumé" );
        await expect( issues ).toContainText( "sans date" );
        await expect( issues.getByRole( "link", { name: PAGES.sceau.title, exact: true } ) ).toHaveCount( 1 );
        await expect( issues.getByRole( "link", { name: PAGES.bureau.title, exact: true } ) ).toHaveCount( 1 );

        // A page lacking only length is counted under the list rather than listed.
        await expect( issues.getByText( /^Et \d+ fiches? à qui il ne manque que de la longueur, sous 50 mots\.$/ ) ).toBeVisible();

        // Every point of attention is something to fix, so each page has its way into the editor.
        await expect( issues.getByRole( "link", { name: `Modifier la fiche « ${ PAGES.sceau.title } »` } ) )
            .toHaveAttribute( "href", `/edit/${ PAGES.sceau.slug }/` );

        await expect( panel( page, "Dernières modifications" ).getByRole( "listitem" ).first() )
            .toContainText( PAGES.athena.title );

        await expect( panel( page, "Par catégorie" ) ).toContainText( `dont ${ COUNTS.doctrineDrafts } en brouillon` );

        await panel( page, "Par catégorie" ).getByRole( "link", { name: CATEGORIES.institutions.name } ).click();

        await expect( page ).toHaveURL( new RegExp( `/categories/${ CATEGORIES.institutions.slug }/$` ) );
    } );
} );
