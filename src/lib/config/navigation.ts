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
    { href: "wiki/", label: m.nav_wiki() },
    { href: "categories/", label: m.nav_categories() },
    { href: "live/", label: m.nav_live() },
    { href: "timeline/", label: m.nav_timeline() }
];

export const TOOL_LINKS: readonly NavLink[] = [
    { href: "dashboard/", label: m.nav_dashboard() },
    { href: "data/", label: m.nav_backups() },
    { href: "settings/", label: m.nav_settings() }
];
