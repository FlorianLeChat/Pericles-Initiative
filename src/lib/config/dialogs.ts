/**
 * Shared appearance of the native dialogs the site opens.
 *
 * @author Claude
 */

/**
 * Class making a Flowbite `Modal` span the full width of the viewport below
 * the `sm` breakpoint.
 *
 * A phone screen is too narrow for a dialog to float over a visible margin of
 * background on each side: the margin costs width the content needs, and the
 * strip of page left inert on either edge reads as wasted space rather than
 * context. Only the width changes, the vertical placement and the height cap
 * stay whatever the call site already set for its desktop appearance. Every
 * `Modal` on the site takes this class in addition to that appearance,
 * `max-sm:` so it cedes to it once there is room for it.
 *
 * `max-sm:` rather than the library's own `fullscreen` prop, which pins the
 * dialog to the whole viewport, height included, and keeps doing so past the
 * breakpoint too, where the floating appearance this site chose for its
 * dialogs still fits.
 */
export const MODAL_MOBILE_FULLSCREEN
    = "max-sm:mx-0 max-sm:w-screen max-sm:max-w-none max-sm:rounded-none max-sm:border-x-0";
