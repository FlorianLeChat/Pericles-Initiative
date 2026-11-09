/**
 * Settings: the identity of the wiki and the pages it puts forward.
 *
 * These fields live in `meta`, so a change here is a local change like any
 * other: it has to reach the header, the home page and the browser's storage.
 *
 * @author Claude
 */

import type { Locator, Page } from "@playwright/test";
import { COUNTS, IMPORTED_IMAGE, MISSING_SLUG, PAGES, UNIVERSE } from "./utilities/dataset";
import { ACCENTS, DEFAULT_ACCENT, type Accent } from "#lib/config/accents.ts";
import { expect, isNarrow, LOCALE_KEY, test, type WikiHelper } from "./utilities/fixtures";

/**
 * Reaches the settings the way a reader does, from a page already open.
 *
 * Deliberately not a direct `goto`: the form only mounts once `wiki.overlayLoaded`
 * is true, like `/edit/[slug]` does for the entry it edits, and by the time this
 * link is clicked the overlay was already read on the app's first load.
 *
 * @param page Page under test.
 * @param wiki Fixture helper.
 * @author Claude
 */
const openSettings = async ( page: Page, wiki: WikiHelper ): Promise<void> =>
{
    await wiki.open( "/" );
    await wiki.openTool( "Paramètres" );

    await expect( page ).toHaveURL( /\/settings\/$/ );
};

/**
 * Reads the colour one pill of the accent picker is painted in.
 *
 * The radio is stretched over its pill and invisible, so the surface to measure is
 * the label around it.
 *
 * @param radio Radio the pill wraps.
 * @returns Computed background colour of the pill.
 * @author Claude
 */
const tintOf = ( radio: Locator ): Promise<string> =>
    radio.evaluate( ( input ) => getComputedStyle( input.closest( "label" ) as HTMLElement ).backgroundColor );

test.describe( "settings", () =>
{
    test( "renames the universe everywhere, and remembers it", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );

        await expect( page.getByLabel( "Nom de l'univers" ) ).toHaveValue( UNIVERSE );

        // At rest the bar is only its status: the button comes with the first change.
        await expect( page.getByText( "Tout est enregistré." ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Enregistrer", exact: true } ) ).toHaveCount( 0 );

        await page.getByLabel( "Nom de l'univers" ).fill( "" );

        await expect( page.getByRole( "button", { name: "Enregistrer" } ) ).toBeDisabled();

        await page.getByLabel( "Nom de l'univers" ).fill( "Périclès, second cycle" );
        await page.getByLabel( "Logo" ).fill( IMPORTED_IMAGE );
        await page.getByRole( "dialog", { name: "Importer une image" } ).getByRole( "button", { name: "Importer" } ).click();

        await expect( page.getByText( /^Image importée de cet appareil/ ) ).toBeVisible();

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page.getByText( "Enregistré." ) ).toBeVisible();
        await expect( page.getByRole( "banner" ) ).toContainText( "Périclès, second cycle" );

        await page.reload();

        await expect( page.getByRole( "banner" ) ).toContainText( "Périclès, second cycle" );
        expect( ( await wiki.storedOverlay() )?.meta?.universe ).toBe( "Périclès, second cycle" );
        expect( ( await wiki.storedOverlay() )?.meta?.logo ).toMatch( /^data:image\/webp;base64,/ );
    } );

    test( "changes the pages put forward on the home page", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );

        const featured = page.locator( "section" ).filter( { hasText: "Fiches à la une" } );

        await expect( featured.getByRole( "listitem" ) ).toHaveCount( 3 );
        await expect( featured.getByRole( "listitem" ).first() ).toContainText( "Grande carte" );
        await expect( featured.getByRole( "listitem" ).last() ).toContainText( "Liste de l'accueil" );

        await featured.getByRole( "listitem" ).filter( { hasText: PAGES.athena.title } )
            .getByRole( "button", { name: "Retirer" } ).click();

        await featured.getByRole( "button", { name: "Ajouter une fiche" } ).click();
        await page.getByPlaceholder( "Titre de la fiche à lier" ).fill( PAGES.doctrine.title );
        await page.getByRole( "button", { name: `${ PAGES.doctrine.title } /entries/${ PAGES.doctrine.slug }` } ).click();

        await expect( featured.getByRole( "listitem" ) ).toHaveCount( 3 );

        await expect( page.getByText( "Modifications non enregistrées." ) ).toBeVisible();

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page.getByText( "Enregistré." ) ).toBeVisible();

        await page.goto( "/" );

        const highlight = page.locator( "section" ).filter( { hasText: "À la une" } );

        await expect( highlight.getByRole( "heading", { name: PAGES.port.title } ) ).toBeVisible();
        await expect( highlight.getByRole( "heading", { name: PAGES.athena.title } ) ).toBeHidden();
    } );

    test( "repaints the whole site in the chosen colour, and remembers it", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );

        const chosen = ACCENTS.find( ( accent ) => accent.key !== DEFAULT_ACCENT ) as Accent;
        const pill = ( accent: Accent ): Locator => page.locator( `div[data-accent="${ accent.key }"]` ).getByRole( "radio" );

        await expect( page.locator( "html" ) ).toHaveAttribute( "data-accent", DEFAULT_ACCENT );

        const tints = await Promise.all( ACCENTS.map( ( accent ) => tintOf( pill( accent ) ) ) );

        expect( new Set( tints ).size ).toBe( ACCENTS.length );

        await pill( chosen ).check();
        await expect( page.locator( "html" ) ).toHaveAttribute( "data-accent", DEFAULT_ACCENT );

        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await expect( page.locator( "html" ) ).toHaveAttribute( "data-accent", chosen.key );

        await page.reload();

        await expect( page.locator( "html" ) ).toHaveAttribute( "data-accent", chosen.key );
        expect( ( await wiki.storedOverlay() )?.meta?.accent ).toBe( chosen.key );
    } );

    test( "reads only on this device, then puts every setting back and spares the pages", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );

        // Reading only applies at once, with no save, and is remembered outside the overlay.
        await page.getByRole( "radio", { name: "Lire seulement" } ).click();

        expect( await page.evaluate( () => window.localStorage.getItem( "pericles:mode" ) ) ).toBe( "lecture" );

        // The sounds start silent, and turning them on is remembered beside the use of the device.
        await expect( page.getByRole( "radio", { name: "Silencieux" } ) ).toBeChecked();
        await page.getByRole( "radio", { name: "Sons activés" } ).click();

        expect( await page.evaluate( () => window.localStorage.getItem( "pericles:sound" ) ) ).toBe( "on" );

        // Their material is only offered once they are on, glass first.
        await expect( page.getByRole( "radio", { name: "Verre" } ) ).toBeChecked();
        await page.getByRole( "radio", { name: "Mécanique" } ).click();

        expect( await page.evaluate( () => window.localStorage.getItem( "pericles:sound-theme" ) ) ).toBe( "mech" );

        await wiki.navigate( "En direct" );

        await expect( page.getByRole( "heading", { name: "En direct", level: 1 } ) ).toBeVisible();
        await expect( page.getByRole( "article" ) ).toHaveCount( COUNTS.live );
        await expect( page.getByRole( "button", { name: "Publier une entrée" } ) ).toHaveCount( 0 );
        await expect( page.getByRole( "button", { name: /^Modifier l'entrée/ } ) ).toHaveCount( 0 );
        await expect( page.getByRole( "link", { name: "Nouvelle fiche" } ) ).toHaveCount( 0 );

        // The chronology says undated pages are left out, without sending a player to the workbench.
        await wiki.navigate( "Chronologie" );

        await expect( page.getByRole( "heading", { name: "Chronologie", level: 1 } ) ).toBeVisible();
        await expect( page.getByRole( "link", { name: "points d'attention" } ) ).toHaveCount( 0 );

        // On a reading phone the search leaves the header for the foot of the screen, in reach of the thumb.
        if ( isNarrow( page ) )
        {
            const search = page.getByRole( "button", { name: "Rechercher", exact: true } );
            const box = await search.boundingBox();

            expect( box?.y ?? 0 ).toBeGreaterThan( ( page.viewportSize()?.height ?? 0 ) / 2 );
            await search.click();
            await expect( page.getByRole( "dialog" ) ).toBeVisible();
            await page.keyboard.press( "Escape" );
            await expect( page.getByRole( "dialog" ) ).toBeHidden();
        }

        // The dashboard leaves the tools of a reading device; reached by its address, it offers no way into the editor.
        await page.goto( "/dashboard/" );

        await expect( page.getByRole( "main" ).getByRole( "navigation", { name: "Outils" } ).getByRole( "link" ) )
            .toHaveText( [ "Sauvegardes", "Paramètres" ] );

        await expect( page.getByRole( "heading", { name: "Pages à écrire" } ) ).toBeVisible();
        await expect( page.getByRole( "link", { name: /^Créer la fiche/ } ) ).toHaveCount( 0 );
        await expect( page.getByRole( "link", { name: /^Modifier la fiche/ } ) ).toHaveCount( 0 );

        // The backups keep the download and the restore, but no demonstration and no way to empty the wiki.
        await page.goto( "/data/" );

        await expect( page.getByRole( "button", { name: "Télécharger ma sauvegarde" } ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Restaurer cette sauvegarde" } ) ).toBeVisible();
        await expect( page.getByRole( "button", { name: "Effacer tout mon contenu" } ) ).toHaveCount( 0 );
        await expect( page.getByRole( "button", { name: /démonstration/ } ) ).toHaveCount( 0 );

        // A page still to write tells a player it is not written, never to write it, and says it once.
        await page.goto( `/entries/${ MISSING_SLUG }/` );

        await expect( page.getByRole( "heading", { name: "Personne n'a encore écrit cette fiche" } ) ).toBeVisible();
        await expect( page.getByText( /Écrivez-la/ ) ).toHaveCount( 0 );
        await expect( page.getByRole( "link", { name: "L'écrire" } ) ).toHaveCount( 0 );

        await wiki.openTool( "Paramètres" );

        await expect( page.getByRole( "radio", { name: "Lire seulement" } ) ).toBeChecked();
        await expect( page.getByRole( "radio", { name: "Sons activés" } ) ).toBeChecked();
        await expect( page.getByRole( "radio", { name: "Mécanique" } ) ).toBeChecked();

        await page.getByLabel( "Description" ).fill( "Une description de passage." );
        await page.getByRole( "button", { name: "Enregistrer" } ).click();

        await page.getByRole( "button", { name: "Remettre mes réglages par défaut" } ).click();
        await wiki.confirm( "Remettre vos réglages par défaut ?", "Remettre" );

        await expect( page.getByRole( "heading", { name: "Settings", level: 1 } ) ).toBeVisible();
        await expect( page.getByLabel( "Universe name" ) ).toHaveValue( "Unnamed universe" );

        const overlay = await wiki.storedOverlay();

        expect( overlay?.meta ).toBeNull();
        expect( Object.keys( overlay?.entries ?? {} ) ).toHaveLength( COUNTS.entries );
        expect( await page.evaluate( () => window.localStorage.getItem( "pericles:mode" ) ) ).toBeNull();
        await expect( page.getByRole( "radio", { name: "Read and write" } ) ).toBeChecked();
        expect( await page.evaluate( () => window.localStorage.getItem( "pericles:sound" ) ) ).toBeNull();
        await expect( page.getByRole( "radio", { name: "Silent" } ) ).toBeChecked();
        await expect( page.getByRole( "radio", { name: "Glass" } ) ).toHaveCount( 0 );
        expect( await page.evaluate( () => window.localStorage.getItem( "pericles:sound-theme" ) ) ).toBeNull();
    } );

    test( "switches the language, remembers it, and reloads the page in it", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );
        await expect( page.locator( "html" ) ).toHaveAttribute( "lang", "fr" );
        await page.getByRole( "radio", { name: "English" } ).click();

        await expect( page ).toHaveURL( /\/settings\/$/ );
        await expect( page.getByRole( "heading", { name: "Settings", level: 1 } ) ).toBeVisible();
        await expect( page.locator( "html" ) ).toHaveAttribute( "lang", "en" );
        await expect( page.getByLabel( "Universe name" ) ).toBeVisible();

        const locale = await page.evaluate( ( key ) => window.localStorage.getItem( key ), LOCALE_KEY );

        expect( locale ).toBe( "en" );

        await page.getByRole( "radio", { name: "Français" } ).click();
        await expect( page.getByRole( "heading", { name: "Paramètres", level: 1 } ) ).toBeVisible();
    } );

    test( "guards a language switch over unsaved edits, then saves them before switching", async ( { page, wiki } ) =>
    {
        await openSettings( page, wiki );

        // An empty name cannot be saved, so the guard can only offer to switch without it.
        await page.getByLabel( "Nom de l'univers" ).fill( "" );
        await page.getByRole( "radio", { name: "English" } ).click();

        await wiki.confirm( "Changer de langue sans enregistrer ?", "Annuler" );

        await expect( page.getByRole( "radio", { name: "Français" } ) ).toBeChecked();
        await expect( page.getByText( "Donnez un nom à l'univers pour pouvoir enregistrer." ) ).toBeVisible();
        await expect( page.getByLabel( "Nom de l'univers" ) ).toHaveValue( "" );

        await page.getByLabel( "Nom de l'univers" ).fill( "Périclès, troisième cycle" );
        await page.getByRole( "radio", { name: "English" } ).click();

        await expect( page.getByRole( "radio", { name: "Français" } ) ).toBeChecked();

        await wiki.confirm( "Enregistrer avant de changer de langue ?", "Enregistrer et changer" );

        await expect( page.getByRole( "heading", { name: "Settings", level: 1 } ) ).toBeVisible();
        await expect( page.getByLabel( "Universe name" ) ).toHaveValue( "Périclès, troisième cycle" );
        expect( ( await wiki.storedOverlay() )?.meta?.universe ).toBe( "Périclès, troisième cycle" );
    } );
} );
