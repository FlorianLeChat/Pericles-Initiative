/**
 * The content every end to end test runs against.
 *
 * A fresh browser starts from an empty wiki, and nothing ships a seed, so a spec
 * that needs pages writes them into the browser's storage itself. This module is
 * the single description of that content: specs assert against the constants
 * exported here rather than repeating strings, so renaming a fixture page cannot
 * silently break half the suite.
 *
 * The fiction obeys the typography rules of the project, since it is sample text
 * like any other: no dashes, French quotation marks, typographic apostrophes.
 *
 * @author Claude
 */

import { DEFAULT_ACCENT } from "$lib/config/accents";
import type { Category, Dataset, Entry, LiveEntry, Overlay } from "$lib/types";

export const UNIVERSE = "Périclès";

export const DESCRIPTION = "Les gens, les lieux et les décisions qui font tenir un archipel bâti sur l’eau.";

/** A page every fixture body links to, and that nothing ever creates: the red link of the suite. */
export const MISSING_SLUG = "conseil-des-parties";

/**
 * Builds an ISO timestamp a given number of hours in the past.
 *
 * @param hours How far back to go.
 * @returns The timestamp, as the dataset stores them.
 * @author Claude
 */
const hoursAgo = ( hours: number ): string => new Date( Date.now() - hours * 3_600_000 ).toISOString();

/**
 * Builds an ISO timestamp a given number of days in the past.
 *
 * @param days How far back to go.
 * @returns The timestamp, as the dataset stores them.
 * @author Claude
 */
const daysAgo = ( days: number ): string => hoursAgo( days * 24 );

/**
 * Assembles one page, filling in the field every fixture derives rather than states.
 *
 * @param entry Fields specific to this page.
 * @returns A complete `Entry`.
 * @author Claude
 */
const buildEntry = ( entry: Omit<Entry, "createdAt"> ): Entry => ( { ...entry, createdAt: entry.updatedAt } );

const CATEGORY_LIST: Category[] = [
    {
        slug: "institutions",
        name: "Institutions",
        description: "Les corps qui décident pour l’archipel.",
        color: "bleu",
        parent: null
    },
    {
        slug: "sites",
        name: "Sites et installations",
        description: "Les lieux bâtis sur l’eau, des pontons aux digues.",
        color: "vert",
        parent: null
    },
    {
        slug: "doctrines",
        name: "Doctrines",
        description: "Les idées qui traversent les cités.",
        color: "violet",
        parent: null
    }
];

const ENTRY_LIST: Entry[] = [
    buildEntry( {
        id: "fixture-athena",
        slug: "athena-vance",
        title: "Athéna Vance",
        type: "personnage",
        summary: "Navigatrice en chef de l’archipel, première signataire du traité des marées.",
        body: [
            "## Origines",
            "",
            "Née sur les pontons de [Port Méridien](/wiki/port-meridien), elle apprend à lire les courants bien",
            "avant d’apprendre à écrire.",
            "",
            "## Le traité",
            "",
            "Son nom reste attaché au [traité des marées](/wiki/traite-des-marees), qu’elle défend seule devant",
            `le [Conseil des parties](/wiki/${ MISSING_SLUG }) pendant soixante douze heures.`,
            "",
            "### Postérité",
            "",
            "« Elle a rendu la mer lisible », dit d’elle le premier rapport du bureau.",
            "",
            "Les cités flottantes lui doivent leurs routes actuelles, et l’usage de nommer les courants."
        ].join( "\n" ),
        categories: [ "institutions" ],
        infobox: [
            { label: "Fonction", value: "Navigatrice en chef" },
            { label: "Port d’attache", value: "Port Méridien" }
        ],
        image: null,
        timelineDate: "2043-06-12",
        status: "publie",
        aliases: [ "La Vance" ],
        updatedAt: daysAgo( 1 )
    } ),
    buildEntry( {
        id: "fixture-port",
        slug: "port-meridien",
        title: "Port Méridien",
        type: "lieu",
        summary: "La plus ancienne des cités flottantes, amarrée sur le seuil du détroit.",
        body: [
            "## Le seuil",
            "",
            "Trois digues, quatre sas, et une population qui change avec la marée.",
            "",
            "La cité est administrée par le [Bureau des courants](/wiki/bureau-des-courants), sous l’autorité",
            "d’[Athéna Vance](/wiki/athena-vance)."
        ].join( "\n" ),
        categories: [ "sites" ],
        infobox: [ { label: "Population", value: "12 400" } ],
        image: null,
        timelineDate: "2041",
        status: "publie",
        aliases: [],
        updatedAt: daysAgo( 2 )
    } ),
    buildEntry( {
        id: "fixture-traite",
        slug: "traite-des-marees",
        title: "Traité des marées",
        type: "evenement",
        summary: "L’accord qui répartit les routes navigables entre les cités.",
        body: [
            "## Signature",
            "",
            "Signé sur le pont de [Port Méridien](/wiki/port-meridien) après deux hivers de négociation, il fixe",
            "pour la première fois des routes qui ne dépendent plus de la force."
        ].join( "\n" ),
        categories: [ "institutions" ],
        infobox: [ { label: "Articles", value: "11" } ],
        image: null,
        timelineDate: "2043-09-01",
        status: "publie",
        aliases: [],
        updatedAt: daysAgo( 3 )
    } ),
    buildEntry( {
        id: "fixture-bureau",
        slug: "bureau-des-courants",
        title: "Bureau des courants",
        type: "organisation",
        summary: "L’administration qui relève les courants et délivre les autorisations d’amarrage.",
        body: [
            "## Mandat",
            "",
            "Le bureau relève les courants, publie les cartes et arbitre les litiges d’amarrage. Il a été fondé",
            "à la demande d’[Athéna Vance](/wiki/athena-vance)."
        ].join( "\n" ),
        categories: [ "institutions" ],
        infobox: [],
        image: null,
        timelineDate: null,
        status: "publie",
        aliases: [],
        updatedAt: daysAgo( 4 )
    } ),
    buildEntry( {
        id: "fixture-sceau",
        slug: "sceau-de-vitre",
        title: "Sceau de vitre",
        type: "objet",
        summary: "",
        body: "Un disque de verre coulé, apposé sur les actes que le bureau reconnaît.\n",
        categories: [],
        infobox: [],
        image: null,
        timelineDate: null,
        status: "brouillon",
        aliases: [],
        updatedAt: daysAgo( 5 )
    } ),
    buildEntry( {
        id: "fixture-doctrine",
        slug: "doctrine-du-reflux",
        title: "Doctrine du reflux",
        type: "concept",
        summary: "L’idée qu’une cité doit pouvoir se défaire aussi vite qu’elle s’est nouée.",
        body: [
            "## Principe",
            "",
            "Née dans les marges du [traité des marées](/wiki/traite-des-marees), la doctrine tient en une",
            "phrase : ce qui s’amarre doit pouvoir partir."
        ].join( "\n" ),
        categories: [ "doctrines" ],
        infobox: [],
        image: null,
        timelineDate: "2044-03",
        status: "publie",
        aliases: [ "Le reflux" ],
        updatedAt: daysAgo( 6 )
    } )
];

const LIVE_LIST: LiveEntry[] = [
    {
        id: "fixture-live-pinned",
        publishedAt: hoursAgo( 26 ),
        title: "Le sas nord de Port Méridien reste fermé",
        body: "Le courant dépasse la vitesse admise depuis la nuit dernière.",
        severity: "important",
        tags: [ "port" ],
        entrySlug: "port-meridien",
        source: null,
        pinned: true
    },
    {
        id: "fixture-live-recent",
        publishedAt: hoursAgo( 2 ),
        title: "Athéna Vance quitte le Bureau des courants",
        body: "Elle laisse la charge des relevés à son adjoint.",
        severity: "info",
        tags: [ "institutions" ],
        entrySlug: "athena-vance",
        source: null,
        pinned: false
    },
    {
        id: "fixture-live-older",
        publishedAt: daysAgo( 3 ),
        title: "Le traité des marées entre en vigueur",
        body: "Les onze articles s’appliquent à compter de la prochaine marée haute.",
        severity: "urgent",
        tags: [ "traite" ],
        entrySlug: null,
        source: "Conseil des parties",
        pinned: false
    }
];

/**
 * Reads one fixture item out of a list, refusing to run against a list that lost it.
 *
 * @param items Fixture list to look into.
 * @param key Field identifying an item.
 * @param value Value that field must have.
 * @returns The matching item.
 * @throws When nothing matches, which means a fixture was renamed and a spec was not.
 * @author Claude
 */
const pick = <T>( items: T[], key: keyof T, value: string ): T =>
{
    const found = items.find( ( item ) => item[ key ] === value );

    if ( !found )
    {
        throw new Error( `The fixture dataset has no item whose ${ String( key ) } is «${ value }».` );
    }

    return found;
};

export const PAGES = {
    athena: pick( ENTRY_LIST, "slug", "athena-vance" ),
    port: pick( ENTRY_LIST, "slug", "port-meridien" ),
    traite: pick( ENTRY_LIST, "slug", "traite-des-marees" ),
    bureau: pick( ENTRY_LIST, "slug", "bureau-des-courants" ),
    sceau: pick( ENTRY_LIST, "slug", "sceau-de-vitre" ),
    doctrine: pick( ENTRY_LIST, "slug", "doctrine-du-reflux" )
};

export const CATEGORIES = {
    institutions: pick( CATEGORY_LIST, "slug", "institutions" ),
    sites: pick( CATEGORY_LIST, "slug", "sites" ),
    doctrines: pick( CATEGORY_LIST, "slug", "doctrines" )
};

export const LIVE = {
    pinned: pick( LIVE_LIST, "id", "fixture-live-pinned" ),
    recent: pick( LIVE_LIST, "id", "fixture-live-recent" ),
    older: pick( LIVE_LIST, "id", "fixture-live-older" )
};

const published = ENTRY_LIST.filter( ( entry ) => entry.status === "publie" );

/** What the fixture holds, counted from the lists so a page added to them is counted too. */
export const COUNTS = {
    entries: ENTRY_LIST.length,
    published: published.length,
    drafts: ENTRY_LIST.length - published.length,
    categories: CATEGORY_LIST.length,
    dated: published.filter( ( entry ) => entry.timelineDate !== null ).length,
    live: LIVE_LIST.length,
    /** Pages of the busiest category, which is the one the counters are asserted on. */
    institutions: published.filter( ( entry ) => entry.categories.includes( "institutions" ) ).length
};

/**
 * Builds the sample wiki, with timestamps relative to the moment it is called.
 *
 * Rebuilt per call rather than shared, so a spec that alters the dataset before
 * installing it cannot leak that change into the next test.
 *
 * @returns The complete content the fixtures install.
 * @author Claude
 */
export const sampleDataset = (): Dataset => ( {
    meta: {
        universe: UNIVERSE,
        description: DESCRIPTION,
        logo: "",
        accent: DEFAULT_ACCENT,
        featured: [ PAGES.athena.slug, PAGES.port.slug, PAGES.traite.slug ]
    },
    categories: structuredClone( CATEGORY_LIST ),
    entries: structuredClone( ENTRY_LIST ),
    live: structuredClone( LIVE_LIST )
} );

/**
 * Builds a wiki holding a single alert, recent enough to raise the site banner.
 *
 * Kept out of the sample on purpose: an alert younger than a day puts a banner on
 * top of every page, which every other spec would then have to work around.
 *
 * @param title Title of the alert.
 * @returns A dataset whose feed holds that alert alone.
 * @author Claude
 */
export const breakingDataset = ( title: string ): Dataset =>
{
    const dataset = sampleDataset();

    dataset.live = [
        {
            id: "fixture-live-breaking",
            publishedAt: hoursAgo( 1 ),
            title,
            body: "Toutes les cités sont priées de larguer leurs amarres.",
            severity: "breaking",
            tags: [],
            entrySlug: null,
            source: null,
            pinned: false
        }
    ];

    return dataset;
};

/**
 * Turns a dataset into the overlay a browser would have written itself.
 *
 * Entries and live items are keyed by identifier, categories by slug, exactly as
 * `WikiStore` stores them. The seed stays empty, as it is for every reader, so
 * the suite exercises the merge a browser actually performs.
 *
 * @param dataset Content to install.
 * @returns The value of the `pericles:overlay` key.
 * @author Claude
 */
export const toOverlay = ( dataset: Dataset ): Overlay => ( {
    version: 1,
    entries: Object.fromEntries( dataset.entries.map( ( entry ) => [ entry.id, entry ] ) ),
    categories: Object.fromEntries( dataset.categories.map( ( category ) => [ category.slug, category ] ) ),
    live: Object.fromEntries( dataset.live.map( ( item ) => [ item.id, item ] ) ),
    deleted: { entries: [], categories: [], live: [] },
    meta: dataset.meta,
    changedAt: hoursAgo( 2 )
} );
