import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

export default defineConfig( {
    plugins: [
        sveltekit( {
            adapter: adapter( {
                pages: "build",
                assets: "build",
                // SPA fallback: pages created locally (localStorage overlay) have no prerendered
                // HTML, so any unknown path boots the client router instead of a 404. Named
                // `404.html` because a static host cannot be told about a fallback, only about
                // the document it already serves for a path it does not know: GitLab Pages, where
                // this is deployed, reads that name from the root of the project. A `200.html`
                // nothing looks for is a fallback nothing ever serves.
                fallback: "404.html",
                precompress: false,
                strict: false
            } ),
            prerender: {
                // Every page reachable from the navigation is crawled and written as static HTML.
                // Editor routes opt out through `export const prerender = false`.
                crawl: true,
                entries: [ "*" ],
                handleHttpError: "warn",
                handleMissingId: "warn"
            },
            paths: {
                // @ts-expect-error Needed for GitLab Pages generation.
                base: process.argv.includes( "dev" ) ? "" : process.env.BASE_PATH
            }
        } ),
        tailwindcss(),
        paraglideVitePlugin( {
            outdir: "./src/lib/locales",
            project: "./locales/.inlang",
            strategy: [ "localStorage", "preferredLanguage", "baseLocale" ],
            localStorageKey: "pericles:locale"
        } )
    ]
} );
