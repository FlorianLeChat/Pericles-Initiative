/**
 * Chronology of the dated pages.
 *
 * In universe dates are free text, so the point here is that a bare year, a year
 * and a month, and a full ISO date all sort and read correctly side by side.
 *
 * @author Claude
 */

import type { Locator, Page } from "@playwright/test";
import { COUNTS, PAGES } from "./utilities/dataset";
import { expect, test } from "./utilities/fixtures";

/**
 * Locates one entry of the chronology, by the title of its page.
 *
 * @param page Page under test.
 * @param title Title of the dated page.
 * @returns The entry, date included.
 * @author Claude
 */
const dated = ( page: Page, title: string ): Locator => page.getByRole( "listitem" ).filter( { hasText: title } );

test.describe( "timeline", () =>
{
    test( "explains what fills the chronology when nothing is dated", async ( { page, wiki } ) =>
    {
        await wiki.openEmpty( "/timeline" );

        await expect( page.getByText( "Aucune fiche datée" ) ).toBeVisible();

        await page.getByRole( "link", { name: "Parcourir l'encyclopédie" } ).click();

        await expect( page ).toHaveURL( /\/wiki$/ );
    } );

    test( "groups the dated pages by year and reads every shape of date", async ( { page, wiki } ) =>
    {
        await wiki.open( "/timeline" );

        await expect( page.getByText( `${ COUNTS.dated } fiches portent une date dans l'univers.` ) ).toBeVisible();
        await expect( page.getByRole( "heading", { level: 2 } ) ).toHaveText( [ "2041", "2043", "2044" ] );

        await expect( dated( page, PAGES.port.title ) ).toContainText( "2041" );
        await expect( dated( page, PAGES.athena.title ) ).toContainText( "12 juin 2043" );
        await expect( dated( page, PAGES.doctrine.title ) ).toContainText( "mars 2044" );

        await page.getByRole( "link", { name: PAGES.traite.title } ).click();

        await expect( page ).toHaveURL( new RegExp( `/wiki/${ PAGES.traite.slug }$` ) );
    } );
} );
