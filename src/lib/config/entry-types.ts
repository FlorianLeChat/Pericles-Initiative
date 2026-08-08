/**
 * Single source of truth for the kinds of pages the encyclopedia hosts.
 *
 * Badges, filters, icons and the editor form all read this list, so adding a
 * new kind of page only requires one entry here.
 *
 * @author Claude
 */

import type { EntryType } from "$lib/types";

export interface EntryTypeConfig {
    id: EntryType;
    /** Singular label, shown on badges. */
    label: string;
    /** Plural label, shown in listing headers and filters. */
    plural: string;
    /** SVG path data, drawn with `fill="none" stroke="currentColor"` on a 24x24 viewBox. */
    icon: string;
    /** Tailwind classes of the badge, light and dark. */
    badge: string;
}

export const ENTRY_TYPES: readonly EntryTypeConfig[] = [
    {
        id: "personnage",
        label: "Personnage",
        plural: "Personnages",
        icon: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A17.9 17.9 0 0 1 12 21.75c-2.7 0-5.2-.6-7.5-1.65Z",
        badge: "bg-accent-100 text-accent-700 dark:bg-accent-900/60 dark:text-accent-200"
    },
    {
        id: "lieu",
        label: "Lieu",
        plural: "Lieux",
        icon: "M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.14-7.5 11.25-7.5 11.25S4.5 17.64 4.5 10.5a7.5 7.5 0 1 1 15 0Z",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
    },
    {
        id: "evenement",
        label: "Événement",
        plural: "Événements",
        icon: "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200"
    },
    {
        id: "organisation",
        label: "Organisation",
        plural: "Organisations",
        icon: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
        badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200"
    },
    {
        id: "objet",
        label: "Objet",
        plural: "Objets",
        icon: "m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9",
        badge: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-200"
    },
    {
        id: "concept",
        label: "Concept",
        plural: "Concepts",
        icon: "M12 18v-5.25m0 0a6 6 0 0 0 1.5-.189m-1.5.189a6 6 0 0 1-1.5-.189m3.75 7.478a12 12 0 0 1-4.5 0m3.75 2.383a14.4 14.4 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18",
        badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200"
    }
];

/** Fallback used when a dataset carries an unknown type. */
const FALLBACK: EntryTypeConfig = ENTRY_TYPES.at( -1 ) as EntryTypeConfig;

export const ENTRY_TYPE_IDS: readonly EntryType[] = ENTRY_TYPES.map( ( type ) => type.id );

/**
 * Checks whether a raw value is a supported page type.
 *
 * @param value Any value read from JSON or from a form.
 * @returns True when the value is a known `EntryType`.
 * @author Claude
 */
export const isEntryType = ( value: unknown ): value is EntryType =>
    typeof value === "string" && ENTRY_TYPE_IDS.includes( value as EntryType );

/**
 * Returns the presentation config of a page type.
 *
 * @param type Type identifier, possibly unknown.
 * @returns The matching config, or the fallback one.
 * @author Claude
 */
export const entryTypeConfig = ( type: string ): EntryTypeConfig =>
    ENTRY_TYPES.find( ( candidate ) => candidate.id === type ) ?? FALLBACK;
