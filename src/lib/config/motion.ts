/**
 * Motion shared across components.
 *
 * The animations themselves live in `app.css`, as classes and keyframes. What
 * belongs here is the arithmetic a listing needs to stagger its own children,
 * because a grid, a feed and a chart all want the same rhythm.
 *
 * @author Claude
 */

import { prefersReducedMotion } from "svelte/motion";

/** Length of a short swap, mirrored by `--duration-swap` in `app.css`. */
const SWAP_DURATION = 200;

/**
 * How long a Svelte transition should actually run for.
 *
 * The media query in `app.css` flattens every CSS animation and transition on
 * the site, but a Svelte transition is JavaScript writing inline styles frame by
 * frame, and no stylesheet can reach it. Overlays, dropdowns and the drawer are
 * all animated that way, Flowbite's included, so this is the switch that covers
 * them. Returning zero rather than skipping the transition keeps the call sites
 * uniform: they always pass params, and only the number changes.
 *
 * @param duration Length wanted when motion is welcome, in milliseconds.
 * @returns The duration to hand to a transition.
 * @author Claude
 */
export const motionDuration = ( duration: number = SWAP_DURATION ): number =>
    prefersReducedMotion.current ? 0 : duration;

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
