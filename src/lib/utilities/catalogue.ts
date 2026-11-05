/**
 * The call number of a page, the heading line of a library catalogue card.
 *
 * Derived on the fly from what a page already holds, never stored: three letters
 * of its first category, the year of its earliest date of reference, three
 * letters of its title. «PEO 1826 HAL» for a keeper born in 1826. A part the page
 * cannot supply is simply left out, so an uncategorised, undated page still gets
 * the letters of its title.
 *
 * @author Claude
 */

import { deburr } from "./slug";
import { extractYear } from "./date";
import type { Category, Entry } from "#lib/types.ts";

/** Anything that is not a plain latin letter, dropped before the letters are taken. */
const NON_LETTERS = /[^a-z]/g;

/** How many letters each word of the call number keeps. */
const CODE_LENGTH = 3;

/**
 * Turns a name into the upper case letters a call number keeps of it.
 *
 * @param value Name of a category or title of a page.
 * @returns Up to three letters, empty when the name holds none.
 * @author Claude
 */
const letterCode = ( value: string ): string => deburr( value ).replaceAll( NON_LETTERS, "" ).slice( 0, CODE_LENGTH ).toUpperCase();

/**
 * Builds the call number of a page.
 *
 * @param entry The page, or as much of it as the editor holds before it is saved.
 * @param category Its first category, when it has one.
 * @returns The parts that could be derived, separated by spaces.
 * @author Claude
 */
export const callNumber = ( entry: Pick<Entry, "dates" | "title">, category: Category | undefined ): string =>
{
    const years = entry.dates
        .map( ( date ) => extractYear( date.value ) )
        .filter( ( year ): year is number => year !== null );

    const earliest = years.length > 0 ? String( Math.min( ...years ) ) : "";
    const parts = [ category ? letterCode( category.name ) : "", earliest, letterCode( entry.title ) ];

    return parts.filter( ( part ) => part.length > 0 ).join( " " );
};
