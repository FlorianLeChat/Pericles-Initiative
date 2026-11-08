/**
 * The room `localStorage` gives the wiki on this device.
 *
 * Browsers grant each site roughly five megabytes of `localStorage`, counted in
 * UTF-16 code units, and the overlay holds the whole wiki in a single key. The
 * figure is not exposed by any API, so it is written down here, as the order of
 * magnitude a reader can weigh what the wiki takes against.
 *
 * @author Claude
 */

/** Approximate quota of `localStorage` for one site, in bytes, five mebibytes so it reads as «5,00 Mo». */
export const STORAGE_QUOTA = 5 * 1_048_576;

/** Above this size the browser is close to refusing to store the overlay. */
export const STORAGE_WARNING = 3_500_000;
