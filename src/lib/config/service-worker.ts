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

/**
 * Message every open page receives once install has stored what it could.
 *
 * Carries `{ type: PRECACHE_STATUS, missing: string[] }`, the paths that never
 * made it into the cache for this build. An empty array is the common case;
 * anything else is what a reader who then goes offline before revisiting
 * those files will see fail rather than heal, which is worth a line in a
 * report's console rather than a silent gap.
 */
export const PRECACHE_STATUS = "pericles:precache-status";
