/**
 * Chronology of the dated pages.
 *
 * A page carries as many dates of reference as the fiction gives it, so the two
 * things to prove here are that one page can stand at two distant points, and
 * that a bare year, a year and a month, a full ISO date and a free text date all
 * sort and read correctly side by side.
 *
 * @author Claude
 */

import { expect, test } from "./utilities/fixtures";
import type { Locator, Page } from "@playwright/test";
import { COUNTS, DATES, PAGES, sampleDataset } from "./utilities/dataset";

/**
 * Locates one point of the chronology, by the intitulé of its date.
 *
 * By the intitulé rather than by the title of the page, which no longer
 * identifies a point: a page dated twice appears twice.
 *
 * @param page Page under test.
 * @param label Intitulé of the date.
 * @returns The point, its date and its page included.
 * @author Claude
 */
const point = ( page: Page, label: string ): Locator =>
    page.getByRole( "main" ).getByRole( "listitem" ).filter( { hasText: label } );

test.describe( "timeline", () =>
{
    test( "explains what fills the chronology when nothing is dated", async ( { page, wiki } ) =>
    {
        await wiki.openEmpty( "/timeline" );

        await expect( page.getByText( "Aucune fiche datée" ) ).toBeVisible();

        await page.getByRole( "link", { name: "Parcourir l'encyclopédie" } ).click();

        await expect( page ).toHaveURL( /\/entries\/$/ );
    } );

    test( "groups every published date by decade, a page standing at each of its own", async ( { page, wiki } ) =>
    {
        await wiki.open( "/timeline" );

        await expect( page.getByText( `${ COUNTS.datePoints } dates sur ${ COUNTS.dated } fiches.` ) ).toBeVisible();
        await expect( page.getByRole( "main" ).getByRole( "listitem" ) ).toHaveCount( COUNTS.datePoints );

        // The dated page of the fixture that is still a draft brings its date with
        // it, and neither may reach the frise.
        await expect( point( page, DATES.brouillon.label ) ).toBeHidden();
        await expect( page.getByRole( "link", { name: PAGES.sceau.title } ) ).toBeHidden();

        // The decades the fixture dates fall into, ascending, the free text one last.
        // The fixture spans a few decades only, well short of the switch to centuries.
        await expect( page.getByRole( "heading", { level: 2 } ) )
            .toHaveText( [ "2010 à 2019", "2020 à 2029", "2040 à 2049", "Sans année" ] );

        const forties = page.getByRole( "region", { name: "2040 à 2049" } );

        await expect( forties.getByRole( "listitem" ) ).toHaveCount( 3 );
        await expect( forties.getByText( PAGES.traite.summary ) ).toBeVisible();

        await expect( point( page, DATES.fondation.label ) ).toContainText( "2018" );
        await expect( point( page, DATES.deces.label ) ).toContainText( "12 juin 2043" );
        await expect( point( page, DATES.formulation.label ) ).toContainText( "mars 2044" );
        await expect( point( page, DATES.application.label ) ).toContainText( DATES.application.value );

        const birth = point( page, DATES.naissance.label );
        const death = point( page, DATES.deces.label );

        await expect( birth ).toContainText( PAGES.athena.title );
        await expect( death ).toContainText( PAGES.athena.title );
        await expect( birth ).toContainText( "14 mai 2020" );

        await death.getByRole( "link", { name: PAGES.athena.title } ).click();

        await expect( page ).toHaveURL( new RegExp( `/entries/${ PAGES.athena.slug }/$` ) );
    } );

    test( "gives a page's summary once per group, however many of its dates fall in it", async ( { page, wiki } ) =>
    {
        // Moving the birth of the sample into the decade of the death puts two dates
        // of the same page under one heading, which the sample alone never does.
        const dataset = sampleDataset();
        const athena = dataset.entries.find( ( entry ) => entry.id === PAGES.athena.id );
        const birth = athena?.dates.find( ( date ) => date.id === DATES.naissance.id );

        if ( birth )
        {
            birth.value = "2041-05-14";
        }

        await wiki.openWith( dataset, "/timeline" );

        const forties = page.getByRole( "region", { name: "2040 à 2049" } );

        await expect( forties.getByRole( "link", { name: PAGES.athena.title } ) ).toHaveCount( 2 );
        await expect( forties.getByText( PAGES.athena.summary ) ).toHaveCount( 1 );
        await expect( point( page, DATES.naissance.label ) ).toContainText( PAGES.athena.summary );
        await expect( point( page, DATES.deces.label ) ).not.toContainText( PAGES.athena.summary );
    } );
} );
