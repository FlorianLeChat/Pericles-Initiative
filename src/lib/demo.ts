/**
 * The demonstration wiki offered from the backups page, `/data`.
 *
 * A fresh browser holds nothing, which is the honest first impression of a site
 * whose only storage is the reader's own, and a poor one for anyone wanting to see
 * what the encyclopedia does before writing twenty pages. This module is the
 * content that answers that: one complete universe, big enough for every listing,
 * the chronology, the dashboard and the feed to have something to show.
 *
 * The universe is the High Cairns, a mountain range crossed by a cable line,
 * watched over by an order of astronomers, and divided by a pass that closes every
 * winter. Its corpus is dimensioned for the dashboard: two drafts, pages short of
 * a summary, a category, a date or a link, pages lacking only length, and red
 * links some pages cite and one page cites alone.
 *
 * It is **not** a seed. `WikiStore` still merges an always empty seed, and nothing
 * here is installed on load: the panel of `DemoContent.svelte` hands this dataset
 * to `importDataset`, the very path a restored backup takes, and only when a reader
 * asks for it. The module is imported dynamically from that panel, so a reader who
 * never asks never downloads it.
 *
 * The fiction is in English, and stays untranslated like any other page written
 * into the wiki: reader content never goes through the message catalogue. It obeys
 * the typography rules of the project, no dash of any kind, the straight apostrophe
 * only, with one deliberate departure: the quotation marks are the English curly
 * pair, since the prose around them is English.
 *
 * Real timestamps are relative to the moment the reader clicks, so the activity
 * chart covers its twelve months and the feed reads as today's rather than as a
 * date frozen when this file was written. In universe dates are fiction and stay
 * exactly as they are.
 *
 * @author Claude
 */

import { DEMO_ILLUSTRATIONS } from "#lib/demo-illustrations.ts";
import type { Category, Dataset, Entry, LiveEntry } from "#lib/types.ts";

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
 * Builds the category tree of the demonstration wiki.
 *
 * A function rather than a constant, like the two lists below: `importDataset`
 * stores what it is handed, so a shared array would end up aliased by the overlay
 * and edited in place by the reader.
 *
 * The palette holds seven colours for ten categories, so the colour names a
 * branch rather than a category: each of the six roots takes a hue of its own,
 * and each child takes its parent's. The rose is left out, being the hue a
 * reader could take for the red of a missing page.
 *
 * @returns The categories, freshly built.
 * @author Claude
 */
const categoryList = (): Category[] => [
    {
        slug: "people",
        name: "People",
        description: "Observers, engineers and wardens: the names the range decided to keep.",
        color: "bleu",
        parent: null
    },
    {
        slug: "sky-readers",
        name: "Sky readers",
        description: "Those who kept the night watch at Thornwatch, and wrote down what crossed the meridian.",
        color: "bleu",
        parent: "people"
    },
    {
        slug: "places",
        name: "Places",
        description: "Towns, ridges and stations, from the valley floor to the last cairn.",
        color: "vert",
        parent: null
    },
    {
        slug: "passes",
        name: "Passes and roads",
        description: "The ways across the range, and the months each of them stays open.",
        color: "vert",
        parent: "places"
    },
    {
        slug: "events",
        name: "Events",
        description: "The winters and nights the valleys still count their years from.",
        color: "ambre",
        parent: null
    },
    {
        slug: "hard-winters",
        name: "Hard winters",
        description: "Snow that closed the pass, stopped the line, and outlasted the people who measured it.",
        color: "ambre",
        parent: "events"
    },
    {
        slug: "organisations",
        name: "Organisations",
        description: "Orders, companies and wardens, each convinced the range would fall without them.",
        color: "violet",
        parent: null
    },
    {
        slug: "orders",
        name: "Orders and companies",
        description: "Bodies that hold a right over the mountain and owe it a duty, usually in that order.",
        color: "violet",
        parent: "organisations"
    },
    {
        slug: "objects",
        name: "Objects",
        description: "Instruments, registers, and the things carried down from the ridge.",
        color: "cyan",
        parent: null
    },
    {
        slug: "concepts",
        name: "Concepts",
        description: "The customs and quarrels that hold both valleys together.",
        color: "pierre",
        parent: null
    }
];

/**
 * Builds the pages of the demonstration wiki.
 *
 * Called from {@link demoDataset}, so `hoursAgo`, `daysAgo` and `monthsAgo` are
 * evaluated when the reader presses the button rather than when this module is
 * first loaded. A constant would freeze the whole corpus on the moment of the
 * import, and a browser that keeps the page open reinstalls yesterday's dates.
 *
 * @returns The pages, freshly built and dated from now.
 * @author Claude
 */
const entryList = (): Entry[] => [
    {
        id: "demo-ilse-varga",
        slug: "ilse-varga",
        title: "Ilse Varga",
        summary: "Chief observer of Thornwatch for twenty six winters, and the hand that kept the Register of Hours"
          + " through the Silent Winter.",
        body: [
            "## Early years",
            "",
            "Ilse Varga was born in [Halden Brae](/entries/halden-brae), the second child of",
            "[Teodor Varga](/entries/teodor-varga), and climbed to [Thornwatch](/entries/thornwatch) for the first",
            "time at nine, on the back of a salt mule. She was copying transits into her father's book before she",
            "could reach the eyepiece without a crate.",
            "",
            "## Chief observer",
            "",
            "The [Order of the Meridian](/entries/order-of-the-meridian) made her chief observer at thirty one,",
            "over three brothers with longer tenure and shorter patience. Her years at the station are remembered",
            "for three things:",
            "",
            "- the [Register of Hours](/entries/register-of-hours) was kept without a missed night through",
            "  [the Silent Winter](/entries/the-silent-winter);",
            "- the [Great Refractor](/entries/the-great-refractor) was carried up the ridge in pieces, and",
            "  assembled under her eye;",
            "- her account of [the Night of Falling Stars](/entries/night-of-falling-stars) is still the one the",
            "  valley schools read aloud.",
            "",
            "### Afterwards",
            "",
            "The [Varga family](/entries/varga-family) left the ridge a generation later, but the observing chair",
            "she had cut down to her height is still the one in the dome.",
            "",
            "> “The sky does not wait for the weather to clear. It only waits for someone to be looking.”"
        ].join( "\n" ),
        categories: [ "people", "sky-readers" ],
        infobox: [
            { label: "Office", value: "Chief observer, Thornwatch" },
            { label: "Winters on the ridge", value: "Twenty six" },
            { label: "Appointed by", value: "[Order of the Meridian](/entries/order-of-the-meridian)" },
            { label: "Born at", value: "[Halden Brae](/entries/halden-brae)" },
            { label: "Father", value: "[Teodor Varga](/entries/teodor-varga)" }
        ],
        image: {
            src: DEMO_ILLUSTRATIONS.ilse,
            alt: "A woman in a tall embroidered headdress and brocade bodice, hands folded, before a lake.",
            caption: "Ilse Varga in her appointment dress, painted for the Order the spring she took the dome."
        },
        dates: [
            { id: "demo-date-ilse-birth", label: "Birth", value: "1788-02-11" },
            { id: "demo-date-ilse-appointed", label: "Made chief observer", value: "1819-04" },
            { id: "demo-date-ilse-death", label: "Death", value: "1851-09-30" }
        ],
        status: "publie",
        aliases: [ "The Observer of Thornwatch", "I. Varga" ],
        createdAt: monthsAgo( 13 ),
        updatedAt: daysAgo( 1 )
    },
    {
        id: "demo-thornwatch",
        slug: "thornwatch",
        title: "Thornwatch",
        summary: "The observatory on the north ridge, kept by the Order of the Meridian, and the last lit window"
          + " a traveller sees before the pass.",
        body: [
            "## The station",
            "",
            "Thornwatch stands on the saddle of the north ridge, above the tree line and below the cairns. It was",
            "built as a hospice for the [Kessel Pass](/entries/kessel-pass) and became an observatory by accident,",
            "when [Teodor Varga](/entries/teodor-varga) asked for a room with a window that opened onto nothing.",
            "",
            "## The dome",
            "",
            "The dome holds [the Great Refractor](/entries/the-great-refractor), on a pier sunk into the rock so",
            "deep that the brothers claim it reaches the valley. The [Register of Hours](/entries/register-of-hours)",
            "is kept in the room beneath, and has not left it since the station was founded.",
            "",
            "### Supply",
            "",
            "Everything else comes up on [the Iron Line](/entries/the-iron-line) or on the backs of mules, and the",
            "brothers have opinions about both. In a hard winter the station is cut off for weeks, and keeps",
            "observing anyway."
        ].join( "\n" ),
        categories: [ "places" ],
        infobox: [
            { label: "Type", value: "Observatory and hospice" },
            { label: "Altitude", value: "2 470 m" },
            { label: "Kept by", value: "[Order of the Meridian](/entries/order-of-the-meridian)" },
            { label: "Reached by", value: "[The Iron Line](/entries/the-iron-line)" }
        ],
        image: {
            src: DEMO_ILLUSTRATIONS.thornwatch,
            alt: "A long stone hospice beside a road, with snowfields and peaks behind it.",
            caption: "Thornwatch from the pass road, in the one month the snow keeps to the peaks."
        },
        dates: [
            { id: "demo-date-thornwatch-hospice", label: "Hospice built", value: "1742" },
            { id: "demo-date-thornwatch-dome", label: "Dome raised", value: "1806-08" }
        ],
        status: "publie",
        aliases: [ "The Watch", "North Ridge Station" ],
        createdAt: monthsAgo( 13 ),
        updatedAt: daysAgo( 2 )
    },
    {
        id: "demo-kessel-pass",
        slug: "kessel-pass",
        title: "Kessel Pass",
        summary: "The only road between the two valleys, open five months a year and argued over for all twelve.",
        body: [
            "## The road",
            "",
            "The Kessel Pass climbs out of [Halden Brae](/entries/halden-brae) through a gorge so narrow the",
            "carters say the sun only visits it on feast days. It tops out below [Thornwatch](/entries/thornwatch)",
            "and drops into the eastern valley by a road that has been rebuilt more often than anyone can count.",
            "",
            "## The season",
            "",
            "The pass opens when the [Wardens of the Pass](/entries/wardens-of-the-pass) say it does, which is",
            "rarely when the merchants would like. It closes at the first snow that lies, under the rule the",
            "[Treaty of Two Valleys](/entries/treaty-of-two-valleys) set down after a winter nobody wanted to repeat.",
            "",
            "### The north face",
            "",
            "The old track up [the north face](/entries/the-north-face) is shorter by a day and longer by several",
            "funerals. It is not marked on any chart the wardens will sign."
        ].join( "\n" ),
        categories: [ "places", "passes" ],
        infobox: [
            { label: "Type", value: "Mountain pass" },
            { label: "Highest point", value: "2 310 m" },
            { label: "Open", value: "Five months a year" },
            { label: "Kept by", value: "[Wardens of the Pass](/entries/wardens-of-the-pass)" }
        ],
        image: {
            src: DEMO_ILLUSTRATIONS.pass,
            alt: "A narrow road at the floor of a gorge between steep rock walls, under a snow peak.",
            caption: "The gorge on the western approach, where the road is cut into the river's old bed."
        },
        dates: [
            { id: "demo-date-pass-road", label: "Carriage road opened", value: "1797" }
        ],
        status: "publie",
        aliases: [ "The Kessel", "The Gorge Road" ],
        createdAt: monthsAgo( 12 ),
        updatedAt: monthsAgo( 1 )
    },
    {
        id: "demo-halden-brae",
        slug: "halden-brae",
        title: "Halden Brae",
        summary: "The market town at the foot of the western valley, where the Iron Line begins and the salt road"
          + " ends.",
        body: [
            "## The town",
            "",
            "Halden Brae is the last town on the western side before the range closes in. It lives on three",
            "trades: the salt that comes down [the Salt Stair](/entries/the-salt-stair), the freight that goes up",
            "[the Iron Line](/entries/the-iron-line), and the travellers waiting for the",
            "[Kessel Pass](/entries/kessel-pass) to open.",
            "",
            "## The square",
            "",
            "The square holds a fountain, a weighhouse and the station of the line, and on market days it holds",
            "all three valleys' worth of arguments. The first stone of the",
            "[Treaty of Two Valleys](/entries/treaty-of-two-valleys) was signed on the weighhouse steps, because",
            "nobody would agree to sign it indoors.",
            "",
            "### People",
            "",
            "[Ilse Varga](/entries/ilse-varga) and [Mara Ostrel](/entries/mara-ostrel) were both born within a",
            "street of the square, which the town mentions more often than either of them ever did."
        ].join( "\n" ),
        categories: [ "places" ],
        infobox: [
            { label: "Type", value: "Market town" },
            { label: "Population", value: "3 200" },
            { label: "Lower station of", value: "[The Iron Line](/entries/the-iron-line)" }
        ],
        image: {
            src: DEMO_ILLUSTRATIONS.halden,
            alt: "A green valley floor with scattered farms, closed by rose coloured peaks.",
            caption: "The valley above Halden Brae, with the pass hidden behind the second ridge."
        },
        dates: [
            { id: "demo-date-halden-charter", label: "Market charter", value: "1688" }
        ],
        status: "publie",
        aliases: [ "The Brae" ],
        createdAt: monthsAgo( 12 ),
        updatedAt: monthsAgo( 2 )
    },
    {
        id: "demo-the-silent-winter",
        slug: "the-silent-winter",
        title: "The Silent Winter",
        summary: "One hundred and twelve days of snow without wind, which closed the pass, stopped the line and"
          + " left Thornwatch alone with its sky.",
        body: [
            "## The snow",
            "",
            "The Silent Winter is the name both valleys give to the snow that began in the first week of December",
            "and did not stop, or move, for one hundred and twelve days. There was no wind at all, which is why",
            "the drifts stood straight, and why the old people still distrust a still night in winter.",
            "",
            "## What it cost",
            "",
            "- [the Kessel Pass](/entries/kessel-pass) closed until the following May;",
            "- [the Iron Line](/entries/the-iron-line) lost its upper cable to the weight of rime;",
            "- [Thornwatch](/entries/thornwatch) was cut off for nine weeks.",
            "",
            "[Ilse Varga](/entries/ilse-varga) kept the [Register of Hours](/entries/register-of-hours) every",
            "clear night of it, and the clear nights were most of them. The",
            "[summer inquest](/entries/the-summer-inquest) that followed asked the station how it had eaten, and",
            "never once how it had observed.",
            "",
            "## Afterwards",
            "",
            "The winter is the reason the [Treaty of Two Valleys](/entries/treaty-of-two-valleys) exists, and the",
            "reason the [Lantern Cairns](/entries/lantern-cairns) are lit from the first snow rather than the first",
            "storm."
        ].join( "\n" ),
        categories: [ "events", "hard-winters" ],
        infobox: [
            { label: "Duration", value: "One hundred and twelve days" },
            { label: "Station cut off", value: "Nine weeks" },
            { label: "Places affected", value: "[Kessel Pass](/entries/kessel-pass), [Thornwatch](/entries/thornwatch)" }
        ],
        image: {
            src: DEMO_ILLUSTRATIONS.winter,
            alt: "A village of wooden chalets buried in deep snow below a forested slope.",
            caption: "The upper hamlet of Halden Brae in the ninth week, drawn by the schoolmaster."
        },
        dates: [
            { id: "demo-date-winter-began", label: "The snow begins", value: "1823-12" },
            { id: "demo-date-winter-ended", label: "The pass reopens", value: "The following May" }
        ],
        status: "publie",
        aliases: [ "The Still Winter" ],
        createdAt: monthsAgo( 11 ),
        updatedAt: monthsAgo( 3 )
    },
    {
        id: "demo-night-of-falling-stars",
        slug: "night-of-falling-stars",
        title: "The Night of Falling Stars",
        summary: "The November night the sky fell for four hours, and the only night the Register of Hours ran out"
          + " of columns.",
        body: [
            "## The night",
            "",
            "On the night of the thirteenth of November the sky over the range filled with shooting stars, so many",
            "that the valley thought the world was ending and the observers thought it was the best night of their",
            "lives. Both were right for about four hours.",
            "",
            "## At Thornwatch",
            "",
            "[Ilse Varga](/entries/ilse-varga) and [Brother Anselm Koll](/entries/anselm-koll) counted from the",
            "roof of the dome until their hands stopped working, then dictated to the novices. The",
            "[Register of Hours](/entries/register-of-hours) holds eleven pages for that night, ruled by hand",
            "because the printed columns ran out before midnight.",
            "",
            "## In the valley",
            "",
            "In [Halden Brae](/entries/halden-brae) the bell ringer rang for a fire, then for a death, then gave up",
            "and came out to watch with everyone else."
        ].join( "\n" ),
        categories: [ "events" ],
        infobox: [
            { label: "Duration", value: "About four hours" },
            { label: "Pages in the register", value: "11" },
            { label: "Counted by", value: "[Ilse Varga](/entries/ilse-varga), [Anselm Koll](/entries/anselm-koll)" }
        ],
        image: {
            src: DEMO_ILLUSTRATIONS.stars,
            alt: "An engraving of townspeople in a street looking up at a sky full of falling stars.",
            caption: "The square at Halden Brae a little after midnight, from a print sold the following week."
        },
        dates: [
            { id: "demo-date-stars-night", label: "The night", value: "1833-11-13" }
        ],
        status: "publie",
        aliases: [ "The Star Fall" ],
        createdAt: monthsAgo( 10 ),
        updatedAt: monthsAgo( 4 )
    },
    {
        id: "demo-the-iron-line",
        slug: "the-iron-line",
        title: "The Iron Line",
        summary: "The cable railway from Halden Brae to the ridge, and the company that runs it with more pride"
          + " than punctuality.",
        body: [
            "## The line",
            "",
            "The Iron Line climbs from the square of [Halden Brae](/entries/halden-brae) to the upper station below",
            "[Thornwatch](/entries/thornwatch), on a viaduct the engineers call elegant and the passengers call",
            "steep. Two cars balance each other on one cable, and pass at the loop halfway up with a courtesy",
            "nobody has ever managed to teach the drivers.",
            "",
            "## The company",
            "",
            "The line was designed by [Mara Ostrel](/entries/mara-ostrel) and is run by a company that answers to",
            "the town for its fares and to the [Order of the Meridian](/entries/order-of-the-meridian) for its",
            "timetable. Precedence on the cable is settled by the [Right of the Rope](/entries/right-of-the-rope),",
            "which everyone quotes and nobody has read.",
            "",
            "### Winters",
            "",
            "The line stops at the first ice on the cable. In [the Silent Winter](/entries/the-silent-winter) it",
            "stopped for four months, and lost its upper cable for good."
        ].join( "\n" ),
        categories: [ "organisations", "orders" ],
        infobox: [
            { label: "Type", value: "Cable railway and company" },
            { label: "Length", value: "1 900 m" },
            { label: "Designed by", value: "[Mara Ostrel](/entries/mara-ostrel)" },
            { label: "Stations", value: "2" }
        ],
        image: {
            src: DEMO_ILLUSTRATIONS.ironline,
            alt: "A cable railway climbing a wooded slope on a stone viaduct above a station and chalets.",
            caption: "The lower half of the line, from the roof of the station at Halden Brae."
        },
        dates: [
            { id: "demo-date-line-opened", label: "Line opened", value: "1838-07-02" }
        ],
        status: "publie",
        aliases: [ "The Line", "The Rope Railway" ],
        createdAt: monthsAgo( 10 ),
        updatedAt: daysAgo( 4 )
    },
    {
        id: "demo-order-of-the-meridian",
        slug: "order-of-the-meridian",
        title: "Order of the Meridian",
        summary: "The brotherhood that keeps Thornwatch, and the only order in the range whose rule is written in"
          + " hours rather than in prayers.",
        body: [
            "## The rule",
            "",
            "The Order of the Meridian keeps [Thornwatch](/entries/thornwatch) and the",
            "[Register of Hours](/entries/register-of-hours). Its rule fits on one page, and every line of it is",
            "about time: when to rise, when to observe, when to write, and when to stop writing and sleep.",
            "",
            "## Its members",
            "",
            "Brothers and sisters serve seven winters on the ridge before they may ask to come down. The order",
            "appointed [Ilse Varga](/entries/ilse-varga) chief observer, and still lists",
            "[Brother Tamas](/entries/brother-tamas) on its rolls although nobody has seen him since the pass",
            "closed in his third year.",
            "",
            "### Quarrels",
            "",
            "The order's oldest quarrel is with [the Iron Line](/entries/the-iron-line), over a timetable the order",
            "considers a matter of astronomy and the company considers a matter of fares."
        ].join( "\n" ),
        categories: [ "organisations", "orders" ],
        infobox: [
            { label: "Seat", value: "[Thornwatch](/entries/thornwatch)" },
            { label: "Years of service", value: "Seven winters" },
            { label: "Keeps", value: "[Register of Hours](/entries/register-of-hours)" }
        ],
        image: null,
        dates: [
            { id: "demo-date-order-rule", label: "Rule written", value: "1744" }
        ],
        status: "publie",
        aliases: [ "The Meridians", "The Brothers of the Watch" ],
        createdAt: monthsAgo( 11 ),
        updatedAt: monthsAgo( 5 )
    },
    {
        id: "demo-wardens-of-the-pass",
        slug: "wardens-of-the-pass",
        title: "Wardens of the Pass",
        summary: "The company that opens and closes the Kessel Pass, and is blamed both times.",
        body: [
            "## Duties",
            "",
            "The Wardens of the Pass decide when the [Kessel Pass](/entries/kessel-pass) opens, mark the road with",
            "poles and the [Lantern Cairns](/entries/lantern-cairns), and go out after anyone who tried it anyway.",
            "",
            "## Standing",
            "",
            "They answer to both valleys under the [Treaty of Two Valleys](/entries/treaty-of-two-valleys), which",
            "means each valley believes they answer to the other."
        ].join( "\n" ),
        categories: [ "organisations", "orders" ],
        infobox: [
            { label: "Founded under", value: "[Treaty of Two Valleys](/entries/treaty-of-two-valleys)" },
            { label: "Posts", value: "3" }
        ],
        image: null,
        dates: [
            { id: "demo-date-wardens-founded", label: "First muster", value: "1840-09" }
        ],
        status: "publie",
        aliases: [ "The Wardens" ],
        createdAt: monthsAgo( 9 ),
        updatedAt: monthsAgo( 6 )
    },
    {
        id: "demo-teodor-varga",
        slug: "teodor-varga",
        title: "Teodor Varga",
        summary: "The schoolmaster who asked the hospice for a window, and founded an observatory without meaning"
          + " to.",
        body: [
            "## The window",
            "",
            "Teodor Varga taught arithmetic in [Halden Brae](/entries/halden-brae) for twenty years, and spent",
            "his summers at the hospice that would become [Thornwatch](/entries/thornwatch). He asked the brothers",
            "for a room with a window facing south and nothing else, and began the",
            "[Register of Hours](/entries/register-of-hours) on its sill.",
            "",
            "## His children",
            "",
            "His daughter [Ilse Varga](/entries/ilse-varga) kept the register after him. His son kept the school,",
            "and the arithmetic, and never once climbed to the ridge."
        ].join( "\n" ),
        categories: [ "people", "sky-readers" ],
        infobox: [
            { label: "Trade", value: "Schoolmaster" },
            { label: "Founded", value: "[Register of Hours](/entries/register-of-hours)" },
            { label: "Daughter", value: "[Ilse Varga](/entries/ilse-varga)" }
        ],
        image: null,
        dates: [
            { id: "demo-date-teodor-birth", label: "Birth", value: "1751-06-03" },
            { id: "demo-date-teodor-register", label: "First entry in the register", value: "1785-08-21" },
            { id: "demo-date-teodor-death", label: "Death", value: "1819-03-02" }
        ],
        status: "publie",
        aliases: [ "The Schoolmaster" ],
        createdAt: monthsAgo( 9 ),
        updatedAt: monthsAgo( 7 )
    },
    {
        id: "demo-mara-ostrel",
        slug: "mara-ostrel",
        title: "Mara Ostrel",
        summary: "The engineer who drew the Iron Line, and the first person to ride it to the top.",
        body: [
            "## The engineer",
            "",
            "Mara Ostrel learned her trade on the mill races of [Halden Brae](/entries/halden-brae) and drew",
            "[the Iron Line](/entries/the-iron-line) on the back of a weighhouse ledger, in one evening, after the",
            "council told her it could not be done in less than a year.",
            "",
            "## The first ride",
            "",
            "She rode the first car to the upper station alone, because no member of the council would go with",
            "her, and wrote her name on the roof of the station in chalk. It has been painted over eleven times",
            "and still shows through."
        ].join( "\n" ),
        categories: [ "people" ],
        infobox: [
            { label: "Trade", value: "Engineer" },
            { label: "Known for", value: "[The Iron Line](/entries/the-iron-line)" }
        ],
        image: null,
        dates: [
            { id: "demo-date-mara-birth", label: "Birth", value: "1801" },
            { id: "demo-date-mara-ride", label: "First ride", value: "1838-07-02" }
        ],
        status: "publie",
        aliases: [ "M. Ostrel" ],
        createdAt: monthsAgo( 8 ),
        updatedAt: monthsAgo( 8 )
    },
    {
        id: "demo-anselm-koll",
        slug: "anselm-koll",
        title: "Anselm Koll",
        summary: "",
        body: [
            "Brother of the [Order of the Meridian](/entries/order-of-the-meridian), and the second pair of eyes on",
            "[the Night of Falling Stars](/entries/night-of-falling-stars)."
        ].join( "\n" ),
        categories: [ "people", "sky-readers" ],
        infobox: [],
        image: null,
        dates: [],
        status: "publie",
        aliases: [ "Brother Anselm" ],
        createdAt: monthsAgo( 7 ),
        updatedAt: monthsAgo( 9 )
    },
    {
        id: "demo-register-of-hours",
        slug: "register-of-hours",
        title: "The Register of Hours",
        summary: "Every transit seen from Thornwatch since the first night, in forty one volumes and three hands.",
        body: [
            "## The book",
            "",
            "The Register of Hours is the record of every star seen to cross the meridian from",
            "[Thornwatch](/entries/thornwatch), with the time, the observer and the weather. It was begun by",
            "[Teodor Varga](/entries/teodor-varga) on a windowsill and is now forty one volumes, bound in calf and",
            "kept in the room beneath the dome.",
            "",
            "## The remarks",
            "",
            "The last column is headed “Remarks” and is where the register becomes readable. It holds the cold, the",
            "visitors, the mule that ate a page, and, for [the Silent Winter](/entries/the-silent-winter), one",
            "word a night in [Ilse Varga](/entries/ilse-varga)'s hand: “Clear.”",
            "",
            "### Access",
            "",
            "The [Order of the Meridian](/entries/order-of-the-meridian) lets any traveller read it who climbs to",
            "the station to ask, which keeps the requests reasonably few."
        ].join( "\n" ),
        categories: [ "objects" ],
        infobox: [
            { label: "Volumes", value: "41" },
            { label: "Begun by", value: "[Teodor Varga](/entries/teodor-varga)" },
            { label: "Kept at", value: "[Thornwatch](/entries/thornwatch)" }
        ],
        image: null,
        dates: [
            { id: "demo-date-register-begun", label: "First entry", value: "1785-08-21" }
        ],
        status: "publie",
        aliases: [ "The Register", "The Hours" ],
        createdAt: monthsAgo( 8 ),
        updatedAt: monthsAgo( 10 )
    },
    {
        id: "demo-the-great-refractor",
        slug: "the-great-refractor",
        title: "The Great Refractor",
        summary: "The telescope of Thornwatch, carried up the ridge in nine loads and never carried down again.",
        body: [
            "## The instrument",
            "",
            "The Great Refractor is the telescope in the dome of [Thornwatch](/entries/thornwatch): a lens the",
            "width of a hand span, a tube longer than the dome is wide, and a pier that the brothers will not",
            "let anyone lean on.",
            "",
            "## The climb",
            "",
            "It came up before [the Iron Line](/entries/the-iron-line) existed, in nine loads on the backs of",
            "mules and one on the back of a novice who would not let the lens out of his arms.",
            "[Ilse Varga](/entries/ilse-varga) assembled it in the dome over a fortnight and pronounced it",
            "“acceptable”, which the order has engraved on the tube."
        ].join( "\n" ),
        categories: [ "objects" ],
        infobox: [
            { label: "Type", value: "Refracting telescope" },
            { label: "Loads to carry up", value: "10" },
            { label: "Housed at", value: "[Thornwatch](/entries/thornwatch)" }
        ],
        image: null,
        dates: [
            { id: "demo-date-refractor-assembled", label: "Assembled", value: "1827-09" }
        ],
        status: "publie",
        aliases: [ "The Glass" ],
        createdAt: monthsAgo( 6 ),
        updatedAt: monthsAgo( 11 )
    },
    {
        id: "demo-right-of-the-rope",
        slug: "right-of-the-rope",
        title: "Right of the Rope",
        summary: "The custom that settles who rides the Iron Line first, quoted by everyone and read by nobody.",
        body: [
            "## The custom",
            "",
            "The Right of the Rope gives precedence on [the Iron Line](/entries/the-iron-line) to the sick, then",
            "to the post, then to the [Order of the Meridian](/entries/order-of-the-meridian), then to whoever got",
            "there first. Merchants argue that salt should come second. Merchants have argued this for forty years."
        ].join( "\n" ),
        categories: [ "concepts" ],
        infobox: [
            { label: "Applies to", value: "[The Iron Line](/entries/the-iron-line)" }
        ],
        image: null,
        dates: [],
        status: "publie",
        aliases: [ "The Rope Right" ],
        createdAt: monthsAgo( 5 ),
        updatedAt: monthsAgo( 12 )
    },
    {
        id: "demo-lantern-cairns",
        slug: "lantern-cairns",
        title: "The Lantern Cairns",
        summary: "Stone markers along the pass, each with a niche for a lamp, lit from the first snow to the thaw.",
        body: [
            "## The cairns",
            "",
            "The Lantern Cairns mark the line of the [Kessel Pass](/entries/kessel-pass) above the poles, one every",
            "three hundred paces, each with a niche on its downhill side for a lamp. The",
            "[Wardens of the Pass](/entries/wardens-of-the-pass) light them from the first snow that lies to the",
            "thaw, which since [the Silent Winter](/entries/the-silent-winter) means most of the year.",
            "",
            "## The custom",
            "",
            "A traveller who finds a cairn dark relights it and leaves something in the niche. What is left there",
            "is the subject of a great deal of valley folklore and very little evidence."
        ].join( "\n" ),
        categories: [ "concepts" ],
        infobox: [
            { label: "Count", value: "27" },
            { label: "Lit by", value: "[Wardens of the Pass](/entries/wardens-of-the-pass)" }
        ],
        image: null,
        dates: [],
        status: "publie",
        aliases: [ "The Cairns" ],
        createdAt: monthsAgo( 4 ),
        updatedAt: daysAgo( 6 )
    },
    {
        id: "demo-treaty-of-two-valleys",
        slug: "treaty-of-two-valleys",
        title: "Treaty of Two Valleys",
        summary: "The agreement signed on the weighhouse steps that shares the pass, the wardens and the blame.",
        body: [
            "## The agreement",
            "",
            "The Treaty of Two Valleys was signed on the steps of the weighhouse in",
            "[Halden Brae](/entries/halden-brae), outdoors, because neither valley would sign in the other's hall.",
            "It shares the cost of the [Wardens of the Pass](/entries/wardens-of-the-pass), sets the closing of the",
            "[Kessel Pass](/entries/kessel-pass) at the first snow that lies, and names",
            "[Thornwatch](/entries/thornwatch) neutral ground.",
            "",
            "## Why",
            "",
            "Seventeen years after [the Silent Winter](/entries/the-silent-winter), both valleys had finally run out",
            "of people willing to say it would not happen again."
        ].join( "\n" ),
        categories: [ "events" ],
        infobox: [
            { label: "Signed at", value: "[Halden Brae](/entries/halden-brae)" },
            { label: "Parties", value: "2" },
            { label: "Created", value: "[Wardens of the Pass](/entries/wardens-of-the-pass)" }
        ],
        image: null,
        dates: [
            { id: "demo-date-treaty-signed", label: "Signed", value: "1840-06-24" }
        ],
        status: "publie",
        aliases: [ "The Weighhouse Treaty" ],
        createdAt: monthsAgo( 3 ),
        updatedAt: daysAgo( 9 )
    },
    {
        id: "demo-the-salt-stair",
        slug: "the-salt-stair",
        title: "The Salt Stair",
        summary: "The mule track from the salt springs to Halden Brae, cut in steps where the slope refused a road.",
        body: [
            "## The track",
            "",
            "The Salt Stair brings the salt of the high springs down to [Halden Brae](/entries/halden-brae), on a",
            "track that gives up being a road halfway and becomes eleven hundred steps cut into the rock. The mules",
            "know every one of them and the drivers know most."
        ].join( "\n" ),
        categories: [ "places", "passes" ],
        infobox: [
            { label: "Type", value: "Mule track" },
            { label: "Steps", value: "1 100" }
        ],
        image: null,
        dates: [
            { id: "demo-date-stair-cut", label: "Steps cut", value: "Before the hospice" }
        ],
        status: "publie",
        aliases: [ "The Stair" ],
        createdAt: monthsAgo( 2 ),
        updatedAt: daysAgo( 12 )
    },
    {
        id: "demo-comet-ledger",
        slug: "comet-ledger",
        title: "The Comet Ledger",
        summary: "A thin book kept beside the Register of Hours, for the things that crossed the sky without asking.",
        body: [
            "## The ledger",
            "",
            "The Comet Ledger holds what the [Register of Hours](/entries/register-of-hours) has no column for:",
            "comets, a fireball, two lights the brothers agreed not to name. Nine entries in sixty years, four of",
            "them in [Ilse Varga](/entries/ilse-varga)'s hand, and one that nobody admits to writing.",
            "",
            "### Status",
            "",
            "The order has not decided whether the ledger is part of the register or a private book, and has",
            "therefore not decided who may read it."
        ].join( "\n" ),
        categories: [ "objects" ],
        infobox: [
            { label: "Entries", value: "9" },
            { label: "Kept beside", value: "[Register of Hours](/entries/register-of-hours)" }
        ],
        image: null,
        dates: [
            { id: "demo-date-comet-first", label: "First entry", value: "1811-09" }
        ],
        status: "brouillon",
        aliases: [],
        createdAt: monthsAgo( 1 ),
        updatedAt: daysAgo( 8 )
    },
    {
        id: "demo-thaw-rota",
        slug: "thaw-rota",
        title: "The Thaw Rota",
        summary: "",
        body: [
            "## Draft",
            "",
            "The thaw rota is the order in which the wardens walk the pass when the snow goes. Notes to come: who",
            "walks first, and why it is never the same warden twice."
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

/**
 * Builds the live feed of the demonstration wiki.
 *
 * Dated from the call for the same reason as {@link entryList}, and it matters more
 * here: the feed groups its items by day and states how long ago each was published,
 * so a frozen timestamp is visible on the page rather than only in a chart.
 *
 * @returns The feed items, freshly built and dated from now.
 * @author Claude
 */
const liveList = (): LiveEntry[] => [
    {
        id: "demo-live-line-stopped",
        publishedAt: hoursAgo( 26 ),
        title: "The Iron Line runs the lower half only until the cable is inspected",
        body: "Rime on the upper span since dawn. Passengers for the ridge change at the loop and walk the last"
          + " stretch with the mules.",
        severity: "important",
        tags: [ "line", "ice" ],
        entrySlug: "the-iron-line",
        source: "The Iron Line company",
        pinned: true
    },
    {
        id: "demo-live-pass-closing",
        publishedAt: daysAgo( 9 ),
        title: "The Kessel Pass closes at the first snow that lies",
        body: "The wardens remind both valleys that the treaty means the first snow, not the first convenient one.",
        severity: "info",
        tags: [ "pass", "treaty" ],
        entrySlug: "kessel-pass",
        source: null,
        pinned: true
    },
    {
        id: "demo-live-gorge",
        publishedAt: hoursAgo( 3 ),
        title: "Rockfall in the gorge, carts turned back at the second bridge",
        body: "No one hurt. The wardens are clearing the road and ask carters to wait in Halden Brae rather than"
          + " at the bridge.",
        severity: "urgent",
        tags: [ "pass", "road" ],
        entrySlug: "kessel-pass",
        source: "Wardens of the Pass",
        pinned: false
    },
    {
        id: "demo-live-register",
        publishedAt: hoursAgo( 7 ),
        title: "The Register of Hours opens to readers on clear Sundays",
        body: "Volume forty one is back from the binder, and the remarks column survived every page of it.",
        severity: "info",
        tags: [ "order", "register" ],
        entrySlug: "register-of-hours",
        source: "Order of the Meridian",
        pinned: false
    },
    {
        id: "demo-live-storm-lifted",
        publishedAt: hoursAgo( 30 ),
        title: "Snow warning lifted on both sides of the range",
        body: "The glass has been steady since midnight. The line runs, the pass holds, and the cairns stay lit.",
        severity: "breaking",
        tags: [ "weather" ],
        entrySlug: null,
        source: "Order of the Meridian",
        pinned: false
    },
    {
        id: "demo-live-cairns",
        publishedAt: hoursAgo( 28 ),
        title: "Twenty seven cairns walked, twenty six lit",
        body: "The dark one is the cairn above the bend, which goes out every year and has never once been found"
          + " empty.",
        severity: "info",
        tags: [ "pass", "cairns" ],
        entrySlug: "lantern-cairns",
        source: "Wardens of the Pass",
        pinned: false
    },
    {
        id: "demo-live-fares",
        publishedAt: hoursAgo( 34 ),
        title: "Fares on the Iron Line hold for another season",
        body: "The council read the decision in under a minute, which is the shortest it has ever taken.",
        severity: "important",
        tags: [ "line", "town" ],
        entrySlug: "the-iron-line",
        source: "Council of Halden Brae",
        pinned: false
    },
    {
        id: "demo-live-refractor",
        publishedAt: daysAgo( 3 ),
        title: "The Great Refractor is back on its pier after cleaning",
        body: "The lens has been out of the tube for the first time in eleven years. The brothers describe the"
          + " sky as “sharper”, and the novices as “tired”.",
        severity: "info",
        tags: [ "order", "instruments" ],
        entrySlug: "the-great-refractor",
        source: "Order of the Meridian",
        pinned: false
    },
    {
        id: "demo-live-salt",
        publishedAt: daysAgo( 5 ),
        title: "Salt from the Stair falls below the treaty figure",
        body: "Two mule trains short this month, with the eastern valley asked to cover the difference until"
          + " the springs run again.",
        severity: "urgent",
        tags: [ "salt", "treaty" ],
        entrySlug: "treaty-of-two-valleys",
        source: "Weighhouse of Halden Brae",
        pinned: false
    },
    {
        id: "demo-live-comet",
        publishedAt: daysAgo( 7 ),
        title: "A tailed light seen low in the east before dawn",
        body: "Three brothers saw it, two agree on where, and the third has written it in a book he will not"
          + " show anyone.",
        severity: "info",
        tags: [ "sky" ],
        entrySlug: "comet-ledger",
        source: null,
        pinned: false
    },
    {
        id: "demo-live-observer",
        publishedAt: daysAgo( 14 ),
        title: "A new observer climbs to Thornwatch for the winter",
        body: "The chair is the one Varga cut down to her height. The new observer is, by every account, about"
          + " the same height.",
        severity: "info",
        tags: [ "order", "thornwatch" ],
        entrySlug: "ilse-varga",
        source: "Order of the Meridian",
        pinned: false
    }
];

/**
 * Builds the demonstration wiki, with its timestamps taken from this moment.
 *
 * Every list is rebuilt here rather than held in a constant, both because the
 * timestamps are relative to the call and because `importDataset` stores what it is
 * handed: a shared object would end up aliased by the overlay.
 *
 * Its accent is the amber, the colour of a lamp in a cairn, chosen apart from the
 * default blue so a reader sees at once that the colour of a wiki is its own.
 *
 * @returns A complete dataset, ready for `normalizeDataset`.
 * @author Claude
 */
export const demoDataset = (): Dataset => ( {
    meta: {
        universe: "The High Cairns",
        description: "The observers, passes and cable lines of a range where the sky is closer than the next"
          + " valley.",
        logo: "",
        accent: "ambre",
        featured: [ "ilse-varga", "thornwatch", "the-silent-winter", "the-iron-line" ]
    },
    categories: categoryList(),
    entries: entryList(),
    live: liveList()
} );
