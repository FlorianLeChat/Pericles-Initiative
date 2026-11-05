/**
 * A single encyclopedia page: its body, its infobox, its link graph.
 *
 * A slug with no page behind it is covered here too: a red link is a feature, so
 * it must render an inviting page rather than a 404.
 *
 * @author Claude
 */

import { expect, isNarrow, test } from "./utilities/fixtures";
import { CATEGORIES, DATES, MISSING_SLUG, PAGES, UNIVERSE } from "./utilities/dataset";

test.describe( "article page", () =>
{
    test( "shows the title, the lead, the infobox and the table of contents", async ( { page, wiki } ) =>
    {
        await wiki.open( `/entries/${ PAGES.athena.slug }` );

        await expect( page ).toHaveTitle( `${ PAGES.athena.title } - ${ UNIVERSE }` );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( PAGES.athena.title );
        await expect( page.getByText( "Navigatrice en chef de l’archipel" ) ).toBeVisible();
        await expect( page.getByRole( "navigation", { name: "Fil d'Ariane" } ) ).toContainText( PAGES.athena.title );

        const infobox = page.getByRole( "complementary", { name: "Fiche signalétique" } );

        await expect( infobox.getByText( "Navigatrice en chef" ) ).toBeVisible();
        await expect( infobox.getByRole( "link", { name: PAGES.port.title } ) )
            .toHaveAttribute( "href", `/entries/${ PAGES.port.slug }` );

        // The dates of reference open the panel, each under its own intitulé.
        await expect( infobox.getByText( DATES.naissance.label, { exact: true } ) ).toBeVisible();
        await expect( infobox.getByText( "14 mai 2020" ) ).toBeVisible();
        await expect( infobox.getByText( DATES.deces.label, { exact: true } ) ).toBeVisible();
        await expect( infobox.getByText( "12 juin 2043" ) ).toBeVisible();

        // A life dated at both ends tells its length, the birthday counted.
        await expect( infobox.getByText( "Âge au décès" ) ).toBeVisible();
        await expect( infobox.getByText( "23 ans", { exact: true } ) ).toBeVisible();

        await expect( infobox.getByRole( "link", { name: CATEGORIES.institutions.name } ) ).toBeVisible();
        await expect( infobox.getByText( "Autres noms : La Vance" ) ).toBeVisible();

        // A catalogue call number: three letters of the first category, the earliest year, three of the title.
        const callNumber = [
            CATEGORIES.institutions.name.slice( 0, 3 ),
            DATES.naissance.value.slice( 0, 4 ),
            PAGES.athena.title.slice( 0, 3 )
        ].join( " " ).toUpperCase();

        await expect( page.getByText( callNumber, { exact: true } ) ).toBeVisible();

        // On a phone the contents fold away above the body, and open on demand.
        if ( isNarrow( page ) )
        {
            await expect( page.getByRole( "navigation", { name: "Sommaire" } ) ).toBeHidden();
            await page.locator( "summary" ).filter( { hasText: "Sommaire", visible: true } ).click();
        }

        await expect( page.getByRole( "navigation", { name: "Sommaire" } ).getByRole( "link" ) )
            .toHaveText( [ "Origines", "Le traité", "Postérité" ] );
    } );

    test( "wires the page into the link graph, both ways", async ( { page, wiki } ) =>
    {
        await wiki.open( `/entries/${ PAGES.athena.slug }` );

        await expect( page.getByRole( "region", { name: "Pages qui mènent ici" } ).getByRole( "link" ) )
            .toHaveText( [ PAGES.bureau.title, PAGES.port.title ] );

        const related = page.locator( "section" ).filter( { hasText: "À lire aussi" } );

        await expect( related.getByRole( "link", { name: PAGES.traite.title } ) ).toBeVisible();

        await page.getByRole( "article" ).getByRole( "link", { name: PAGES.port.title } ).first().click();

        await expect( page ).toHaveURL( new RegExp( `/entries/${ PAGES.port.slug }/$` ) );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( PAGES.port.title );
    } );

    test( "turns a red link into an invitation to write the page, and closes the gap", async ( { page, wiki } ) =>
    {
        await wiki.open( `/entries/${ PAGES.athena.slug }` );

        const redLink = page.getByRole( "link", { name: "Conseil des parties" } );

        await expect( redLink ).toHaveAttribute( "data-missing", "true" );

        await redLink.click();

        await expect( page ).toHaveURL( new RegExp( `/entries/${ MISSING_SLUG }/$` ) );
        await expect( page.getByText( "Cette fiche n'existe pas encore" ) ).toBeVisible();
        await expect( page.getByRole( "region", { name: "Fiches qui attendent cette page" } )
            .getByRole( "link", { name: PAGES.athena.title } ) ).toBeVisible();

        await page.getByRole( "link", { name: "Créer cette fiche" } ).click();

        await expect( page ).toHaveURL( new RegExp( `/new/\\?slug=${ MISSING_SLUG }&titre=` ) );
        await expect( page.getByLabel( "Titre", { exact: true } ) ).toHaveValue( "Conseil des parties" );
        await page.getByRole( "button", { name: "Réglages de la fiche" } ).click();
        await expect( page.getByLabel( "Adresse de la page" ) ).toHaveValue( MISSING_SLUG );

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( new RegExp( `/entries/${ MISSING_SLUG }/$` ) );
        await expect( page.getByRole( "region", { name: "Pages qui mènent ici" } )
            .getByRole( "link", { name: PAGES.athena.title } ) ).toBeVisible();
    } );
} );
