/**
 * Single source of truth for the kinds of pages the encyclopedia hosts.
 *
 * Badges, filters, icons and the editor form all read this list, so adding a
 * new kind of page only requires one entry here.
 *
 * @author Claude
 */

import Box from "@lucide/svelte/icons/box";
import Building2 from "@lucide/svelte/icons/building-2";
import Lightbulb from "@lucide/svelte/icons/lightbulb";
import MapPin from "@lucide/svelte/icons/map-pin";
import User from "@lucide/svelte/icons/user";
import Zap from "@lucide/svelte/icons/zap";
import type { Component } from "svelte";
import type { EntryType } from "$lib/types";

export interface EntryTypeConfig {
    id: EntryType;
    /** Singular label, shown on badges. */
    label: string;
    /** Plural label, shown in listing headers and filters. */
    plural: string;
    /** Icon component, rendered decoratively beside the label. */
    icon: Component;
    /** Tailwind classes of the badge, light and dark. */
    badge: string;
}

export const ENTRY_TYPES: readonly EntryTypeConfig[] = [
    {
        id: "personnage",
        label: "Personnage",
        plural: "Personnages",
        icon: User,
        badge: "bg-accent-100 text-accent-700 dark:bg-accent-900/60 dark:text-accent-200"
    },
    {
        id: "lieu",
        label: "Lieu",
        plural: "Lieux",
        icon: MapPin,
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
    },
    {
        id: "evenement",
        label: "Événement",
        plural: "Événements",
        icon: Zap,
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200"
    },
    {
        id: "organisation",
        label: "Organisation",
        plural: "Organisations",
        icon: Building2,
        badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200"
    },
    {
        id: "objet",
        label: "Objet",
        plural: "Objets",
        icon: Box,
        badge: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-200"
    },
    {
        id: "concept",
        label: "Concept",
        plural: "Concepts",
        icon: Lightbulb,
        badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200"
    }
];

/** Fallback used when a dataset carries an unknown type. */
const FALLBACK: EntryTypeConfig = ENTRY_TYPES.at( -1 ) as EntryTypeConfig;

const ENTRY_TYPE_IDS: readonly EntryType[] = ENTRY_TYPES.map( ( type ) => type.id );

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
