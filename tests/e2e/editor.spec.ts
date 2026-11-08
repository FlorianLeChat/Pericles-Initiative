/**
 * Creation, edition and deletion of a page.
 *
 * Everything written here goes straight into the browser's storage, so each test
 * checks both what the site shows and what the overlay actually holds: a page
 * that looks saved but was never persisted is the failure that matters.
 *
 * @author Claude
 */

import type { Locator } from "@playwright/test";
import { expect, isNarrow, test } from "./utilities/fixtures";
import { CATEGORIES,
    crowdedDataset,
    FIGURE_ALT,
    ILLUSTRATION,
    IMPORTED_IMAGE,
    illustratedDataset,
    PAGES } from "./utilities/dataset";

/** Where the Milkdown editor writes, once it has finished booting. */
const BODY = "[contenteditable=\"true\"]";

/** Accessible name of the dialog standing between unsaved changes and the way out. */
const UNSAVED_DIALOG = "Quitter l'éditeur ?";

/** Accessible name of the box offering to rewrite the links of the pages citing a renamed one. */
const RELINK = "Mettre à jour la fiche qui cite l'ancienne adresse";

/** Accessible name of the fold holding the status, the address and the other names of a page. */
const SETTINGS = "Réglages de la fiche";

/** How long `@milkdown/plugin-listener` waits before reporting the Markdown, in milliseconds. */
const MARKDOWN_DEBOUNCE = 200;

/**
 * Reads the values a field suggests, through the `datalist` it points at.
 *
 * @param field Input carrying a `list` attribute.
 * @returns The values offered, in document order.
 * @author Claude
 */
const suggestionsOf = async ( field: Locator ): Promise<string[]> =>
{
    const list = await field.getAttribute( "list" );

    return field.page()
        .locator( `datalist#${ list } option` )
        .evaluateAll( ( options ) => options.map( ( option ) => ( option as HTMLOptionElement ).value ) );
};

test.describe( "entry editor", () =>
{
    test( "creates a page as a draft, deriving its address from its title, then publishes it", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await expect( page.getByRole( "status" ).filter( { hasText: "Brouillon" } ) ).toBeVisible();

        // Saving without a title is answered under it rather than by a button greyed out for no stated reason.
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page.getByText( "Une fiche a besoin d'un titre pour être enregistrée." ) ).toBeVisible();
        await expect( page.getByLabel( "Titre", { exact: true } ) ).toBeFocused();
        await expect( page ).toHaveURL( /\/new\/$/ );

        await page.getByLabel( "Titre", { exact: true } ).fill( PAGES.port.title );

        await expect( page.getByText( "Une fiche a besoin d'un titre" ) ).toHaveCount( 0 );

        await expect( page.getByText( `sera enregistrée sous ${ PAGES.port.slug }-2` ) ).toBeVisible();

        await page.getByRole( "button", { name: "Utiliser cette adresse" } ).click();
        await page.getByRole( "button", { name: SETTINGS } ).click();

        await expect( page.getByLabel( "Adresse de la page" ) ).toHaveValue( `${ PAGES.port.slug }-2` );

        await page.getByLabel( "Titre", { exact: true } ).fill( "Digue de Sainte Roque" );

        await page.getByLabel( "Adresse de la page" ).fill( "digue-de-sainte-roque" );

        await expect( page.getByLabel( "Adresse de la page" ) ).toHaveValue( "digue-de-sainte-roque" );

        await page.getByLabel( "Résumé" ).fill( "La digue qui protège le seuil des vents du nord." );

        await page.getByRole( "button", { name: "Choisir les catégories" } ).click();
        await page.getByRole( "checkbox", { name: CATEGORIES.sites.name } ).check();
        await page.getByRole( "button", { name: "Publier" } ).click();

        await expect( page ).toHaveURL( /\/entries\/digue-de-sainte-roque\/$/ );
        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( "Digue de Sainte Roque" );
        await expect( page.getByText( "Brouillon : le contenu est encore incomplet" ) ).toHaveCount( 0 );

        const stored = await wiki.storedEntry( "digue-de-sainte-roque" );

        expect( stored?.categories ).toEqual( [ CATEGORIES.sites.slug ] );
        expect( stored?.status ).toBe( "publie" );

        // A cold start reads the page back out of storage, which is the whole point.
        await page.reload();

        await expect( page.getByRole( "heading", { level: 1 } ) ).toHaveText( "Digue de Sainte Roque" );
    } );

    test( "writes a body and a link to another page through the editor", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByLabel( "Titre", { exact: true } ).fill( "Relevé des vents" );
        await expect( page.getByRole( "button", { name: /^Lier une fiche/ } ) ).toBeEnabled();

        // The help beside the page is folded until asked for, and names the shortcut the toolbar uses.
        const help = page.getByRole( "button", { name: /^Aide à l'écriture/ } );

        await expect( help ).toHaveAttribute( "aria-expanded", "false" );
        await help.click();
        await expect( page.locator( "#writing-help" ) ).toContainText( "sélectionnez un mot puis faites Ctrl L" );
        await expect( page.locator( "#writing-help" ) ).toContainText( "invitation à l'écrire" );

        await page.locator( BODY ).click();

        // Crepe's own block menu speaks the language of the page, and offers no
        // level one heading, which the title already is.
        await page.keyboard.type( "/" );

        await expect( page.getByText( "Titre de section", { exact: true } ) ).toBeVisible();
        await expect( page.getByText( /^(Heading 1|Titre 1)$/ ) ).toHaveCount( 0 );

        await page.keyboard.press( "Escape" );
        await page.keyboard.press( "Backspace" );
        await page.locator( BODY ).pressSequentially( "Le relevé cite " );

        await page.getByRole( "button", { name: /^Lier une fiche/ } ).click();
        await page.getByPlaceholder( "Titre de la fiche à lier" ).fill( PAGES.port.title );
        await page.getByRole( "button", { name: `${ PAGES.port.title } /entries/${ PAGES.port.slug }` } ).click();

        await expect( page.locator( BODY ).getByRole( "link", { name: PAGES.port.title } ) ).toBeVisible();

        // Milkdown reports its Markdown through a debounce of `MARKDOWN_DEBOUNCE`
        // milliseconds, so the form only learns about the link a moment after it
        // shows up in the document, and saving before that stores the older body.
        await page.waitForTimeout( MARKDOWN_DEBOUNCE * 2 );

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( /\/entries\/releve-des-vents\/$/ );
        await expect( page.getByRole( "article" ).getByRole( "link", { name: PAGES.port.title } ) )
            .toHaveAttribute( "href", `/entries/${ PAGES.port.slug }` );
    } );

    test( "starts a page from a template, and keeps only what was filled in", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByRole( "radio", { name: "Personnage" } ).check();

        await expect( page.getByLabel( "Titre", { exact: true } ) ).toHaveAttribute( "placeholder", "Nom du personnage" );
        await expect( page.getByLabel( "Intitulé de la date 1" ) ).toHaveValue( "Naissance" );
        await expect( page.getByLabel( "Intitulé de la ligne 1" ) ).toHaveValue( "Prénom" );
        await expect( page.locator( BODY ).getByRole( "heading", { name: "Biographie" } ) ).toBeVisible();

        // Headings a template wrote are not words of the page yet.
        await expect( page.getByText( "0 mot", { exact: true } ) ).toBeVisible();

        // What a template writes is not the writer's work: switching costs nothing yet.
        await page.getByRole( "radio", { name: "Lieu" } ).check();

        await expect( page.getByLabel( "Intitulé de la ligne 1" ) ).toHaveValue( "Type" );

        await page.getByRole( "radio", { name: "Personnage" } ).check();
        await page.getByLabel( "Titre", { exact: true } ).fill( "Ilse Marrow" );
        await page.getByLabel( "Valeur de « Prénom »" ).fill( "Ilse" );
        await page.getByLabel( "Valeur de « Naissance »" ).fill( "2001-03-02" );
        await page.getByLabel( "Valeur de « Décès »" ).fill( "2044-01-15" );

        // Once something is written, another template asks before replacing it.
        await page.getByRole( "radio", { name: "Lieu" } ).click();
        await wiki.confirm( "Changer de modèle ?", "Annuler" );

        await expect( page.getByLabel( "Valeur de « Prénom »" ) ).toHaveValue( "Ilse" );
        await expect( page.getByRole( "radio", { name: "Personnage" } ) ).toBeChecked();

        // A life dated at both ends tells its length on the card already.
        await expect( page.getByText( "Âge au décès : 42 ans" ) ).toBeVisible();

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( /\/entries\/ilse-marrow\/$/ );

        const stored = await wiki.storedEntry( "ilse-marrow" );

        // The rows, dates and sections nobody filled are left out of the page.
        expect( stored?.infobox ).toEqual( [ { label: "Prénom", value: "Ilse" } ] );
        expect( stored?.dates.map( ( date ) => date.label ) ).toEqual( [ "Naissance", "Décès" ] );
        expect( stored?.body ).toBe( "" );
    } );

    test( "dates a page, which puts it in the infobox and in the chronology", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByLabel( "Titre", { exact: true } ).fill( "Fanal de Sainte Roque" );

        await page.getByRole( "button", { name: "Ajouter une date" } ).click();
        await page.getByLabel( "Intitulé de la date 1" ).fill( "Mise à feu" );
        await page.getByLabel( "Valeur de « Mise à feu »" ).fill( "2045-01-09" );

        // A row left without a date is a row the author started and abandoned, so
        // it is not stored.
        await page.getByRole( "button", { name: "Ajouter une date" } ).click();

        // Left behind, the date reads as it will be published; back in it, it reads as typed.
        const value = page.getByLabel( "Valeur de « Mise à feu »" );

        await expect( page.getByText( "9 janvier 2045", { exact: true } ) ).toBeVisible();
        await value.focus();
        await expect( page.getByText( "9 janvier 2045", { exact: true } ) ).toBeHidden();
        await expect( value ).toHaveValue( "2045-01-09" );

        await page.getByLabel( "Intitulé de la date 2" ).fill( "Extinction" );

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( /\/entries\/fanal-de-sainte-roque\/$/ );
        await expect( page.getByRole( "complementary", { name: "Fiche signalétique" } ) )
            .toContainText( "9 janvier 2045" );

        const stored = await wiki.storedEntry( "fanal-de-sainte-roque" );

        expect( stored?.dates.map( ( date ) => [ date.label, date.value ] ) )
            .toEqual( [ [ "Mise à feu", "2045-01-09" ] ] );

        await wiki.navigate( "Chronologie" );

        await expect( page.getByRole( "heading", { level: 2, name: "2040 à 2049" } ) ).toBeVisible();
    } );

    test( "edits a page, moves it, and points the pages citing it at its new address", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.bureau.slug }` );

        await expect( page.getByLabel( "Titre", { exact: true } ) ).toHaveValue( PAGES.bureau.title );

        await page.getByRole( "button", { name: SETTINGS } ).click();
        await page.getByLabel( "Adresse de la page" ).fill( "bureau-des-marees" );
        await page.getByLabel( "Résumé" ).fill( "Le bureau, après sa réorganisation." );

        await expect( page.getByRole( "checkbox", { name: RELINK } ) ).toBeChecked();

        await page.getByRole( "radio", { name: "Brouillon", exact: true } ).check();
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page ).toHaveURL( /\/entries\/bureau-des-marees\/$/ );
        await expect( page.getByText( "Brouillon : le contenu est encore incomplet" ) ).toBeVisible();

        const stored = await wiki.storedEntry( "bureau-des-marees" );

        // The identifier survives a rename, which is what keeps the page one page.
        expect( stored?.id ).toBe( PAGES.bureau.id );
        expect( stored?.status ).toBe( "brouillon" );

        const citing = await wiki.storedEntry( PAGES.port.slug );

        expect( citing?.body ).toContain( "(/entries/bureau-des-marees)" );
        expect( citing?.body ).not.toContain( `(/entries/${ PAGES.bureau.slug })` );

        // A link written in the infobox is a link like any other, and moves with the page.
        expect( citing?.infobox.map( ( field ) => field.value ) )
            .toContain( "[Bureau des courants](/entries/bureau-des-marees)" );
    } );

    test( "leaves the citing pages alone when the reader declines", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.bureau.slug }` );

        await page.getByRole( "button", { name: SETTINGS } ).click();
        await page.getByLabel( "Adresse de la page" ).fill( "bureau-des-marees" );
        await page.getByRole( "checkbox", { name: RELINK } ).uncheck();
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        const citing = await wiki.storedEntry( PAGES.port.slug );

        expect( citing?.body ).toContain( `(/entries/${ PAGES.bureau.slug })` );
    } );

    test( "declares a missing category without leaving the form", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByLabel( "Titre", { exact: true } ).fill( "Relevé des courants" );
        await page.getByRole( "button", { name: "Choisir les catégories" } ).click();
        await page.getByRole( "button", { name: "Nouvelle catégorie" } ).click();

        await page.getByLabel( "Nom" ).fill( "Relevés" );
        await page.getByRole( "dialog" ).getByRole( "button", { name: "Créer" } ).click();

        await expect( page.getByRole( "checkbox", { name: "Relevés" } ) ).toBeChecked();

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        // Saved without being published, a new page stays the draft it was born as.
        expect( ( await wiki.storedEntry( "releve-des-courants" ) )?.status ).toBe( "brouillon" );
        expect( ( await wiki.storedEntry( "releve-des-courants" ) )?.categories ).toContain( "releves" );
        expect( ( await wiki.storedOverlay() )?.categories[ "releves" ]?.name ).toBe( "Relevés" );
    } );

    test( "filters the categories once there are too many to scan", async ( { page, wiki } ) =>
    {
        await wiki.openWith( crowdedDataset(), "/new" );

        await page.getByRole( "button", { name: "Choisir les catégories" } ).click();
        await page.getByLabel( "Filtrer les catégories" ).fill( "cartographie 1" );

        await expect( page.getByRole( "checkbox", { name: "Cartographie 1", exact: true } ) ).toBeVisible();
        await expect( page.getByRole( "checkbox", { name: CATEGORIES.sites.name } ) ).toBeHidden();

        await page.getByLabel( "Filtrer les catégories" ).fill( "ce que personne ne range" );

        await expect( page.getByText( "Aucune catégorie ne correspond." ) ).toBeVisible();
    } );

    test( "offers what the wiki already uses, flags a broken illustration, and imports images", async ( { page, wiki } ) =>
    {
        await page.route( "https://images.exemple.test/**", ( route ) => route.fulfill( { status: 404 } ) );
        await wiki.openWith( illustratedDataset(), `/edit/${ PAGES.port.slug }` );

        expect( await suggestionsOf( page.getByLabel( "Intitulé de la ligne 1" ) ) )
            .toContain( PAGES.port.infobox[ 0 ]?.label );

        await page.getByRole( "button", { name: "Ajouter une illustration" } ).click();

        const field = page.getByLabel( "Adresse de l'image" );

        expect( await suggestionsOf( field ) ).toContain( ILLUSTRATION );

        await field.fill( "https://images.exemple.test/absente.webp" );

        await expect( page.getByText( "Cette illustration ne se charge pas" ) ).toBeVisible();

        const dialog = page.getByRole( "dialog", { name: "Importer une image" } );

        await field.fill( IMPORTED_IMAGE );

        await expect( dialog ).toBeVisible();
        await expect( field ).toHaveValue( "" );

        await dialog.getByRole( "button", { name: "Annuler" } ).click();

        await expect( dialog ).toBeHidden();
        await expect( field ).toHaveValue( "" );

        const chooser = page.waitForEvent( "filechooser" );

        await page.getByRole( "button", { name: "Choisir une image" } ).click();
        await ( await chooser ).setFiles( {
            name: "ponton.png",
            mimeType: "image/png",
            buffer: Buffer.from( IMPORTED_IMAGE.split( "," )[ 1 ] ?? "", "base64" )
        } );

        await dialog.getByRole( "radio", { name: "Légère" } ).check();

        await expect( dialog.getByText( /^1 × 1 px, environ/ ) ).toBeVisible();

        await dialog.getByRole( "button", { name: "Importer" } ).click();

        await expect( dialog ).toBeHidden();
        await expect( page.getByText( /^Image importée de cet appareil/ ) ).toBeVisible();
        await expect( page.getByLabel( "Adresse de l'image" ) ).toHaveCount( 0 );

        await page.locator( BODY ).getByRole( "paragraph" ).last().click();
        await page.keyboard.press( "End" );
        await page.keyboard.press( "Enter" );
        await page.keyboard.type( "/" );
        await page.locator( ".milkdown-slash-menu" ).getByText( "Image", { exact: true } ).click();
        await page.locator( ".image-edit input.link-input-area" ).evaluate( ( element, text ) =>
        {
            const transfer = new DataTransfer();

            transfer.setData( "text/plain", text );
            element.dispatchEvent( new ClipboardEvent( "paste", { clipboardData: transfer, bubbles: true, cancelable: true } ) );
        }, IMPORTED_IMAGE );
        await dialog.getByRole( "button", { name: "Importer" } ).click();

        await expect( dialog ).toBeHidden();

        await page.waitForTimeout( MARKDOWN_DEBOUNCE * 2 );
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        const stored = await wiki.storedEntry( PAGES.port.slug );

        expect( stored?.image?.src ).toMatch( /^data:image\/webp;base64,/ );
        expect( stored?.body ).toMatch( /\]\(data:image\/webp;base64,/ );

        await expect( page.getByRole( "article" ).getByRole( "img", { name: FIGURE_ALT } ) )
            .toHaveAttribute( "src", IMPORTED_IMAGE );

        // On the published page the illustration heads the panel beside the body, and closes it on a phone.
        await page.goto( `/entries/${ PAGES.port.slug }/` );

        const infobox = page.getByRole( "complementary", { name: "Fiche signalétique" } );
        const plate = await infobox.locator( "figure img" ).boundingBox();
        const firstRow = await infobox.locator( "dt" ).first().boundingBox();

        expect( ( plate?.y ?? 0 ) > ( firstRow?.y ?? 0 ) ).toBe( isNarrow( page ) );
    } );

    test( "walks and moves the infobox rows from the keyboard, and takes a removed one back", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.port.slug }` );

        await page.getByLabel( `Valeur de « ${ PAGES.port.infobox[ 0 ]?.label } »` ).press( "Enter" );

        await expect( page ).toHaveURL( new RegExp( `/edit/${ PAGES.port.slug }/$` ) );
        await expect( page.getByLabel( "Intitulé de la ligne 2" ) ).toBeFocused();

        await page.getByLabel( "Intitulé de la ligne 2" ).fill( "Quais" );
        await page.getByLabel( "Valeur de « Quais »" ).fill( "Sept" );

        // A row links a page from its own control, after what it already says.
        await page.getByRole( "button", { name: "Quais : lier une fiche" } ).click();
        await page.getByPlaceholder( "Titre de la fiche à lier" ).fill( PAGES.athena.title );
        await page.getByRole( "button", { name: `${ PAGES.athena.title } /entries/${ PAGES.athena.slug }` } ).click();

        // Out of focus, the value reads as the infobox will show it rather than as Markdown.
        const card = page.getByRole( "complementary", { name: "Infobox" } );

        await expect( card.getByText( PAGES.athena.title, { exact: true } ) ).toBeVisible();

        // Alt and an arrow carry the whole row, and the focus with it.
        await page.getByLabel( "Valeur de « Quais »" ).press( "Alt+ArrowUp" );

        await expect( page.getByLabel( "Intitulé de la ligne 1" ) ).toHaveValue( "Quais" );
        await expect( page.getByLabel( "Valeur de « Quais »" ) ).toBeFocused();

        // A row goes at once, and comes back from the line announcing it.
        await page.getByRole( "button", { name: "Supprimer Quais" } ).click();

        const removal = card.getByRole( "status" ).filter( { hasText: "Ligne retirée" } );

        await expect( removal ).toHaveText( "Ligne retirée : Quais" );
        await expect( page.getByLabel( "Valeur de « Quais »" ) ).toHaveCount( 0 );

        await card.getByRole( "button", { name: "Rétablir" } ).click();

        await expect( page.getByLabel( "Intitulé de la ligne 1" ) ).toHaveValue( "Quais" );
        await expect( page.getByLabel( "Intitulé de la ligne 1" ) ).toBeFocused();

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        const stored = await wiki.storedEntry( PAGES.port.slug );

        expect( stored?.infobox[ 0 ] ).toEqual(
            { label: "Quais", value: `Sept, [${ PAGES.athena.title }](/entries/${ PAGES.athena.slug })` }
        );
    } );

    test( "measures the body and the summary as they are written", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.port.slug }` );

        // The count only shows while the summary is being written.
        await page.getByLabel( "Résumé" ).focus();

        await expect( page.getByText( `Longueur : ${ PAGES.port.summary.length } / 160` ) ).toBeVisible();

        await page.getByLabel( "Résumé" ).fill( "Court." );

        await expect( page.getByText( "Longueur : 6 / 160" ) ).toBeVisible();
        await expect( page.getByText( "min de lecture" ) ).toBeVisible();
    } );

    test( "draws invented names, holds them still, and writes the chosen one down", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByLabel( "Titre", { exact: true } ).fill( "Le cartographe des seuils" );
        await page.locator( BODY ).click();
        await page.getByRole( "button", { name: "Inventer", exact: true } ).click();

        const dialog = page.getByRole( "dialog", { name: "Inventer un nom" } );
        const offered = dialog.getByRole( "listitem" );

        // Full screen on a phone, the dialog says in words how to leave it empty handed.
        await dialog.getByRole( "button", { name: "Annuler" } ).click();
        await expect( dialog ).toBeHidden();
        await page.getByRole( "button", { name: "Inventer", exact: true } ).click();

        await expect( offered.first() ).toBeVisible();

        const drawn = await offered.allInnerTexts();

        // Walking through the kinds is looking at what was drawn, not drawing again:
        // a candidate half chosen has to still be there on the way back.
        await dialog.getByRole( "button", { name: "Ville" } ).click();
        await dialog.getByRole( "button", { name: "Nom complet" } ).click();

        expect( await offered.allInnerTexts() ).toEqual( drawn );

        await dialog.getByRole( "button", { name: "Relancer" } ).click();

        await expect.poll( () => offered.allInnerTexts() ).not.toEqual( drawn );

        const first = offered.first().getByRole( "button" );
        const invented = ( await first.textContent() )?.trim() ?? "";

        await first.click();
        await expect( dialog ).toBeHidden();
        await expect( page.locator( BODY ) ).toContainText( invented );

        await page.waitForTimeout( MARKDOWN_DEBOUNCE );
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        expect( ( await wiki.storedEntry( "le-cartographe-des-seuils" ) )?.body ).toContain( invented );
    } );

    test( "deletes a page once the deletion is confirmed, after saying what it breaks", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.traite.slug }` );

        await page.getByRole( "button", { name: SETTINGS } ).click();
        await page.getByRole( "button", { name: "Supprimer la fiche" } ).click();

        const dialog = page.getByRole( "dialog", { name: "Supprimer cette fiche ?" } );

        await expect( dialog ).toContainText( "fiches la citent : leurs liens deviendront des liens rouges." );
        await expect( dialog ).toContainText( "Vous pourrez la rétablir juste après" );

        await wiki.confirm( "Supprimer cette fiche ?", "Supprimer" );

        await expect( page ).toHaveURL( /\/entries\/$/ );
        await expect( page.getByRole( "link", { name: PAGES.traite.title } ) ).toBeHidden();
        expect( await wiki.storedEntry( PAGES.traite.slug ) ).toBeUndefined();

        await expect( page.getByRole( "status" ).filter( { hasText: `Fiche « ${ PAGES.traite.title } » supprimée.` } ) )
            .toBeVisible();
        await page.getByRole( "button", { name: "Rétablir" } ).click();

        await expect( page.getByRole( "link", { name: PAGES.traite.title } ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Rétablir" } ) ).toBeHidden();
        expect( ( await wiki.storedEntry( PAGES.traite.slug ) )?.title ).toBe( PAGES.traite.title );
    } );

    test( "saves without leaving, and keeps editing the page it just created", async ( { page, wiki } ) =>
    {
        await wiki.open( "/new" );

        await page.getByLabel( "Titre", { exact: true } ).fill( "Digue de Sainte Roque" );
        await page.getByLabel( "Résumé" ).fill( "La digue qui protège le seuil." );

        // The save button names the shortcut it answers to, which is how it is learnt.
        await expect( page.getByRole( "button", { name: "Enregistrer", exact: true } ) )
            .toHaveAttribute( "aria-keyshortcuts", "Control+S Meta+S" );
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

        // Leaving over a change still unsaved can write it on the way out.
        await page.getByLabel( "Résumé" ).fill( "La digue du seuil." );
        await page.getByRole( "link", { name: "Fermer" } ).click();
        await wiki.confirm( UNSAVED_DIALOG, "Enregistrer et quitter" );

        await expect( page ).toHaveURL( /\/entries\/digue-de-sainte-roque\/$/ );
        expect( ( await wiki.storedEntry( "digue-de-sainte-roque" ) )?.summary ).toBe( "La digue du seuil." );
    } );

    test( "holds the editor open over unsaved changes, then leaves without storing", async ( { page, wiki } ) =>
    {
        await wiki.open( `/edit/${ PAGES.traite.slug }` );

        await expect( page.getByRole( "textbox", { name: "Corps de la fiche, en Markdown" } ) ).toContainText( "route du nord" );
        await page.waitForTimeout( 600 );
        await expect( page.getByRole( "status" ).filter( { hasText: "Aucune modification" } ) ).toBeVisible();

        await page.getByLabel( "Résumé" ).fill( "Une reformulation abandonnée." );
        await page.getByRole( "link", { name: "Fermer" } ).click();

        await expect( page.getByText( "Certaines modifications ne sont pas enregistrées" ) ).toBeVisible();

        await wiki.confirm( UNSAVED_DIALOG, "Rester" );

        await expect( page ).toHaveURL( new RegExp( `/edit/${ PAGES.traite.slug }/$` ) );
        await expect( page.getByLabel( "Résumé" ) ).toHaveValue( "Une reformulation abandonnée." );

        // A category declared for a page that is then abandoned goes with it.
        await page.getByRole( "button", { name: "Choisir les catégories" } ).click();
        await page.getByRole( "button", { name: "Nouvelle catégorie" } ).click();
        await page.getByLabel( "Nom" ).fill( "Relevés" );
        await page.getByRole( "dialog" ).getByRole( "button", { name: "Créer" } ).click();

        await expect( page.getByRole( "checkbox", { name: "Relevés" } ) ).toBeChecked();

        await page.getByRole( "link", { name: "Fermer" } ).click();

        await wiki.confirm( UNSAVED_DIALOG, "Quitter sans enregistrer" );

        await expect( page ).toHaveURL( new RegExp( `/entries/${ PAGES.traite.slug }/$` ) );
        expect( ( await wiki.storedEntry( PAGES.traite.slug ) )?.summary ).toBe( PAGES.traite.summary );
        // The category goes when the editor is torn down, which lands just after the url has changed.
        await expect.poll( async () => ( await wiki.storedOverlay() )?.categories[ "releves" ] ).toBeUndefined();
    } );
} );
