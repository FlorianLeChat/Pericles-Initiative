/**
 * Shared appearance of the form controls the site styles itself.
 *
 * @author Claude
 */

/**
 * Class stretching a Flowbite `Radio` over the pill that labels it.
 *
 * Every single choice on this site, the nature of a page, its status, a severity,
 * a colour, reads as a row of pills rather than as a column of dots, so the radio
 * is invisible and the label carries the appearance. Left where Flowbite puts it,
 * the control would be a sixteen pixel square in the corner of the pill, and only
 * that square would answer a click; stretched, the whole pill does.
 *
 * `opacity-0` rather than `sr-only`, which is what Flowbite's `custom` variant
 * applies: `sr-only` clips the input to nothing, and a clipped element takes no
 * pointer event, so the pill would only ever be reachable through its label.
 */
export const RADIO_OVERLAY = "absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0";

/**
 * Class bringing a small Flowbite `Input` to the height of a small `Select`.
 *
 * The library does not agree with itself on what `size="sm"` means: an input gets
 * `py-1` and a select `py-2.5`, so a field and a menu on the same row of a grid
 * stand twelve pixels apart, the label of one hanging above the middle of the
 * other. The select is the one worth matching, since twenty six pixels is a small
 * target for a thumb and every pill on this site is at least thirty six.
 */
export const SMALL_FIELD = "py-2.5";
