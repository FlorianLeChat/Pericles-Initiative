/**
 * Main navigation of the site.
 *
 * Reading pages sit in the header, the authoring tools in a secondary menu, so
 * that the header stays readable as the number of pages grows.
 *
 * @author Claude
 */

import type { Pathname } from "$app/types";

export interface NavLink {
    href: Pathname;
    label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
    { href: "/wiki", label: "Encyclopédie" },
    { href: "/categories", label: "Catégories" },
    { href: "/direct", label: "En direct" },
    { href: "/chronologie", label: "Chronologie" }
];

export const TOOL_LINKS: readonly NavLink[] = [
    { href: "/tableau-de-bord", label: "Tableau de bord" },
    { href: "/donnees", label: "Données" },
    { href: "/parametres", label: "Paramètres" }
];
