/**
 * A single encyclopedia page: its body, its infobox, its link graph.
 *
 * A slug with no page behind it is covered here too: a red link is a feature, so
 * it must render an inviting page rather than a 404.
 *
 * @author Claude
 */

import { CATEGORIES, MISSING_SLUG, PAGES, UNIVERSE } from "./utilities/dataset";
import { expect, test } from "./utilities/fixtures";

test.describe( "article page", () =>
{
    test( "shows the title, the lead, the infobox and the table of contents", async ( { page, wiki } ) =>
    {
        await wiki.open( `/wiki/${ PAGES.athena.slug }` );

        await expect( page ).toHaveTitle( `${ PAGES.athena.title } · ${ UNIVERSE }` );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( PAGES.athena.title );
        await expect( page.getByText( "Navigatrice en chef de l’archipel" ) ).toBeVisible();
        await expect( page.getByRole( "navigation", { name: "Fil d'Ariane" } ) ).toContainText( PAGES.athena.title );

        const infobox = page.getByRole( "complementary", { name: "Fiche signalétique" } );

        await expect( infobox.getByText( "Navigatrice en chef" ) ).toBeVisible();
        await expect( infobox.getByRole( "link", { name: CATEGORIES.institutions.name } ) ).toBeVisible();
        await expect( infobox.getByText( "Aussi appelé : La Vance" ) ).toBeVisible();

        await expect( page.getByRole( "navigation", { name: "Sommaire" } ).getByRole( "link" ) )
            .toHaveText( [ "Origines", "Le traité", "Postérité" ] );
    } );

    test( "wires the page into the link graph, both ways", async ( { page, wiki } ) =>
    {
        await wiki.open( `/wiki/${ PAGES.athena.slug }` );

        await expect( page.getByRole( "region", { name: "Pages qui mènent ici" } ).getByRole( "link" ) )
            .toHaveText( [ PAGES.bureau.title, PAGES.port.title ] );

        const related = page.locator( "section" ).filter( { hasText: "À lire aussi" } );

        await expect( related.getByRole( "link", { name: PAGES.traite.title } ) ).toBeVisible();

        await page.getByRole( "article" ).getByRole( "link", { name: PAGES.port.title } ).first().click();

        await expect( page ).toHaveURL( new RegExp( `/wiki/${ PAGES.port.slug }$` ) );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( PAGES.port.title );
    } );

    test( "marks a draft as incomplete", async ( { page, wiki } ) =>
    {
        await wiki.open( `/wiki/${ PAGES.sceau.slug }` );

        await expect( page.getByText( "Brouillon, contenu incomplet" ) ).toBeVisible();
    } );

    test( "turns a red link into an invitation to write the page", async ( { page, wiki } ) =>
    {
        await wiki.open( `/wiki/${ PAGES.athena.slug }` );

        const redLink = page.getByRole( "link", { name: "Conseil des parties" } );

        await expect( redLink ).toHaveAttribute( "data-missing", "true" );

        await redLink.click();

        await expect( page ).toHaveURL( new RegExp( `/wiki/${ MISSING_SLUG }$` ) );
        await expect( page.getByText( "Cette fiche n'existe pas encore" ) ).toBeVisible();
        await expect( page.getByRole( "region", { name: "Fiches qui attendent cette page" } )
            .getByRole( "link", { name: PAGES.athena.title } ) ).toBeVisible();

        await page.getByRole( "link", { name: "Créer cette fiche" } ).click();

        await expect( page ).toHaveURL( new RegExp( `/new\\?slug=${ MISSING_SLUG }&titre=` ) );
        await expect( page.getByLabel( "Titre", { exact: true } ) ).toHaveValue( "Conseil des parties" );
    } );
} );
