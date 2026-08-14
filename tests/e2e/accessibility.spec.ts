/**
 * Accessibility of every page, checked with axe.
 *
 * A report written once goes stale with the next commit, so the check lives here
 * instead: it runs on both viewports like the rest of the suite, and a regression
 * fails a push rather than waiting to be noticed.
 *
 * What axe finds is a floor, not a ceiling. It catches contrast, names, roles and
 * structure, and says nothing about whether the keyboard order makes sense or
 * whether a French sentence reads well out loud. Those stay the job of the other
 * specs, which is why this one only asserts the absence of violations.
 *
 * @author Claude
 */

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { CATEGORIES, PAGES } from "./utilities/dataset";
import { expect, isNarrow, test, waitForDrawer } from "./utilities/fixtures";

/**
 * The rule sets checked, which are the levels the site claims to meet.
 *
 * `best-practice` is deliberately left out: it reports preferences, such as a
 * heading order it would rather see, alongside real defects, and a check that
 * cries wolf stops being read.
 */
const STANDARDS = [ "wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa" ];

/**
 * Stills the page before it is measured.
 *
 * Listings arrive through `rise-in`, which fades them up from nothing, and axe
 * samples whatever colour an element happens to have at that instant. Measured
 * mid entrance, ordinary body text reports a contrast of 1.2 against the paper
 * and every card on the page is called a failure. Asking for reduced motion is
 * what settles them: `app.css` flattens every animation under that query, so the
 * colours axe reads are the ones the reader ends up looking at.
 *
 * @param page Page under test.
 * @returns Resolves once the page will hold still.
 * @author Claude
 */
const still = async ( page: Page ): Promise<void> =>
{
    await page.emulateMedia( { reducedMotion: "reduce" } );
};

/**
 * Runs axe over the page currently open and expects a clean result.
 *
 * @param page Page under test.
 * @returns Resolves once the page has been analysed.
 * @author Claude
 */
const audit = async ( page: Page ): Promise<void> =>
{
    const { violations } = await new AxeBuilder( { page } ).withTags( STANDARDS ).analyze();

    // Named one by one in the message: a bare count sends the reader to the
    // terminal scrollback to find out which rule broke and where.
    expect( violations.map( ( violation ) => `${ violation.id }: ${ violation.nodes.length } élément(s)` ) ).toEqual( [] );
};

/** Every page reachable by url, with the fixture wiki behind it. */
const ROUTES: readonly { name: string; path: string }[] = [
    { name: "accueil", path: "/" },
    { name: "encyclopédie", path: "/wiki" },
    { name: "fiche", path: `/wiki/${ PAGES.athena.slug }` },
    { name: "fiche à écrire", path: "/wiki/une-fiche-absente" },
    { name: "catégories", path: "/categories" },
    { name: "catégorie", path: `/categories/${ CATEGORIES.institutions.slug }` },
    { name: "gestion des catégories", path: "/categories/manage" },
    { name: "fil en direct", path: "/live" },
    { name: "chronologie", path: "/timeline" },
    { name: "tableau de bord", path: "/dashboard" },
    { name: "données", path: "/data" },
    { name: "éditeur", path: `/edit/${ PAGES.athena.slug }` }
];

test.describe( "accessibility", () =>
{
    for ( const route of ROUTES )
    {
        test( `${ route.name } has no violation`, async ( { page, wiki } ) =>
        {
            await still( page );
            await wiki.open( route.path );

            if ( route.path.startsWith( "/edit/" ) )
            {
                // Milkdown arrives late, and until it does the toolbar sits
                // disabled and greyed. Measuring then would be measuring a state
                // no reader ever works in, and would report its own dimming as a
                // contrast fault.
                await expect( page.getByRole( "button", { name: "Lier une fiche" } ) ).toBeEnabled();
            }

            await audit( page );
        } );
    }

    test( "empty wiki has no violation", async ( { page, wiki } ) =>
    {
        await still( page );
        await wiki.openEmpty( "/wiki" );
        await audit( page );
    } );

    test( "settings has no violation", async ( { page, wiki } ) =>
    {
        // Reached by clicking, like `settings.spec.ts` does: the form snapshots
        // the identity as it initialises, which on a cold load happens before the
        // overlay has been read, and would leave every field empty.
        await still( page );
        await wiki.open( "/" );

        if ( isNarrow( page ) )
        {
            await page.getByRole( "button", { name: "Ouvrir la navigation" } ).click();
            await page
                .getByRole( "navigation", { name: "Navigation mobile" } )
                .getByRole( "link", { name: "Paramètres" } )
                .click();
            await waitForDrawer( page );
        }
        else
        {
            await page.getByRole( "button", { name: "Outils" } ).click();
            await page.getByRole( "menuitem", { name: "Paramètres" } ).click();
        }

        await expect( page ).toHaveURL( /\/settings$/ );
        await audit( page );
    } );

    test( "search palette has no violation", async ( { page, wiki } ) =>
    {
        await still( page );
        await wiki.open();

        await page.keyboard.press( "Control+k" );
        await page.keyboard.type( "vance" );

        await expect( page.getByRole( "option" ).first() ).toBeVisible();
        await audit( page );
    } );

    test( "mobile navigation has no violation", async ( { page, wiki } ) =>
    {
        test.skip( !isNarrow( page ), "The drawer only exists below the lg breakpoint." );

        await still( page );
        await wiki.open();
        await page.getByRole( "button", { name: "Ouvrir la navigation" } ).click();

        await expect( page.getByRole( "dialog", { name: "Navigation du site" } ) ).toBeVisible();
        await audit( page );
    } );

    test( "a confirmation dialog has no violation", async ( { page, wiki } ) =>
    {
        await still( page );
        await wiki.open( `/edit/${ PAGES.athena.slug }` );

        await page.getByRole( "button", { name: "Supprimer la fiche" } ).click();

        await expect( page.getByRole( "dialog", { name: "Supprimer cette fiche ?" } ) ).toBeVisible();
        await audit( page );
    } );
} );
