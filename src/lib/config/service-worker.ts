/**
 * The one thing the page and the service worker have to agree on.
 *
 * Kept in its own module rather than exported from `src/service-worker.ts`:
 * importing that file from a component would pull the whole worker, its caches
 * and its fetch handler into the application bundle.
 *
 * @author Claude
 */

/** Message a waiting worker accepts to stop waiting and take over. */
export const ACTIVATE_NOW = "pericles:activate";
