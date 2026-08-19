/**
 * The demonstration wiki offered from the settings page.
 *
 * A fresh browser holds nothing, which is the honest first impression of a site
 * whose only storage is the reader's own, and a poor one for anyone wanting to see
 * what the encyclopedia does before writing twenty pages. This module is the
 * content that answers that: one complete universe, big enough for every listing,
 * the chronology, the dashboard and the feed to have something to show.
 *
 * It is **not** a seed. `WikiStore` still merges an always empty seed, and nothing
 * here is installed on load: the panel of `DemoContent.svelte` hands this dataset
 * to `importDataset`, the very path a restored backup takes, and only when a reader
 * asks for it. The module is imported dynamically from that panel, so a reader who
 * never asks never downloads it.
 *
 * The fiction is in English, and stays untranslated like any other page written
 * into the wiki: reader content never goes through the message catalogue. It obeys
 * the typography rules of the project, no dash of any kind, curly apostrophes, with
 * one deliberate departure: the quotation marks are the English pair, since the
 * prose around them is English.
 *
 * Real timestamps are relative to the moment the reader clicks, so the activity
 * chart covers its twelve months and the feed reads as today's rather than as a
 * date frozen when this file was written. In universe dates are fiction and stay
 * exactly as they are.
 *
 * @author Claude
 */

import type { Category, Dataset, Entry, LiveEntry } from "$lib/types";

/** Milliseconds in an hour, the unit every relative timestamp here is built from. */
const HOUR = 3_600_000;

/**
 * Builds an ISO timestamp a given number of hours in the past.
 *
 * @param hours How far back to go.
 * @returns The timestamp, as the dataset stores them.
 * @author Claude
 */
const hoursAgo = ( hours: number ): string => new Date( Date.now() - hours * HOUR ).toISOString();

/**
 * Builds an ISO timestamp a given number of days in the past.
 *
 * @param days How far back to go.
 * @returns The timestamp, as the dataset stores them.
 * @author Claude
 */
const daysAgo = ( days: number ): string => hoursAgo( days * 24 );

/**
 * Builds an ISO timestamp in the middle of a past month.
 *
 * The activity chart of the dashboard buckets pages by the month of their last
 * edition, so spreading the corpus over whole months is what fills its twelve
 * columns rather than piling everything into the current one. The fifteenth is
 * picked so no timestamp can fall in a neighbouring month once the local offset
 * is applied.
 *
 * Never call this with zero: on the first days of a month the fifteenth is still
 * ahead, and a page edited in the future reads as one. The current month is
 * covered by {@link daysAgo} instead.
 *
 * @param months How many months back to go, at least one.
 * @returns The timestamp, as the dataset stores them.
 * @author Claude
 */
const monthsAgo = ( months: number ): string =>
{
    const now = new Date();

    return new Date( now.getFullYear(), now.getMonth() - months, 15, 12 ).toISOString();
};

/**
 * Address of one demonstration illustration.
 *
 * The repository ships no image for this content: a path under `/media/` would
 * have to be a file committed for a demonstration alone, and a missing one renders
 * as a broken image on the very page meant to show the site at its best. These are
 * therefore remote placeholders, and the one thing in this dataset that needs a
 * network. They are asked for in grey so that whatever comes back reads as a plate
 * of an archive rather than as a holiday photograph.
 *
 * Kept in one helper so replacing the source, or dropping the images entirely, is a
 * single edit rather than six.
 *
 * @param seed Key picking a stable image, so a reload shows the same one.
 * @returns The url to store as an entry illustration.
 * @author Claude
 */
const illustration = ( seed: string ): string => `https://picsum.photos/seed/${ seed }/1600/900?grayscale`;

const CATEGORY_LIST: Category[] = [
    {
        slug: "people",
        name: "People",
        description: "Keepers, cartographers and harbour masters: the names the coast decided to keep.",
        color: "bleu",
        parent: null
    },
    {
        slug: "keepers",
        name: "Lantern keepers",
        description: "The families that held a light through a winter, and the rotas they wrote.",
        color: "ambre",
        parent: "people"
    },
    {
        slug: "places",
        name: "Places",
        description: "Harbours, reefs, and the roads that only exist at low water.",
        color: "vert",
        parent: null
    },
    {
        slug: "harbours",
        name: "Harbours",
        description: "The places on this coast where a ship is allowed in.",
        color: "cyan",
        parent: "places"
    },
    {
        slug: "events",
        name: "Events",
        description: "The nights the coast still counts its years from.",
        color: "rose",
        parent: null
    },
    {
        slug: "storm-years",
        name: "Storm years",
        description: "Weather that outlived the people who survived it.",
        color: "ambre",
        parent: "events"
    },
    {
        slug: "organisations",
        name: "Organisations",
        description: "Offices, guilds and companies, in descending order of self regard.",
        color: "violet",
        parent: null
    },
    {
        slug: "guilds",
        name: "Guilds and offices",
        description: "Bodies that hold a right and owe a duty, usually in that order.",
        color: "pierre",
        parent: "organisations"
    },
    {
        slug: "objects",
        name: "Objects",
        description: "Instruments, charters, and the things carried out of a wreck.",
        color: "cyan",
        parent: null
    },
    {
        slug: "concepts",
        name: "Concepts",
        description: "The handful of ideas the whole coast is still arguing about.",
        color: "rose",
        parent: null
    }
];

const ENTRY_LIST: Entry[] = [
    {
        id: "demo-mira-halloway",
        slug: "mira-halloway",
        title: "Mira Halloway",
        summary: "Chief keeper of the Cape Ainsley light for thirty three years, and the hand that wrote the watch"
          + " rota the coast still uses.",
        body: [
            "## Early years",
            "",
            "Mira Halloway was born on the landward side of [Cape Ainsley](/wiki/cape-ainsley), in a house whose",
            "windows were counted by the light rather than by the street. Her father,",
            "[Orin Halloway](/wiki/orin-halloway), kept the cape light for thirty one years, and she stood the",
            "middle watch from the age of eleven.",
            "",
            "## Chief keeper",
            "",
            "She was confirmed chief keeper in the spring of her thirty second year, the first woman the",
            "[Office of Lights](/wiki/office-of-lights) appointed without a husband on the paperwork. Her tenure",
            "is remembered for three decisions:",
            "",
            "- the middle watch was split in two, so that no keeper stood alone at the turn of the tide;",
            "- the [Ledger of Tides](/wiki/ledger-of-tides) was opened to any master who asked to read it;",
            "- the cape burned through [the Long Night](/wiki/the-long-night), on oil she had refused to sell that",
            "  summer.",
            "",
            "### Postscript",
            "",
            "The [Halloway family](/wiki/halloway-family) left the cape two generations later, but the rota she",
            "wrote is still the one pinned inside the lantern room door.",
            "",
            "> “A light is a promise made in advance. Nobody thanks you for keeping it, and everybody counts the",
            "> one night you do not.”"
        ].join( "\n" ),
        categories: [ "people", "keepers" ],
        infobox: [
            { label: "Office", value: "Chief keeper, Cape Ainsley" },
            { label: "Years in service", value: "Thirty three" },
            { label: "Appointed by", value: "Office of Lights" },
            { label: "Born at", value: "Cape Ainsley" }
        ],
        image: {
            src: illustration( "lantern-coast-mira" ),
            alt: "A lantern room seen from the gallery, at first light.",
            caption: "The lantern room at Cape Ainsley, from the gallery she swept every morning."
        },
        dates: [
            { id: "demo-date-mira-birth", label: "Birth", value: "1826-04-09" },
            { id: "demo-date-mira-appointed", label: "Takes the cape light", value: "1858-03" },
            { id: "demo-date-mira-death", label: "Death", value: "1891-02-17" }
        ],
        status: "publie",
        aliases: [ "The Keeper of Ainsley", "M. Halloway" ],
        createdAt: monthsAgo( 14 ),
        updatedAt: daysAgo( 1 )
    },
    {
        id: "demo-cape-ainsley",
        slug: "cape-ainsley",
        title: "Cape Ainsley",
        summary: "The long grey arm that closes the north of the coast, and the only harbour on it a ship can enter"
          + " against the wind.",
        body: [
            "## The cape",
            "",
            "Cape Ainsley is the headland that closes the northern end of the coast. The light stands at the",
            "seaward tip, on rock the surveyors of the [Guild of Cartographers](/wiki/guild-of-cartographers)",
            "described as “sound, and unwilling”.",
            "",
            "## The harbour",
            "",
            "Three basins, a stone mole rebuilt twice, and a customs house that has never once opened on time.",
            "Traffic is regulated by the [Office of Lights](/wiki/office-of-lights) rather than by the town, an",
            "arrangement nobody defends and nobody has managed to undo.",
            "",
            "### The light",
            "",
            "The tower carries [the Glass Lantern](/wiki/the-glass-lantern), cast for it and broken in it. Under",
            "[Mira Halloway](/wiki/mira-halloway) the cape kept the longest unbroken watch on record, and it has",
            "shown a light every night since, including the ones it should not have survived.",
            "",
            "## Approaches",
            "",
            "At low water the [Shoal Road](/wiki/the-shoal-road) opens south towards",
            "[Saltmarch](/wiki/saltmarch), and the harbour empties of anyone who owns a cart. At high water there",
            "is one safe entry, and the pilots charge accordingly."
        ].join( "\n" ),
        categories: [ "places", "harbours" ],
        infobox: [
            { label: "Type", value: "Harbour and light" },
            { label: "Basins", value: "3" },
            { label: "Population", value: "4 100" },
            { label: "Regulated by", value: "Office of Lights" }
        ],
        image: {
            src: illustration( "lantern-coast-ainsley" ),
            alt: "A stone mole reaching into grey water under low cloud.",
            caption: "The outer mole, rebuilt for the second time after the Long Night."
        },
        dates: [
            { id: "demo-date-ainsley-lit", label: "First light lit", value: "1804" },
            { id: "demo-date-ainsley-charter", label: "Harbour chartered", value: "1831-06" }
        ],
        status: "publie",
        aliases: [ "The Cape", "Ainsley Head" ],
        createdAt: monthsAgo( 14 ),
        updatedAt: daysAgo( 2 )
    },
    {
        id: "demo-the-long-night",
        slug: "the-long-night",
        title: "The Long Night",
        summary: "Twenty two hours of wind that emptied every harbour on the coast, and the reason two of them now"
          + " keep oil they may not sell.",
        body: [
            "## The storm",
            "",
            "The Long Night is the name the coast gives to the twenty two hours of wind that emptied every",
            "harbour between [Cape Ainsley](/wiki/cape-ainsley) and [Saltmarch](/wiki/saltmarch). It arrived",
            "without a fall in the glass, which is why the [Office of Lights](/wiki/office-of-lights) still",
            "refuses to publish a forecast worded as a certainty.",
            "",
            "## What was lost",
            "",
            "- eleven vessels, nine of them at anchor;",
            "- the seaward half of the [Drowned Orchard](/wiki/the-drowned-orchard);",
            "- [the Glass Lantern](/wiki/the-glass-lantern), which came apart in the fourth hour.",
            "",
            "[Mira Halloway](/wiki/mira-halloway) kept the cape light burning by hand until morning, on an open",
            "flame set in the ruin of the lens. The [winter inquiry](/wiki/winter-inquiry) that followed took her",
            "account without asking a single question about the glass.",
            "",
            "## Afterwards",
            "",
            "The night is the reason the [Quiet Accord](/wiki/the-quiet-accord) exists, the reason the coast",
            "rewrote its rotas, and the reason [the Slow Light](/wiki/the-slow-light) is now built where a first",
            "order lens would once have gone."
        ].join( "\n" ),
        categories: [ "events", "storm-years" ],
        infobox: [
            { label: "Duration", value: "Twenty two hours" },
            { label: "Vessels lost", value: "11" },
            { label: "Harbours affected", value: "Cape Ainsley, Saltmarch" }
        ],
        image: {
            src: illustration( "lantern-coast-storm" ),
            alt: "Heavy water breaking over a harbour wall.",
            caption: "The bar at Saltmarch, drawn from the customs house window the following morning."
        },
        dates: [
            { id: "demo-date-night-storm", label: "The storm", value: "1861-11-14" },
            { id: "demo-date-night-cleared", label: "Last wreck cleared", value: "The following spring" }
        ],
        status: "publie",
        aliases: [ "The Fourth Hour" ],
        createdAt: monthsAgo( 13 ),
        updatedAt: daysAgo( 4 )
    },
    {
        id: "demo-office-of-lights",
        slug: "office-of-lights",
        title: "Office of Lights",
        summary: "Keeps every light on the coast, licenses the pilots, and holds the Ledger of Tides.",
        body: [
            "## Mandate",
            "",
            "The Office of Lights keeps every light on the coast, licenses the pilots, and holds the",
            "[Ledger of Tides](/wiki/ledger-of-tides). It answers to the harbours it regulates, which is either a",
            "check or a joke depending on who is telling it.",
            "",
            "## Structure",
            "",
            "- a chief keeper for each light, appointed for life or until a wreck;",
            "- an inspector of oil, a post created after the [lamp oil concession](/wiki/lamp-oil-concession);",
            "- a clerk of passage, who decides in the first instance every question of",
            "  [right of passage](/wiki/right-of-passage).",
            "",
            "### Reform",
            "",
            "The office was rebuilt from the inside after [the Long Night](/wiki/the-long-night).",
            "[Mira Halloway](/wiki/mira-halloway) wrote most of the new rota, and [Tessa Varo](/wiki/tessa-varo)",
            "wrote the part nobody at [Cape Ainsley](/wiki/cape-ainsley) liked. Both parts are still in force."
        ].join( "\n" ),
        categories: [ "organisations", "guilds" ],
        infobox: [
            { label: "Type", value: "Public office" },
            { label: "Lights kept", value: "9" },
            { label: "Seat", value: "Cape Ainsley" }
        ],
        image: null,
        dates: [
            { id: "demo-date-office-founded", label: "Founded", value: "1812" },
            { id: "demo-date-office-reformed", label: "Reformed", value: "1863-05" }
        ],
        status: "publie",
        aliases: [ "The Office" ],
        createdAt: monthsAgo( 13 ),
        updatedAt: daysAgo( 6 )
    },
    {
        id: "demo-kestrel-line",
        slug: "kestrel-line",
        title: "The Kestrel Line",
        summary: "Four vessels, a schedule kept about half the time, and the only private carrier ever licensed to"
          + " pilot its own ships.",
        body: [
            "## The company",
            "",
            "The Kestrel Line ran four vessels between the two harbours on a schedule it kept about half the",
            "time, and is the only private carrier the [Office of Lights](/wiki/office-of-lights) has ever",
            "licensed to pilot its own ships.",
            "",
            "## The concession",
            "",
            "The line held the [lamp oil concession](/wiki/lamp-oil-concession) for eleven years, which is how the",
            "cheapest oil on the coast came to arrive in the holds of its most expensive freight.",
            "",
            "### End",
            "",
            "It sold its berths at [Saltmarch](/wiki/saltmarch) and its charts to the",
            "[Guild of Cartographers](/wiki/guild-of-cartographers), in that order, and was wound up in a single",
            "afternoon."
        ].join( "\n" ),
        categories: [ "organisations" ],
        infobox: [
            { label: "Vessels", value: "4" },
            { label: "Concession held", value: "Eleven years" }
        ],
        image: null,
        dates: [
            { id: "demo-date-kestrel-founded", label: "Founded", value: "1848" },
            { id: "demo-date-kestrel-wound-up", label: "Wound up", value: "1872-04" }
        ],
        status: "publie",
        aliases: [ "Kestrel and Sons" ],
        createdAt: monthsAgo( 8 ),
        updatedAt: daysAgo( 11 )
    },
    {
        id: "demo-ledger-of-tides",
        slug: "ledger-of-tides",
        title: "The Ledger of Tides",
        summary: "One bound volume in which every keeper on the coast enters the water actually seen, and nothing"
          + " that was merely predicted.",
        body: [
            "## The book",
            "",
            "The Ledger of Tides is a single bound volume, kept at the [Office of Lights](/wiki/office-of-lights),",
            "in which every keeper on the coast enters the water they actually saw. It is not a prediction and has",
            "never pretended to be one.",
            "",
            "## How it is kept",
            "",
            "One line per watch: the hour, the height, the wind, and a column headed “remarks” that has held",
            "everything from a lost dog to a war. [Elias Fenn](/wiki/elias-fenn) drew his charts from the ledger",
            "rather than from the published tables, and said so in print, which cost him a friendship.",
            "",
            "### The Halloway hand",
            "",
            "Thirty three years of the ledger are in [Mira Halloway](/wiki/mira-halloway)’s writing. The last of",
            "her entries stops in the middle of a line, and the keeper who took over began a new one rather than",
            "finish it."
        ].join( "\n" ),
        categories: [ "objects" ],
        infobox: [
            { label: "Form", value: "Bound volume, one line per watch" },
            { label: "Kept at", value: "Office of Lights" },
            { label: "Open to readers", value: "Thursdays" }
        ],
        image: null,
        dates: [
            { id: "demo-date-ledger-first", label: "First entry", value: "1812-01-03" },
            { id: "demo-date-ledger-last", label: "Last entry in the Halloway hand", value: "1891-01" }
        ],
        status: "publie",
        aliases: [ "The Ledger" ],
        createdAt: monthsAgo( 12 ),
        updatedAt: monthsAgo( 1 )
    },
    {
        id: "demo-right-of-passage",
        slug: "right-of-passage",
        title: "Right of Passage",
        summary: "The rule that no harbour may refuse shelter to a vessel that asks for it, written down once,"
          + " badly, and argued about ever since.",
        body: [
            "## The principle",
            "",
            "Right of passage is the rule that no harbour on the coast may refuse shelter to a vessel that asks",
            "for it, whatever it carries and whoever owns it. It was written down once, badly, and has been",
            "argued about ever since.",
            "",
            "## In practice",
            "",
            "The [Office of Lights](/wiki/office-of-lights) decides the first instance, the harbours decide the",
            "second, and the weather decides the rest. [Saltmarch](/wiki/saltmarch) reads the rule as a duty of",
            "shelter only. [Cape Ainsley](/wiki/cape-ainsley) reads it as a duty of pilotage too, and charges for",
            "the difference.",
            "",
            "### The road question",
            "",
            "Nobody has settled whether the rule reaches the [Shoal Road](/wiki/the-shoal-road), which is a",
            "harbour for six hours and a road for the other six. Both harbours behave as though it does."
        ].join( "\n" ),
        categories: [ "concepts" ],
        infobox: [
            { label: "First written", value: "1834" },
            { label: "Decided by", value: "Clerk of passage, then the harbours" }
        ],
        image: null,
        dates: [
            { id: "demo-date-passage-written", label: "First written down", value: "1834" }
        ],
        status: "publie",
        aliases: [ "The shelter rule" ],
        createdAt: monthsAgo( 12 ),
        updatedAt: monthsAgo( 2 )
    },
    {
        id: "demo-the-drowned-orchard",
        slug: "the-drowned-orchard",
        title: "The Drowned Orchard",
        summary: "A walled apple ground on the seaward side of Saltmarch, famous for fruit nobody outside the"
          + " harbour would eat.",
        body: [
            "## Before",
            "",
            "The Drowned Orchard was the strip of walled apple ground on the seaward side of",
            "[Saltmarch](/wiki/saltmarch), planted on spoil from the first cutting of the bar and famous for fruit",
            "nobody outside the harbour would eat.",
            "",
            "## The night",
            "",
            "Salt water took the seaward half during [the Long Night](/wiki/the-long-night), and the rest over the",
            "two summers that followed. The wall is still standing, and still holds at every tide but the highest.",
            "",
            "### Now",
            "",
            "Nine trees survive in the landward corner. The harbour crops them, badly, and has refused every offer",
            "to replant."
        ].join( "\n" ),
        categories: [ "places" ],
        infobox: [
            { label: "Planted on", value: "Spoil from the bar" },
            { label: "Trees surviving", value: "9" }
        ],
        image: {
            src: illustration( "lantern-coast-orchard" ),
            alt: "Bare trees behind a broken stone wall near the sea.",
            caption: "The landward corner, and what is left of the wall."
        },
        dates: [
            { id: "demo-date-orchard-lost", label: "Lost to the sea", value: "1861-11-14" }
        ],
        status: "publie",
        aliases: [ "The Orchard" ],
        createdAt: monthsAgo( 11 ),
        updatedAt: monthsAgo( 2 )
    },
    {
        id: "demo-elias-fenn",
        slug: "elias-fenn",
        title: "Elias Fenn",
        summary: "Surveyed the coast twice, once for the guild and once, later and better, for himself.",
        body: [
            "## The cartographer",
            "",
            "Elias Fenn surveyed the coast twice, once for the",
            "[Guild of Cartographers](/wiki/guild-of-cartographers) and once, later and better, for himself. The",
            "second chart is the one still on the wall of every pilot house between the two harbours.",
            "",
            "## Method",
            "",
            "He refused every figure he had not measured, and took his water from the",
            "[Ledger of Tides](/wiki/ledger-of-tides) rather than the published tables. The",
            "[Shoal Road](/wiki/the-shoal-road) is his: he walked it eleven times, at eleven different heights of",
            "water, and drew the line where his feet stayed dry.",
            "",
            "### Quarrel",
            "",
            "The guild censured him for publishing under his own name. He paid the fine, kept the plate, and sold",
            "prints from his kitchen for the rest of his life. The guild now sells the same survey."
        ].join( "\n" ),
        categories: [ "people" ],
        infobox: [
            { label: "Trade", value: "Cartographer" },
            { label: "Surveys", value: "2" },
            { label: "Guild standing", value: "Censured, never expelled" }
        ],
        image: null,
        dates: [
            { id: "demo-date-fenn-birth", label: "Birth", value: "1819-08-22" },
            { id: "demo-date-fenn-death", label: "Death", value: "1877-12-01" }
        ],
        status: "publie",
        aliases: [ "Fenn the walker" ],
        createdAt: monthsAgo( 11 ),
        updatedAt: monthsAgo( 3 )
    },
    {
        id: "demo-guild-of-cartographers",
        slug: "guild-of-cartographers",
        title: "Guild of Cartographers",
        summary: "Holds the right to survey the coast and the duty to publish what it finds, in that order.",
        body: [
            "## The charter",
            "",
            "The Guild of Cartographers holds the right to survey the coast and the duty to publish what it finds,",
            "in that order, which is the whole of its history in one sentence.",
            "",
            "## Work",
            "",
            "- the general chart, revised on no fixed schedule;",
            "- the reef surveys, of which the [north reef survey](/wiki/north-reef-survey) is the longest and the",
            "  least conclusive;",
            "- the plates, lent to any harbour that asks and returned by roughly half of them.",
            "",
            "### The Fenn affair",
            "",
            "The guild censured [Elias Fenn](/wiki/elias-fenn) for the survey it now sells, and takes its water",
            "from the [Ledger of Tides](/wiki/ledger-of-tides) exactly as he did."
        ].join( "\n" ),
        categories: [ "organisations", "guilds" ],
        infobox: [
            { label: "Type", value: "Chartered guild" },
            { label: "Members", value: "31" },
            { label: "Seat", value: "Saltmarch" }
        ],
        image: null,
        dates: [
            { id: "demo-date-guild-charter", label: "Charter", value: "1798" }
        ],
        status: "publie",
        aliases: [ "The Guild" ],
        createdAt: monthsAgo( 10 ),
        updatedAt: monthsAgo( 4 )
    },
    {
        id: "demo-the-shoal-road",
        slug: "the-shoal-road",
        title: "The Shoal Road",
        summary: "A bank of hard sand joining the two harbours at low water, and drowned to the height of a mast at"
          + " high.",
        body: [
            "## A road for six hours",
            "",
            "The Shoal Road is the bank of hard sand that joins [Cape Ainsley](/wiki/cape-ainsley) to",
            "[Saltmarch](/wiki/saltmarch) at low water, and drowns to the height of a mast at high. It carries",
            "carts, cattle and, twice a year, an argument about whether it is a road at all.",
            "",
            "## Markers",
            "",
            "Twenty seven poles, replaced by whichever harbour notices first. The line they follow is",
            "[Elias Fenn](/wiki/elias-fenn)’s, walked and not calculated, which is why it bends where no chart",
            "says it should.",
            "",
            "### Status",
            "",
            "Whether [right of passage](/wiki/right-of-passage) applies to the road is the oldest open question on",
            "the coast. Both harbours behave as though it does, and neither will say so where a clerk can hear it."
        ].join( "\n" ),
        categories: [ "places" ],
        infobox: [
            { label: "Length", value: "Nine miles" },
            { label: "Open", value: "Six hours in twelve" },
            { label: "Markers", value: "27 poles" }
        ],
        image: null,
        dates: [
            { id: "demo-date-road-survey", label: "First survey", value: "1841-09" },
            { id: "demo-date-road-charted", label: "Marked on the general chart", value: "1843" }
        ],
        status: "publie",
        aliases: [ "The Road", "Fenn’s line" ],
        createdAt: monthsAgo( 10 ),
        updatedAt: monthsAgo( 5 )
    },
    {
        id: "demo-north-reef-survey",
        slug: "north-reef-survey",
        title: "The North Reef Survey",
        summary: "Seven seasons of soundings that answer a question differently depending on which line you"
          + " believe.",
        body: [
            "## The survey",
            "",
            "The north reef survey is the longest running measurement on the coast, begun by the",
            "[Guild of Cartographers](/wiki/guild-of-cartographers) to settle whether the reef is growing, and",
            "abandoned twice before it could.",
            "",
            "## Findings",
            "",
            "Seven seasons of soundings, taken from three vessels with two different lines, produce a result that",
            "depends on which of the two you believe. [Elias Fenn](/wiki/elias-fenn) refused to sign the report",
            "for that reason, and the guild published it anyway with a note.",
            "",
            "### Why it matters",
            "",
            "Both harbours plan their approaches on the assumption that the reef is exactly where the last survey",
            "said it was."
        ].join( "\n" ),
        categories: [],
        infobox: [
            { label: "Seasons", value: "7" },
            { label: "Vessels", value: "3" },
            { label: "Report signed by", value: "Every surveyor but one" }
        ],
        image: null,
        dates: [
            { id: "demo-date-reef-begun", label: "Begun", value: "1869-06" },
            { id: "demo-date-reef-report", label: "Report filed", value: "1870-01-12" }
        ],
        status: "publie",
        aliases: [],
        createdAt: monthsAgo( 9 ),
        updatedAt: monthsAgo( 5 )
    },
    {
        id: "demo-saltmarch",
        slug: "saltmarch",
        title: "Saltmarch",
        summary: "Older than the cape, poorer, and considerably better at unloading a ship in bad weather.",
        body: [
            "## The harbour",
            "",
            "Saltmarch lies at the southern end of the [Shoal Road](/wiki/the-shoal-road), behind a bar that has",
            "moved three times in living memory. It is older than [Cape Ainsley](/wiki/cape-ainsley), poorer, and",
            "considerably better at unloading a ship in bad weather.",
            "",
            "## Government",
            "",
            "The harbour master governs, and has done since the town declined to elect a council for the second",
            "time. [Tessa Varo](/wiki/tessa-varo) held the post for twenty six years, which is longer than the",
            "council lasted.",
            "",
            "### The Long Night",
            "",
            "Saltmarch lost its bar, its outer quay and the seaward half of the",
            "[Drowned Orchard](/wiki/the-drowned-orchard) in [the Long Night](/wiki/the-long-night), and rebuilt",
            "all three within two years, in the wrong places according to the guild."
        ].join( "\n" ),
        categories: [ "places", "harbours" ],
        infobox: [
            { label: "Type", value: "Harbour" },
            { label: "Population", value: "6 800" },
            { label: "Governed by", value: "Harbour master" },
            { label: "Bar depth at low water", value: "Two fathoms" }
        ],
        image: {
            src: illustration( "lantern-coast-saltmarch" ),
            alt: "Fishing boats aground on a tidal bar at low water.",
            caption: "The bar at low water, where the road begins."
        },
        dates: [
            { id: "demo-date-saltmarch-founded", label: "Founded", value: "1776" },
            { id: "demo-date-saltmarch-rebuilt", label: "Rebuilt after the Long Night", value: "1862" }
        ],
        status: "publie",
        aliases: [ "The Marsh" ],
        createdAt: monthsAgo( 9 ),
        updatedAt: monthsAgo( 6 )
    },
    {
        id: "demo-tessa-varo",
        slug: "tessa-varo",
        title: "Tessa Varo",
        summary: "Harbour master of Saltmarch for twenty six years, and the author of the first draft of the Quiet"
          + " Accord.",
        body: [
            "## Harbour master",
            "",
            "Tessa Varo came to [Saltmarch](/wiki/saltmarch) as a clerk of the bar and left it, twenty six years",
            "later, as the only harbour master the coast has ever addressed by her first name in writing.",
            "",
            "## The Accord",
            "",
            "She wrote the first draft of the [Quiet Accord](/wiki/the-quiet-accord) on the back of a manifest,",
            "sailed it to [Cape Ainsley](/wiki/cape-ainsley) herself, and waited three days in the customs house",
            "for an answer. The answer, when it came, was four words long.",
            "",
            "### Reputation",
            "",
            "The [Office of Lights](/wiki/office-of-lights) found her obstructive, the",
            "[winter inquiry](/wiki/winter-inquiry) found her indispensable, and her own harbour found her",
            "expensive. All three were right."
        ].join( "\n" ),
        categories: [ "people" ],
        infobox: [
            { label: "Office", value: "Harbour master, Saltmarch" },
            { label: "Years in service", value: "Twenty six" },
            { label: "Known for", value: "The Quiet Accord" }
        ],
        image: null,
        dates: [
            { id: "demo-date-varo-birth", label: "Birth", value: "1830-01-30" },
            { id: "demo-date-varo-appointed", label: "Made harbour master", value: "1859-07" }
        ],
        status: "publie",
        aliases: [ "Varo of the bar" ],
        createdAt: monthsAgo( 8 ),
        updatedAt: monthsAgo( 7 )
    },
    {
        id: "demo-the-quiet-accord",
        slug: "the-quiet-accord",
        title: "The Quiet Accord",
        summary: "Two harbours keeping oil, rope and a berth for each other, and charging nothing for a night"
          + " either would rather forget.",
        body: [
            "## The agreement",
            "",
            "The Quiet Accord is the standing arrangement between [Cape Ainsley](/wiki/cape-ainsley) and",
            "[Saltmarch](/wiki/saltmarch): each keeps oil, rope and a berth for the other, and neither charges for",
            "a night either of them would rather forget.",
            "",
            "## Terms",
            "",
            "- shelter first, paperwork afterwards, without exception;",
            "- a reserve of oil neither harbour may sell in the season it was bought;",
            "- a joint watch on the [Shoal Road](/wiki/the-shoal-road) between the equinoxes.",
            "",
            "### Why it holds",
            "",
            "It was written by two people who had both stood a watch: [Tessa Varo](/wiki/tessa-varo) and",
            "[Mira Halloway](/wiki/mira-halloway). Neither signed on behalf of a council, which is precisely why",
            "no council has been able to revoke it."
        ].join( "\n" ),
        categories: [ "events", "concepts" ],
        infobox: [
            { label: "Parties", value: "Cape Ainsley, Saltmarch" },
            { label: "Articles", value: "7" },
            { label: "Signed at", value: "The customs house, Cape Ainsley" }
        ],
        image: null,
        dates: [
            { id: "demo-date-accord-signed", label: "Signed", value: "1863-02-11" },
            { id: "demo-date-accord-force", label: "Comes into force", value: "The first slack water of March" }
        ],
        status: "publie",
        aliases: [ "The Accord" ],
        createdAt: monthsAgo( 7 ),
        updatedAt: monthsAgo( 8 )
    },
    {
        id: "demo-the-glass-lantern",
        slug: "the-glass-lantern",
        title: "The Glass Lantern",
        summary: "A first order lens of nine hundred prisms, cast for the cape and broken in it during the fourth"
          + " hour of the Long Night.",
        body: [
            "## The lens",
            "",
            "The Glass Lantern is the first order lens cast for [Cape Ainsley](/wiki/cape-ainsley), a drum of nine",
            "hundred prisms turning once every two minutes on a bath of mercury. It made the cape visible from",
            "further out than any light on the coast.",
            "",
            "## Failure",
            "",
            "It came apart in the fourth hour of [the Long Night](/wiki/the-long-night), under a wind the",
            "[Office of Lights](/wiki/office-of-lights) had not thought worth designing for.",
            "[Mira Halloway](/wiki/mira-halloway) cleared the lantern room by hand, cutting both of hers, and",
            "burned an open flame until morning.",
            "",
            "### The second lantern",
            "",
            "The recast lens turns more slowly on purpose, and carries a third fewer prisms. That is where",
            "[the Slow Light](/wiki/the-slow-light) takes both its name and its argument."
        ].join( "\n" ),
        categories: [ "objects" ],
        infobox: [
            { label: "Order", value: "First" },
            { label: "Prisms", value: "900" },
            { label: "Rotation", value: "One turn in two minutes" },
            { label: "Installed at", value: "Cape Ainsley" }
        ],
        image: {
            src: illustration( "lantern-coast-lens" ),
            alt: "Concentric rings of cut glass in a lighthouse lens.",
            caption: "The recast lens, photographed before it was hoisted."
        },
        dates: [
            { id: "demo-date-lantern-cast", label: "Cast", value: "1857-10" },
            { id: "demo-date-lantern-broken", label: "Broken", value: "1861-11-14" },
            { id: "demo-date-lantern-recast", label: "Recast", value: "1862-08" }
        ],
        status: "publie",
        aliases: [ "The first order" ],
        createdAt: monthsAgo( 6 ),
        updatedAt: monthsAgo( 9 )
    },
    {
        id: "demo-the-slow-light",
        slug: "the-slow-light",
        title: "The Slow Light",
        summary: "The doctrine that a light should be built to be repaired rather than to be admired.",
        body: [
            "## The idea",
            "",
            "The Slow Light is the doctrine that a light should be built to be repaired rather than to be admired.",
            "It came out of the recasting of [the Glass Lantern](/wiki/the-glass-lantern), and out of a keeper’s",
            "refusal to accept that the coast had merely been unlucky.",
            "",
            "## Consequences",
            "",
            "Every light the [Office of Lights](/wiki/office-of-lights) has built since turns more slowly, carries",
            "fewer prisms, and can be brought back by two people in the dark. It is measurably less impressive and",
            "has not failed once.",
            "",
            "### Objections",
            "",
            "The [Guild of Cartographers](/wiki/guild-of-cartographers) notes that a slower light is harder to",
            "identify at distance, and it is right. [Mira Halloway](/wiki/mira-halloway)’s answer, that an",
            "unidentified light is still a light, has never been improved on."
        ].join( "\n" ),
        categories: [ "concepts" ],
        infobox: [
            { label: "Named", value: "1866" },
            { label: "Applied to", value: "Every light built since" }
        ],
        image: null,
        dates: [
            { id: "demo-date-slow-named", label: "Named", value: "1866" }
        ],
        status: "publie",
        aliases: [],
        createdAt: monthsAgo( 6 ),
        updatedAt: monthsAgo( 10 )
    },
    {
        id: "demo-orin-halloway",
        slug: "orin-halloway",
        title: "Orin Halloway",
        summary: "Kept the Cape Ainsley light for thirty one years without a relief beyond his own family.",
        body: [
            "## Keeper of the cape",
            "",
            "Orin Halloway kept the [Cape Ainsley](/wiki/cape-ainsley) light for thirty one years without a single",
            "relief beyond his own family. He taught the middle watch to his daughter,",
            "[Mira Halloway](/wiki/mira-halloway), and to nobody else.",
            "",
            "## Character",
            "",
            "The [Office of Lights](/wiki/office-of-lights) records four commendations and eleven complaints, most",
            "of the latter concerning his refusal to admit visitors to the lantern room while",
            "[the Glass Lantern](/wiki/the-glass-lantern) was turning.",
            "",
            "### Death",
            "",
            "He died in February, in the chair on the landing, three hours into a watch his daughter finished",
            "without waking the house. The [Halloway family](/wiki/halloway-family) held the cape for another two",
            "generations."
        ].join( "\n" ),
        categories: [ "people", "keepers" ],
        infobox: [
            { label: "Office", value: "Keeper, Cape Ainsley" },
            { label: "Years in service", value: "Thirty one" },
            { label: "Commendations", value: "4" }
        ],
        image: null,
        dates: [
            { id: "demo-date-orin-birth", label: "Birth", value: "1794" },
            { id: "demo-date-orin-death", label: "Death", value: "1858-02-28" }
        ],
        status: "publie",
        aliases: [],
        createdAt: monthsAgo( 12 ),
        updatedAt: monthsAgo( 11 )
    },
    {
        id: "demo-bell-of-corran",
        slug: "bell-of-corran",
        title: "The Bell of Corran",
        summary: "A ship’s bell recovered from the bar, cast for a vessel no register has ever carried.",
        body: [
            "## The bell",
            "",
            "The Bell of Corran is a ship’s bell recovered from the bar at Saltmarch, cast for a vessel no",
            "register on the coast has ever carried, and dated eleven years before the foundry that made it",
            "opened.",
            "",
            "## The inscription",
            "",
            "Four words and a number, in a hand that reads like a legal clerk rather than a founder. Every reading",
            "proposed so far requires assuming that one of the letters is a mistake, and no two readings agree on",
            "which.",
            "",
            "### Status",
            "",
            "The bell sits in the customs house, in a case, above a card that says considerably less than this",
            "page does."
        ].join( "\n" ),
        categories: [ "objects" ],
        infobox: [
            { label: "Material", value: "Bell metal" },
            { label: "Recovered from", value: "The bar at Saltmarch" },
            { label: "Readings proposed", value: "5" }
        ],
        image: null,
        dates: [
            { id: "demo-date-bell-recovered", label: "Recovered", value: "1864-04-19" }
        ],
        status: "brouillon",
        aliases: [],
        createdAt: monthsAgo( 4 ),
        updatedAt: daysAgo( 8 )
    },
    {
        id: "demo-winter-watch",
        slug: "winter-watch",
        title: "The Winter Watch",
        summary: "",
        body: [
            "## Draft",
            "",
            "The winter watch is the doubled rota kept between the equinoxes. Notes to come: who pays for the",
            "second keeper, and what happens on the road."
        ].join( "\n" ),
        categories: [],
        infobox: [],
        image: null,
        dates: [],
        status: "brouillon",
        aliases: [],
        createdAt: hoursAgo( 5 ),
        updatedAt: hoursAgo( 5 )
    }
];

const LIVE_LIST: LiveEntry[] = [
    {
        id: "demo-live-lens",
        publishedAt: hoursAgo( 26 ),
        title: "Cape Ainsley shows a fixed light until the lens is re seated",
        body: "The drum is turning half a second late on every revolution, so the keepers have stopped it rather"
          + " than let masters read the wrong character.",
        severity: "important",
        tags: [ "lights", "ainsley" ],
        entrySlug: "cape-ainsley",
        source: "Office of Lights",
        pinned: true
    },
    {
        id: "demo-live-road-closed",
        publishedAt: daysAgo( 9 ),
        title: "The Shoal Road is closed to carts between the equinoxes",
        body: "The joint watch begins on the first slack water of the month. Foot traffic at its own risk, as ever.",
        severity: "info",
        tags: [ "road", "accord" ],
        entrySlug: "the-shoal-road",
        source: null,
        pinned: true
    },
    {
        id: "demo-live-quay",
        publishedAt: hoursAgo( 3 ),
        title: "Saltmarch closes the outer quay for the afternoon tide",
        body: "Swell over the bar, and two berths already short. Freight is being turned towards the inner basin.",
        severity: "urgent",
        tags: [ "saltmarch", "weather" ],
        entrySlug: "saltmarch",
        source: "Harbour Office of Saltmarch",
        pinned: false
    },
    {
        id: "demo-live-ledger",
        publishedAt: hoursAgo( 7 ),
        title: "The Ledger of Tides is open to readers again on Thursdays",
        body: "Two years of rebinding, and the remarks column survived every page of it.",
        severity: "info",
        tags: [ "office", "ledger" ],
        entrySlug: "ledger-of-tides",
        source: "Office of Lights",
        pinned: false
    },
    {
        id: "demo-live-storm-lifted",
        publishedAt: hoursAgo( 30 ),
        title: "Storm warning lifted between the cape and the bar",
        body: "The glass has been steady for six hours. Both harbours are open, and the road opens with the tide.",
        severity: "breaking",
        tags: [ "weather" ],
        entrySlug: null,
        source: "Office of Lights",
        pinned: false
    },
    {
        id: "demo-live-poles",
        publishedAt: hoursAgo( 28 ),
        title: "Twenty seven poles counted on the road, twenty five standing",
        body: "The two missing ones are the pair that always go, at the bend the chart still refuses to draw.",
        severity: "info",
        tags: [ "road", "charts" ],
        entrySlug: "the-shoal-road",
        source: "Guild of Cartographers",
        pinned: false
    },
    {
        id: "demo-live-fees",
        publishedAt: hoursAgo( 34 ),
        title: "Pilotage fees at Cape Ainsley hold for another season",
        body: "The clerk of passage read the decision out in under a minute, which is the shortest it has ever"
          + " taken.",
        severity: "important",
        tags: [ "ainsley", "office" ],
        entrySlug: "cape-ainsley",
        source: "Office of Lights",
        pinned: false
    },
    {
        id: "demo-live-reef",
        publishedAt: daysAgo( 3 ),
        title: "The north reef survey resumes for a seventh season",
        body: "Same reef, third vessel, and a line the guild promises is the same one as last time.",
        severity: "info",
        tags: [ "charts" ],
        entrySlug: "north-reef-survey",
        source: "Guild of Cartographers",
        pinned: false
    },
    {
        id: "demo-live-oil",
        publishedAt: daysAgo( 5 ),
        title: "Oil reserve at Saltmarch drops below the Accord figure",
        body: "Eleven barrels short of the season’s minimum, with the cape asked to cover the difference until"
          + " autumn.",
        severity: "urgent",
        tags: [ "accord", "saltmarch" ],
        entrySlug: "the-quiet-accord",
        source: "Harbour Office of Saltmarch",
        pinned: false
    },
    {
        id: "demo-live-bell",
        publishedAt: daysAgo( 7 ),
        title: "The Bell of Corran goes back into its case unread",
        body: "A fifth reading of the inscription, a fifth letter declared a mistake, and a fifth card that says"
          + " nothing.",
        severity: "info",
        tags: [ "objects" ],
        entrySlug: "bell-of-corran",
        source: null,
        pinned: false
    },
    {
        id: "demo-live-keeper",
        publishedAt: daysAgo( 14 ),
        title: "A second keeper joins the winter watch at the cape",
        body: "The rota is the one Halloway wrote, unchanged except for the name at the top of the second column.",
        severity: "info",
        tags: [ "lights", "ainsley" ],
        entrySlug: "mira-halloway",
        source: "Office of Lights",
        pinned: false
    }
];

/**
 * Builds the demonstration wiki, with its timestamps taken from this moment.
 *
 * Rebuilt on every call rather than shared, both because the timestamps are
 * relative and because `importDataset` stores what it is handed: a shared object
 * would end up aliased by the overlay.
 *
 * @returns A complete dataset, ready for `normalizeDataset`.
 * @author Claude
 */
export const demoDataset = (): Dataset => ( {
    meta: {
        universe: "The Lantern Coast",
        description: "The keepers, harbours and quiet agreements that hold a coast where the water is never twice"
          + " the same.",
        logo: "",
        accent: "ambre",
        featured: [ "mira-halloway", "cape-ainsley", "the-long-night" ]
    },
    categories: structuredClone( CATEGORY_LIST ),
    entries: structuredClone( ENTRY_LIST ),
    live: structuredClone( LIVE_LIST )
} );
