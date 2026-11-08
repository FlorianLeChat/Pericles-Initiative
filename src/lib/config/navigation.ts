/**
 * Main navigation of the site.
 *
 * Reading pages sit in the header, the authoring tools in a secondary menu, so
 * that the header stays readable as the number of pages grows.
 *
 * @author Claude
 */

import type { Path } from "$app/types";
import * as m from "#lib/locales/messages.js";

export interface NavLink {
    href: Path;
    label: string;
}

// A `Path` is relative to the base path, with no leading slash, and the layout
// asks for a trailing slash, so these carry one. Dropping it would type check
// nowhere and route nowhere.
export const NAV_LINKS: readonly NavLink[] = [
    { href: "entries/", label: m.nav_wiki() },
    { href: "categories/", label: m.nav_categories() },
    { href: "live/", label: m.common_live_label() },
    { href: "timeline/", label: m.nav_timeline() }
];

const TOOL_LINKS: readonly NavLink[] = [
    { href: "dashboard/", label: m.nav_dashboard() },
    { href: "data/", label: m.nav_backups() },
    { href: "settings/", label: m.nav_settings() }
];

/**
 * The tools a device offers.
 *
 * A device set to read only leaves the dashboard out: its pages to write and
 * its points of attention are the author's workbench, and a player at the table
 * meets the world rather than its back office. The backups stay, since they are
 * how a player's device receives the wiki, and the settings stay, since that is
 * where reading only is taken back.
 *
 * @param readingOnly True on a device set to read only.
 * @returns The tool links to show, in their order.
 * @author Claude
 */
export const toolLinks = ( readingOnly: boolean ): readonly NavLink[] =>
    readingOnly ? TOOL_LINKS.filter( ( link ) => link.href !== "dashboard/" ) : TOOL_LINKS;

/**
 * Query parameter of the index carrying a keyword, which it filters by on arrival.
 *
 * The search palette sends every result of a query there, so both ends read the
 * name from here rather than agreeing on a string.
 */
export const ENTRIES_QUERY_PARAMETER = "q";

/**
 * Classes of one step of a breadcrumb, set flush with the title under it.
 *
 * Flowbite indents every step after the first by its own margin and the first
 * one by none, so a breadcrumb drawn with its defaults started a few pixels in
 * from the title on one page and flush on another. Passed as `homeClass` to the
 * first step and `linkClass` or `spanClass` to the others. Each step stands
 * 44px tall below `sm`, a breadcrumb being a row of links a thumb aims at.
 */
export const BREADCRUMB_STEP
    = "ms-0 md:ms-0 inline-flex items-center min-h-11 sm:min-h-0 text-sm font-normal text-ink-500 hover:text-ink-900 dark:text-paper-300 dark:hover:text-paper-100";

/** Classes of the list of a breadcrumb: the steps wrap, and no spacing of Flowbite's own sits between them. */
export const BREADCRUMB_LIST = "flex-wrap space-x-0 md:space-x-0";
