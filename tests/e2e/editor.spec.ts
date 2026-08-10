/**
 * Creation, edition and deletion of a page.
 *
 * Everything written here goes straight into the browser's storage, so each test
 * checks both what the site shows and what the overlay actually holds: a page
 * that looks saved but was never persisted is the failure that matters.
 *
 * @author Claude
 */

import { CATEGORIES, MISSING_SLUG, PAGES } from "./utilities/dataset";
import { expect, test } from "./utilities/fixtures";

/** Where the Milkdown editor writes, once it has finished booting. */
const BODY = "[contenteditable=\"true\"]";

/** How long `@milkdown/plugin-listener` waits before reporting the Markdown, in milliseconds. */
const MARKDOWN_DEBOUNCE = 200;

test.describe( "entry editor", () =>
{
    test( "creates a page, deriving its address from its title", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByLabel( "Titre", { exact: true } ).fill( PAGES.port.title );

        await expect( page.getByText( "Une autre fiche utilise déjà cette adresse." ) ).toBeVisible();

        await page.getByLabel( "Titre", { exact: true } ).fill( "Digue de Sainte Roque" );

        await expect( page.getByLabel( "Adresse de la page" ) ).toHaveValue( "digue-de-sainte-roque" );

        await page.getByLabel( "Résumé" ).fill( "La digue qui protège le seuil des vents du nord." );
        await page.getByRole( "radio", { name: "Lieu", exact: true } ).check();
        await page.getByRole( "checkbox", { name: CATEGORIES.sites.name } ).check();
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( /\/wiki\/digue-de-sainte-roque$/ );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( "Digue de Sainte Roque" );

        const stored = await wiki.storedEntry( "digue-de-sainte-roque" );

        expect( stored?.type ).toBe( "lieu" );
        expect( stored?.categories ).toEqual( [ CATEGORIES.sites.slug ] );

        // A cold start reads the page back out of storage, which is the whole point.
        await page.reload();

        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( "Digue de Sainte Roque" );
    } );

    test( "writes a body and a link to another page through the editor", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByLabel( "Titre", { exact: true } ).fill( "Relevé des vents" );
        await expect( page.getByRole( "button", { name: "Lier une fiche" } ) ).toBeEnabled();

        await page.locator( BODY ).click();
        await page.locator( BODY ).pressSequentially( "Le relevé cite " );

        await page.getByRole( "button", { name: "Lier une fiche" } ).click();
        await page.getByPlaceholder( "Titre de la fiche à lier" ).fill( PAGES.port.title );
        await page.getByRole( "button", { name: `${ PAGES.port.title } /wiki/${ PAGES.port.slug }` } ).click();

        await expect( page.locator( BODY ).getByRole( "link", { name: PAGES.port.title } ) ).toBeVisible();

        // Milkdown reports its Markdown through a debounce of `MARKDOWN_DEBOUNCE`
        // milliseconds, so the form only learns about the link a moment after it
        // shows up in the document, and saving before that stores the older body.
        await page.waitForTimeout( MARKDOWN_DEBOUNCE * 2 );

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( /\/wiki\/releve-des-vents$/ );
        await expect( page.getByRole( "article" ).getByRole( "link", { name: PAGES.port.title } ) )
            .toHaveAttribute( "href", `/wiki/${ PAGES.port.slug }` );
    } );

    test( "prefills the form from a red link and closes the gap", async ( { page, wiki } ) =>
    {
        await wiki.open( `/new?slug=${ MISSING_SLUG }&titre=Conseil%20des%20parties` );

        await expect( page.getByLabel( "Titre", { exact: true } ) ).toHaveValue( "Conseil des parties" );
        await expect( page.getByLabel( "Adresse de la page" ) ).toHaveValue( MISSING_SLUG );

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( new RegExp( `/wiki/${ MISSING_SLUG }$` ) );
        await expect( page.getByRole( "region", { name: "Pages qui mènent ici" } )
            .getByRole( "link", { name: PAGES.athena.title } ) ).toBeVisible();
    } );

    test( "edits an existing page and moves it to its new address", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.bureau.slug }` );

        await expect( page.getByLabel( "Titre", { exact: true } ) ).toHaveValue( PAGES.bureau.title );

        await page.getByLabel( "Adresse de la page" ).fill( "bureau-des-marees" );
        await page.getByLabel( "Résumé" ).fill( "Le bureau, après sa réorganisation." );
        await page.getByRole( "radio", { name: "Brouillon", exact: true } ).check();
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( /\/wiki\/bureau-des-marees$/ );
        await expect( page.getByText( "Brouillon, contenu incomplet" ) ).toBeVisible();

        const stored = await wiki.storedEntry( "bureau-des-marees" );

        // The identifier survives a rename, which is what keeps the page one page.
        expect( stored?.id ).toBe( PAGES.bureau.id );
        expect( stored?.status ).toBe( "brouillon" );
    } );

    test( "deletes a page once the deletion is confirmed", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.sceau.slug }` );

        await page.getByRole( "button", { name: "Supprimer la fiche" } ).click();
        await wiki.confirm( "Supprimer cette fiche ?", "Supprimer" );

        await expect( page ).toHaveURL( /\/wiki$/ );
        await expect( page.getByRole( "link", { name: PAGES.sceau.title } ) ).toBeHidden();
        expect( await wiki.storedEntry( PAGES.sceau.slug ) ).toBeUndefined();
    } );

    test( "keeps the editor open when the reader refuses to leave", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.traite.slug }` );

        await page.getByLabel( "Résumé" ).fill( "Une reformulation en cours." );

        await expect( page.getByText( "Modifications non enregistrées" ) ).toBeVisible();

        // Playwright dismisses native dialogs by default, which is the reader
        // answering «non» to the confirmation: the navigation has to be cancelled.
        await page.getByRole( "link", { name: "Annuler" } ).click();

        await expect( page ).toHaveURL( new RegExp( `/edit/${ PAGES.traite.slug }$` ) );
        await expect( page.getByLabel( "Résumé" ) ).toHaveValue( "Une reformulation en cours." );
    } );

    test( "leaves the editor once the reader confirms, storing nothing", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.traite.slug }` );

        await page.getByLabel( "Résumé" ).fill( "Une reformulation abandonnée." );

        let asked = "";

        page.on( "dialog", ( dialog ) =>
        {
            asked = dialog.message();
            void dialog.accept();
        } );

        await page.getByRole( "link", { name: "Annuler" } ).click();

        await expect( page ).toHaveURL( new RegExp( `/wiki/${ PAGES.traite.slug }$` ) );
        expect( asked ).toContain( "Des modifications ne sont pas enregistrées" );
        expect( ( await wiki.storedEntry( PAGES.traite.slug ) )?.summary ).toBe( PAGES.traite.summary );
    } );
} );
