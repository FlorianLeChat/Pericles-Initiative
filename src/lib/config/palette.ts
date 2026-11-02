/**
 * Named colours available to categories.
 *
 * Categories store a colour key rather than raw classes, so the dataset stays
 * free of styling details and the palette can be restyled in one place.
 *
 * Every hue is fixed rather than read from the accent: with an amber accent, a
 * «Bleu» category drawn in `accent-*` came out amber, and two categories of
 * different colours became the same chip.
 *
 * @author Claude
 */

import * as m from "#lib/locales/messages.js";

export interface PaletteColor {
    key: string;
    label: string;
    /** Classes for a chip or pill. */
    chip: string;
    /** Classes for a small round marker. */
    dot: string;
}

export const PALETTE: readonly PaletteColor[] = [
    {
        key: "bleu",
        label: m.palette_blue(),
        chip: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
        dot: "bg-blue-600"
    },
    {
        key: "vert",
        label: m.palette_green(),
        chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200",
        dot: "bg-emerald-500"
    },
    {
        key: "ambre",
        label: m.palette_amber(),
        chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",
        dot: "bg-amber-500"
    },
    {
        key: "violet",
        label: m.palette_violet(),
        chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200",
        dot: "bg-violet-500"
    },
    {
        key: "rose",
        label: m.palette_pink(),
        chip: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200",
        dot: "bg-rose-500"
    },
    {
        key: "cyan",
        label: m.palette_cyan(),
        chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-200",
        dot: "bg-cyan-500"
    },
    {
        key: "pierre",
        label: m.palette_stone(),
        chip: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        dot: "bg-slate-500"
    }
];

const FALLBACK: PaletteColor = PALETTE.at( -1 ) as PaletteColor;

export const PALETTE_KEYS: readonly string[] = PALETTE.map( ( color ) => color.key );

/**
 * Resolves a colour key into its classes.
 *
 * @param key Colour key stored on a category.
 * @returns The matching palette colour, or the fallback one.
 * @author Claude
 */
export const paletteColor = ( key: string | null | undefined ): PaletteColor =>
    PALETTE.find( ( color ) => color.key === key ) ?? FALLBACK;
