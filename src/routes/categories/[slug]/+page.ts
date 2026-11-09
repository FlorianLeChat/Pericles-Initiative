/**
 * Prerendered when the crawler reaches it, served by the SPA fallback otherwise.
 *
 * The seed is always empty until a backend feeds it, so no listing links to a page of
 * content at build time and the crawler never sees this route. Inheriting `true` from
 * the layout made SvelteKit report it under `prerender_unseen_routes` on every build;
 * `"auto"` states that both outcomes are expected, and still writes static HTML for
 * every slug the day the seed carries one.
 *
 * @author Claude
 */
export const prerender = "auto";
