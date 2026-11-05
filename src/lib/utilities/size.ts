/**
 * Sizes of what this browser stores, measured and written for a reader.
 *
 * @author Claude
 */

import * as m from "#lib/locales/messages.js";
import { getLocale } from "#lib/locales/runtime.js";

/** Bytes in a kilobyte, and in a megabyte, as the storage of a browser counts them. */
const KILOBYTE = 1024;
const MEGABYTE = 1_048_576;

/**
 * Writes a number with a fixed count of decimals, in the language of the page.
 *
 * @param value Number to write.
 * @param digits Decimals kept.
 * @returns «35,6» in French, "35.6" in English.
 * @author Claude
 */
const decimal = ( value: number, digits: number ): string =>
    new Intl.NumberFormat( getLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits } ).format( value );

/**
 * Formats a byte count for display.
 *
 * @param bytes Size in bytes.
 * @returns A short human readable size in the language of the page, «240,5 Ko».
 * @author Claude
 */
export const formatSize = ( bytes: number ): string =>
{
    if ( bytes < KILOBYTE )
    {
        return `${ bytes } ${ m.common_unit_bytes() }`;
    }

    if ( bytes < MEGABYTE )
    {
        return `${ decimal( bytes / KILOBYTE, 1 ) } ${ m.common_unit_kilobytes() }`;
    }

    return `${ decimal( bytes / MEGABYTE, 2 ) } ${ m.common_unit_megabytes() }`;
};

/**
 * Measures what a value weighs once written to `localStorage` as JSON.
 *
 * @param value Anything the store persists.
 * @returns Its size in bytes, UTF-8 encoded.
 * @author Claude
 */
export const storedSize = ( value: unknown ): number => new TextEncoder().encode( JSON.stringify( value ) ).length;
