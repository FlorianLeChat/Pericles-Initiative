/**
 * How an image chosen from a file is reduced before it joins the dataset.
 *
 * An imported image is stored in `localStorage` as base64 WebP, beside all the
 * text of the wiki, under a quota of roughly five megabytes. The reader picks
 * how much of it one image may take, at the moment of the import.
 *
 * @author Claude
 */

import * as m from "#lib/locales/messages.js";

/** One level of WebP compression offered at the import. */
export interface ImageQuality {
    id: "light" | "balanced" | "faithful";
    /** Quality handed to the WebP encoder, between 0 and 1. */
    quality: number;
    label: () => string;
}

/** The levels offered, lightest first. */
export const IMAGE_QUALITIES: readonly ImageQuality[] = [
    { id: "light", quality: 0.6, label: m.image_import_quality_light },
    { id: "balanced", quality: 0.8, label: m.image_import_quality_balanced },
    { id: "faithful", quality: 0.92, label: m.image_import_quality_faithful }
];

/** Level chosen when the dialog opens. */
export const DEFAULT_IMAGE_QUALITY: ImageQuality[ "id" ] = "balanced";

/**
 * Longest side an imported image keeps, in pixels, per place it is shown.
 *
 * An illustration or a figure of the body never stands wider than the article
 * column on a large screen; a logo never larger than its 32 pixel slot, at
 * twice the density.
 */
export const IMAGE_MAX_SIDE = { illustration: 1600, logo: 128 } as const;
