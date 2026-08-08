/**
 * Motion shared across components.
 *
 * The animations themselves live in `app.css`, as classes and keyframes. What
 * belongs here is the arithmetic a listing needs to stagger its own children,
 * because a grid, a feed and a chart all want the same rhythm.
 *
 * @author Claude
 */

/**
 * Past this rank the delay stops growing. A hundred entry grid would otherwise
 * finish arriving several seconds after the page did.
 */
const LAST_STAGGERED_RANK = 10;

/** Milliseconds between two consecutive ranks, mirrored by `--rank` in `app.css`. */
const RANK_STEP = 45;

/**
 * Clamps the position of an item into a rank usable as an animation delay.
 *
 * @param index Position of the item inside its listing.
 * @returns Rank to hand to the `--rank` custom property.
 * @author Claude
 */
export const staggerRank = ( index: number ): number => Math.min( index, LAST_STAGGERED_RANK );

/**
 * Same rhythm, expressed in milliseconds, for the Svelte transitions that take
 * their delay as a number instead of reading a custom property.
 *
 * @param index Position of the item inside its listing.
 * @returns Delay in milliseconds.
 * @author Claude
 */
export const staggerDelay = ( index: number ): number => staggerRank( index ) * RANK_STEP;
