/**
 * Creation, edition and deletion of a page.
 *
 * Everything written here goes straight into the browser's storage, so each test
 * checks both what the site shows and what the overlay actually holds: a page
 * that looks saved but was never persisted is the failure that matters.
 *
 * @author Claude
 */

import { CATEGORIES, crowdedDataset, ILLUSTRATION, illustratedDataset, MISSING_SLUG, PAGES } from "./utilities/dataset";
import { expect, test } from "./utilities/fixtures";

/** Where the Milkdown editor writes, once it has finished booting. */
const BODY = "[contenteditable=\"true\"]";

/** Accessible name of the dialog standing between unsaved changes and the way out. */
const UNSAVED_DIALOG = "Quitter l'éditeur ?";

/** How long `@milkdown/plugin-listener` waits before reporting the Markdown, in milliseconds. */
const MARKDOWN_DEBOUNCE = 200;

test.describe( "entry editor", () =>
{
    test( "creates a page, deriving its address from its title", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByLabel( "Titre", { exact: true } ).fill( PAGES.port.title );

        await expect( page.getByText( `sera enregistrée sous ${ PAGES.port.slug }-2` ) ).toBeVisible();

        await page.getByRole( "button", { name: "Utiliser cette adresse" } ).click();

        await expect( page.getByLabel( "Adresse de la page" ) ).toHaveValue( `${ PAGES.port.slug }-2` );

        await page.getByLabel( "Titre", { exact: true } ).fill( "Digue de Sainte Roque" );

        await page.getByLabel( "Adresse de la page" ).fill( "digue-de-sainte-roque" );

        await expect( page.getByLabel( "Adresse de la page" ) ).toHaveValue( "digue-de-sainte-roque" );

        await page.getByLabel( "Résumé" ).fill( "La digue qui protège le seuil des vents du nord." );

        await page.getByRole( "button", { name: "Catégories" } ).click();
        await page.getByRole( "checkbox", { name: CATEGORIES.sites.name } ).check();
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( /\/wiki\/digue-de-sainte-roque\/$/ );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( "Digue de Sainte Roque" );

        const stored = await wiki.storedEntry( "digue-de-sainte-roque" );

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

        await expect( page ).toHaveURL( /\/wiki\/releve-des-vents\/$/ );
        await expect( page.getByRole( "article" ).getByRole( "link", { name: PAGES.port.title } ) )
            .toHaveAttribute( "href", `/wiki/${ PAGES.port.slug }` );
    } );

    test( "dates a page, which puts it in the infobox and in the chronology", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByLabel( "Titre", { exact: true } ).fill( "Fanal de Sainte Roque" );

        await page.getByRole( "button", { name: "Dates" } ).click();
        await page.getByRole( "button", { name: "Ajouter une date" } ).click();
        await page.getByLabel( "Intitulé de la date 1" ).fill( "Mise à feu" );
        await page.getByLabel( "Valeur de la date 1" ).fill( "2045-01-09" );

        // A row left without a date is a row the author started and abandoned, so
        // it is neither stored nor counted by the header of the panel.
        await page.getByRole( "button", { name: "Ajouter une date" } ).click();
        await page.getByLabel( "Intitulé de la date 2" ).fill( "Extinction" );

        await expect( page.getByRole( "button", { name: "Dates 1 date" } ) ).toBeVisible();

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( /\/wiki\/fanal-de-sainte-roque\/$/ );
        await expect( page.getByRole( "complementary", { name: "Fiche signalétique" } ) )
            .toContainText( "9 janvier 2045" );

        const stored = await wiki.storedEntry( "fanal-de-sainte-roque" );

        expect( stored?.dates.map( ( date ) => [ date.label, date.value ] ) )
            .toEqual( [ [ "Mise à feu", "2045-01-09" ] ] );

        await wiki.navigate( "Chronologie" );

        await expect( page.getByRole( "heading", { level: 2, name: "2045" } ) ).toBeVisible();
    } );

    test( "prefills the form from a red link and closes the gap", async ( { page, wiki } ) =>
    {
        await wiki.open( `/new?slug=${ MISSING_SLUG }&titre=Conseil%20des%20parties` );

        await expect( page.getByLabel( "Titre", { exact: true } ) ).toHaveValue( "Conseil des parties" );
        await expect( page.getByLabel( "Adresse de la page" ) ).toHaveValue( MISSING_SLUG );

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( new RegExp( `/wiki/${ MISSING_SLUG }/$` ) );
        await expect( page.getByRole( "region", { name: "Pages qui mènent ici" } )
            .getByRole( "link", { name: PAGES.athena.title } ) ).toBeVisible();
    } );

    test( "edits an existing page and moves it to its new address", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.bureau.slug }` );

        await expect( page.getByLabel( "Titre", { exact: true } ) ).toHaveValue( PAGES.bureau.title );

        await page.getByLabel( "Adresse de la page" ).fill( "bureau-des-marees" );
        await page.getByLabel( "Résumé" ).fill( "Le bureau, après sa réorganisation." );

        await page.getByRole( "button", { name: "Statut" } ).click();
        await page.getByRole( "radio", { name: "Brouillon", exact: true } ).check();
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( /\/wiki\/bureau-des-marees\/$/ );
        await expect( page.getByText( "Brouillon : le contenu est encore incomplet" ) ).toBeVisible();

        const stored = await wiki.storedEntry( "bureau-des-marees" );

        // The identifier survives a rename, which is what keeps the page one page.
        expect( stored?.id ).toBe( PAGES.bureau.id );
        expect( stored?.status ).toBe( "brouillon" );
    } );

    test( "points the pages citing a renamed page at its new address", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.bureau.slug }` );

        await page.getByLabel( "Adresse de la page" ).fill( "bureau-des-marees" );

        const relink = page.getByRole( "checkbox", { name: "Mettre à jour la fiche qui cite l'ancienne adresse" } );

        await expect( relink ).toBeChecked();

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        const citing = await wiki.storedEntry( PAGES.port.slug );

        expect( citing?.body ).toContain( "(/wiki/bureau-des-marees)" );
        expect( citing?.body ).not.toContain( `(/wiki/${ PAGES.bureau.slug })` );
    } );

    test( "leaves the citing pages alone when the reader declines", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.bureau.slug }` );

        await page.getByLabel( "Adresse de la page" ).fill( "bureau-des-marees" );
        await page.getByRole( "checkbox", { name: "Mettre à jour la fiche qui cite l'ancienne adresse" } ).uncheck();
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        const citing = await wiki.storedEntry( PAGES.port.slug );

        expect( citing?.body ).toContain( `(/wiki/${ PAGES.bureau.slug })` );
    } );

    test( "declares a missing category without leaving the form", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByLabel( "Titre", { exact: true } ).fill( "Relevé des courants" );
        await page.getByRole( "button", { name: "Catégories" } ).click();
        await page.getByRole( "button", { name: "Nouvelle catégorie" } ).click();

        await page.getByLabel( "Nom" ).fill( "Relevés" );
        await page.getByRole( "dialog" ).getByRole( "button", { name: "Créer" } ).click();

        await expect( page.getByRole( "checkbox", { name: "Relevés" } ) ).toBeChecked();

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        expect( ( await wiki.storedEntry( "releve-des-courants" ) )?.categories ).toContain( "releves" );
        expect( ( await wiki.storedOverlay() )?.categories[ "releves" ]?.name ).toBe( "Relevés" );
    } );

    test( "filters the categories once there are too many to scan", async ( { page, wiki } ) =>
    {
        await wiki.openWith( crowdedDataset(), "/new" );

        await page.getByRole( "button", { name: "Catégories" } ).click();
        await page.getByLabel( "Filtrer les catégories" ).fill( "cartographie 1" );

        await expect( page.getByRole( "checkbox", { name: "Cartographie 1", exact: true } ) ).toBeVisible();
        await expect( page.getByRole( "checkbox", { name: CATEGORIES.sites.name } ) ).toBeHidden();

        await page.getByLabel( "Filtrer les catégories" ).fill( "ce que personne ne range" );

        await expect( page.getByText( "Aucune catégorie ne correspond." ) ).toBeVisible();
    } );

    test( "offers the infobox labels the wiki already uses", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByRole( "button", { name: "Infobox" } ).click();
        await page.getByRole( "button", { name: "Ajouter une ligne" } ).click();

        const label = page.getByLabel( "Intitulé de la ligne 1" );
        const list = await label.getAttribute( "list" );
        const suggested = await page
            .locator( `datalist#${ list } option` )
            .evaluateAll( ( options ) => options.map( ( option ) => ( option as HTMLOptionElement ).value ) );

        expect( suggested ).toContain( PAGES.port.infobox[ 0 ]?.label );
    } );

    test( "offers the illustration paths the wiki already points at", async ( { page, wiki } ) =>
    {
        await wiki.openWith( illustratedDataset(), `/edit/${ PAGES.port.slug }` );

        await page.getByRole( "button", { name: "Illustration" } ).click();

        const field = page.getByLabel( "Adresse de l'image" );
        const list = await field.getAttribute( "list" );
        const suggested = await page
            .locator( `datalist#${ list } option` )
            .evaluateAll( ( options ) => options.map( ( option ) => ( option as HTMLOptionElement ).value ) );

        expect( suggested ).toContain( ILLUSTRATION );
    } );

    test( "says so when an illustration does not load", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.port.slug }` );

        await page.getByRole( "button", { name: "Illustration" } ).click();
        await page.getByLabel( "Adresse de l'image" ).fill( "/media/une-illustration-qui-nexiste-pas.webp" );

        await expect( page.getByText( "Cette illustration ne se charge pas" ) ).toBeVisible();
    } );

    test( "walks from one infobox row to the next with the enter key", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.port.slug }` );

        await page.getByRole( "button", { name: "Infobox" } ).click();

        await page.getByLabel( "Valeur de la ligne 1" ).press( "Enter" );

        await expect( page ).toHaveURL( new RegExp( `/edit/${ PAGES.port.slug }/$` ) );
        await expect( page.getByLabel( "Intitulé de la ligne 2" ) ).toBeFocused();

        await page.getByLabel( "Intitulé de la ligne 2" ).fill( "Quais" );
        await page.getByLabel( "Valeur de la ligne 2" ).fill( "Sept" );
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        const stored = await wiki.storedEntry( PAGES.port.slug );

        expect( stored?.infobox ).toContainEqual( { label: "Quais", value: "Sept" } );
    } );

    test( "measures the body and the summary as they are written", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.port.slug }` );

        await expect( page.getByText( `Longueur : ${ PAGES.port.summary.length } / 160` ) ).toBeVisible();

        await page.getByLabel( "Résumé" ).fill( "Court." );

        await expect( page.getByText( "Longueur : 6 / 160" ) ).toBeVisible();
        await expect( page.getByText( "min de lecture" ) ).toBeVisible();
    } );

    test( "deletes a page once the deletion is confirmed", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.sceau.slug }` );

        await page.getByRole( "button", { name: "Supprimer la fiche" } ).click();
        await wiki.confirm( "Supprimer cette fiche ?", "Supprimer" );

        await expect( page ).toHaveURL( /\/wiki\/$/ );
        await expect( page.getByRole( "link", { name: PAGES.sceau.title } ) ).toBeHidden();
        expect( await wiki.storedEntry( PAGES.sceau.slug ) ).toBeUndefined();
    } );

    test( "saves without leaving, and keeps editing the page it just created", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByLabel( "Titre", { exact: true } ).fill( "Digue de Sainte Roque" );
        await page.getByLabel( "Résumé" ).fill( "La digue qui protège le seuil." );

        await page.keyboard.press( "Control+s" );

        await expect( page.getByText( "Fiche enregistrée" ) ).toBeVisible();
        await expect( page ).toHaveURL( /\/new\/$/ );
        expect( ( await wiki.storedEntry( "digue-de-sainte-roque" ) )?.summary ).toBe( "La digue qui protège le seuil." );

        await page.getByLabel( "Résumé" ).fill( "La digue qui protège le seuil des vents du nord." );
        await page.keyboard.press( "Control+s" );

        const overlay = await wiki.storedOverlay();
        const written = Object.values( overlay?.entries ?? {} ).filter( ( item ) => item.slug === "digue-de-sainte-roque" );

        expect( written ).toHaveLength( 1 );
        expect( written[ 0 ]?.summary ).toBe( "La digue qui protège le seuil des vents du nord." );

        await page.getByRole( "link", { name: "Annuler" } ).click();

        await expect( page ).toHaveURL( /\/wiki\/digue-de-sainte-roque\/$/ );
    } );

    test( "keeps the editor open when the reader refuses to leave", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.traite.slug }` );

        await page.getByLabel( "Résumé" ).fill( "Une reformulation en cours." );
        await page.getByRole( "link", { name: "Annuler" } ).click();

        await wiki.confirm( UNSAVED_DIALOG, "Annuler" );

        await expect( page ).toHaveURL( new RegExp( `/edit/${ PAGES.traite.slug }/$` ) );
        await expect( page.getByLabel( "Résumé" ) ).toHaveValue( "Une reformulation en cours." );
    } );

    test( "leaves the editor once the reader confirms, storing nothing", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.traite.slug }` );

        await page.getByLabel( "Résumé" ).fill( "Une reformulation abandonnée." );
        await page.getByRole( "link", { name: "Annuler" } ).click();

        await expect( page.getByText( "Certaines modifications ne sont pas enregistrées" ) ).toBeVisible();

        await wiki.confirm( UNSAVED_DIALOG, "Quitter sans enregistrer" );

        await expect( page ).toHaveURL( new RegExp( `/wiki/${ PAGES.traite.slug }/$` ) );
        expect( ( await wiki.storedEntry( PAGES.traite.slug ) )?.summary ).toBe( PAGES.traite.summary );
    } );
} );
