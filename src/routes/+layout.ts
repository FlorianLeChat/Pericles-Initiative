import type { LayoutLoad } from "./$types";

/**
 * Every page is prerendered as static HTML. Routes that cannot be, such as the
 * editor, opt out individually.
 */
export const prerender = true;

/**
 * Written as `categories/index.html` rather than `categories.html`.
 *
 * `/categories` is both a page and the parent of `/categories/manage`, so without
 * this the build writes a `categories.html` file and a `categories/` directory
 * side by side, and the host has to guess which one `/categories` means. GitLab
 * Pages picks the directory, redirects to `/categories/`, finds no index in it and
 * answers 404 for a page that was prerendered perfectly well. `/wiki` will collide
 * the same way the day a backend feeds the seed and its `[slug]` pages are built.
 *
 * A trailing slash makes every route a directory with an index, so the two can
 * never name the same thing.
 */
export const trailingSlash = "always";

/**
 * Loads the published dataset.
 *
 * There is no published dataset yet: content lives entirely in the browser's
 * `localStorage` overlay, merged over an empty seed by `WikiStore`. This load
 * function is the hook where a future backend (a database, an API) would be
 * queried instead of returning `null`.
 *
 * @returns Always null for now, until a real data source exists.
 * @author Claude
 */
export const load: LayoutLoad = () => ( { dataset: null as unknown } );
