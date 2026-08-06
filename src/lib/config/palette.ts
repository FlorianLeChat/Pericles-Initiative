/**
 * Named colours available to categories.
 *
 * Categories store a colour key rather than raw classes, so the dataset stays
 * free of styling details and the palette can be restyled in one place.
 *
 * @author Claude
 */

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
        label: "Bleu",
        chip: "bg-accent-100 text-accent-700 dark:bg-accent-900/60 dark:text-accent-200",
        dot: "bg-accent-500"
    },
    {
        key: "vert",
        label: "Vert",
        chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200",
        dot: "bg-emerald-500"
    },
    {
        key: "ambre",
        label: "Ambre",
        chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",
        dot: "bg-amber-500"
    },
    {
        key: "violet",
        label: "Violet",
        chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200",
        dot: "bg-violet-500"
    },
    {
        key: "rose",
        label: "Rose",
        chip: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200",
        dot: "bg-rose-500"
    },
    {
        key: "cyan",
        label: "Cyan",
        chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-200",
        dot: "bg-cyan-500"
    },
    {
        key: "pierre",
        label: "Pierre",
        chip: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
        dot: "bg-stone-500"
    }
];

const FALLBACK: PaletteColor = PALETTE[ PALETTE.length - 1 ];

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
