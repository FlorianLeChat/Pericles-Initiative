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

import type { Locator, Page } from "@playwright/test";
import { COUNTS, DATES, PAGES } from "./utilities/dataset";
import { expect, test } from "./utilities/fixtures";

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

        await expect( page ).toHaveURL( /\/wiki\/$/ );
    } );

    test( "counts dates rather than pages, and leaves the drafts out", async ( { page, wiki } ) =>
    {
        await wiki.open( "/timeline" );

        await expect( page.getByText( `${ COUNTS.datePoints } dates sur ${ COUNTS.dated } fiches.` ) ).toBeVisible();
        await expect( page.getByRole( "main" ).getByRole( "listitem" ) ).toHaveCount( COUNTS.datePoints );

        // The dated page of the fixture that is still a draft brings its date with
        // it, and neither may reach the frise.
        await expect( point( page, DATES.brouillon.label ) ).toBeHidden();
        await expect( page.getByRole( "link", { name: PAGES.sceau.title } ) ).toBeHidden();
    } );

    test( "groups the dates by year and reads every shape of date", async ( { page, wiki } ) =>
    {
        await wiki.open( "/timeline" );

        // The years the fixture dates fall into, ascending, the free text one last.
        await expect( page.getByRole( "heading", { level: 2 } ) )
            .toHaveText( [ "2018", "2020", "2043", "2044", "Sans année" ] );

        await expect( point( page, DATES.fondation.label ) ).toContainText( "2018" );
        await expect( point( page, DATES.deces.label ) ).toContainText( "12 juin 2043" );
        await expect( point( page, DATES.formulation.label ) ).toContainText( "mars 2044" );
        await expect( point( page, DATES.application.label ) ).toContainText( DATES.application.value );
    } );

    test( "stands a page at each of its dates", async ( { page, wiki } ) =>
    {
        await wiki.open( "/timeline" );

        const birth = point( page, DATES.naissance.label );
        const death = point( page, DATES.deces.label );

        await expect( birth ).toContainText( PAGES.athena.title );
        await expect( death ).toContainText( PAGES.athena.title );
        await expect( birth ).toContainText( "14 mai 2020" );

        await death.getByRole( "link", { name: PAGES.athena.title } ).click();

        await expect( page ).toHaveURL( new RegExp( `/wiki/${ PAGES.athena.slug }/$` ) );
    } );
} );
