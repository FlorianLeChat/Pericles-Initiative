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
        await expect( page.getByText( "Navigatrice en chef de l'archipel" ) ).toBeVisible();
        await expect( page.getByRole( "navigation", { name: "Fil d'Ariane" } ) ).toContainText( PAGES.athena.title );

        // Nothing but the breadcrumb stands above the title: «Modifier» closes the meta line under it.
        const titleBox = await page.getByRole( "heading", { level: 1 } ).boundingBox();
        const editBox = await page.getByRole( "link", { name: "Modifier", exact: true } ).boundingBox();

        expect( editBox?.y ).toBeGreaterThan( ( titleBox?.y ?? 0 ) + ( titleBox?.height ?? 0 ) );

        const infobox = page.getByRole( "complementary", { name: "Fiche signalétique" } );

        // On a phone the panel folds past four rows, but a fifth alone shows rather than hiding behind a button.
        await expect( infobox.getByText( "Port d'attache" ) ).toBeVisible();
        await expect( infobox.getByRole( "button", { name: /^Afficher/ } ) ).toHaveCount( 0 );

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

        // On a phone the contents fold away above the body, and open on demand.
        if ( isNarrow( page ) )
        {
            await expect( page.getByRole( "navigation", { name: "Sur cette page" } ) ).toBeHidden();
            await page.locator( "summary" ).filter( { hasText: "Sur cette page", visible: true } ).click();
        }

        await expect( page.getByRole( "navigation", { name: "Sur cette page" } ).getByRole( "link" ) )
            .toHaveText( [ "Origines", "Le traité", "Postérité" ] );
    } );

    test( "wires the page into the link graph, both ways", async ( { page, wiki } ) =>
    {
        await wiki.open( `/entries/${ PAGES.athena.slug }` );

        await expect( page.getByRole( "region", { name: "Pages qui mènent ici" } ).getByRole( "link" ) )
            .toHaveText( [ PAGES.bureau.title, PAGES.port.title ] );

        // Each backlink is a row carrying the sentence that cites this page.
        await expect( page.getByRole( "region", { name: "Pages qui mènent ici" } ) )
            .toContainText( "sous l'autorité d'Athéna Vance." );

        const related = page.locator( "section" ).filter( { hasText: "À lire aussi" } );

        await expect( related.getByRole( "link", { name: PAGES.traite.title } ) ).toBeVisible();

        // A page already named among the backlinks is not suggested again under it.
        await expect( related.getByRole( "link", { name: PAGES.bureau.title } ) ).toHaveCount( 0 );

        await page.getByRole( "article" ).getByRole( "link", { name: PAGES.port.title } ).first().click();

        await expect( page ).toHaveURL( new RegExp( `/entries/${ PAGES.port.slug }/$` ) );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( PAGES.port.title );
    } );

    test( "turns a red link into an invitation to write the page, and closes the gap", async ( { page, wiki } ) =>
    {
        await wiki.open( `/entries/${ PAGES.athena.slug }` );

        const redLinks = page.getByRole( "link", { name: "Conseil des parties (fiche à écrire)", exact: true } );
        const redLink = redLinks.first();

        await expect( redLink ).toHaveAttribute( "data-missing", "true" );

        // The foot of the page names the next page to write, one this page waits for.
        await expect( page.getByText( "À écrire ensuite :" ).getByRole( "link" ) )
            .toHaveAttribute( "href", `/entries/${ MISSING_SLUG }/` );
        await expect( redLinks ).toHaveCount( 2 );

        // E opens the editor from the page, as the keycap of «Modifier» says.
        await expect( page.getByRole( "link", { name: "Modifier", exact: true } ) ).toHaveAttribute( "aria-keyshortcuts", "E" );
        await page.keyboard.press( "e" );

        // The editor draws the same link red while it is being written, and only that one.

        const body = page.getByRole( "textbox", { name: "Corps de la fiche, en Markdown" } );

        await expect( body.locator( ".wiki-link-missing" ) ).toHaveText( "Conseil des parties" );
        await expect( body.getByRole( "link", { name: PAGES.port.title } ).locator( ".wiki-link-missing" ) ).toHaveCount( 0 );

        await page.getByRole( "link", { name: "Fermer" } ).click();
        await expect( page ).toHaveURL( new RegExp( `/entries/${ PAGES.athena.slug }/$` ) );

        /*
         * The header's «Nouvelle fiche» is the one filled button of an article, and
         * steps back to a quiet pill once the page offers «L'écrire».
         */
        const headerAction = page.getByRole( "banner" ).getByRole( "link", { name: "Nouvelle fiche" } );
        const wide = !isNarrow( page );

        if ( wide )
        {
            await expect( headerAction ).toHaveClass( /bg-accent-700/ );
        }

        await redLink.click();

        await expect( page ).toHaveURL( new RegExp( `/entries/${ MISSING_SLUG }/$` ) );
        await expect( page.getByText( "Personne n'a encore écrit cette fiche" ) ).toBeVisible();
        await expect( page.getByText( "Citée par une fiche" ) ).toBeVisible();
        await expect( page.getByText( `/entries/${ MISSING_SLUG }/`, { exact: true } ) ).toBeVisible();

        if ( wide )
        {
            await expect( headerAction ).toHaveClass( /bg-control/ );
        }

        // Each citing page comes with the sentence that waits for this one.
        const citing = page.getByRole( "region", { name: "Où elle est citée" } );

        await expect( citing.getByRole( "link", { name: PAGES.athena.title } ) ).toBeVisible();
        await expect( citing.getByText( /Conseil des parties pendant soixante douze heures/ ) ).toBeVisible();

        await page.getByRole( "link", { name: "L'écrire" } ).click();

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
