import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter( {
            pages: "build",
            assets: "build",
            // SPA fallback: pages created locally (localStorage overlay) have no prerendered
            // HTML, so any unknown path boots the client router instead of a 404.
            fallback: "200.html",
            precompress: false,
            strict: false
        } ),
        prerender: {
            // Every page reachable from the navigation is crawled and written as static HTML.
            // Editor routes opt out through `export const prerender = false`.
            crawl: true,
            entries: [ "*" ],
            handleHttpError: "warn",
            handleMissingId: "warn",
            // The seed is always empty until a backend feeds it, so /wiki and /categories crawl
            // to zero links: [slug] routes are legitimately unseen, not a broken build.
            handleUnseenRoutes: "warn"
        }
    }
};

export default config;
