/**
 * The editor cannot be prerendered: it edits pages that may only exist in the
 * browser. The SPA fallback serves this route.
 */
export const prerender = false;
export const ssr = false;
