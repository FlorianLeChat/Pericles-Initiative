import type { LayoutLoad } from "./$types";

/**
 * Every page is prerendered as static HTML. Routes that cannot be, such as the
 * editor, opt out individually.
 */
export const prerender = true;

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
