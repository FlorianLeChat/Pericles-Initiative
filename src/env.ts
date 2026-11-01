/**
 * Environment variables read by the application.
 *
 * Every variable is public and static: the site is prerendered and served as
 * flat files, and the CI writes them to `.env` before the build, so values are
 * read once at build time and inlined into the bundle. A missing optional value
 * resolves to `undefined`, so a build without analytics settings still works and
 * the scripts they back are simply left out.
 *
 * @author Claude
 */
import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars( {
    PUBLIC_VERSION: {
        public: true,
        static: true,
        description: "Version displayed in the settings (set by the CI)",
        schema: ( value ) => value || "0.0.1"
    },
    PUBLIC_ANALYTICS_ENABLED: {
        public: true,
        static: true,
        description: "Whether the Umami analytics scripts are loaded (\"true\" to enable)",
        schema: ( value ) => value === "true"
    },
    PUBLIC_ANALYTICS_ENDPOINT: {
        public: true,
        static: true,
        description: "Base URL of the Umami instance serving the analytics scripts",
        schema: ( value ) => value
    },
    PUBLIC_ANALYTICS_PROJECT_ID: {
        public: true,
        static: true,
        description: "Umami website identifier",
        schema: ( value ) => value
    },
    PUBLIC_ANALYTICS_RESPECT_DNT: {
        public: true,
        static: true,
        description: "Whether Umami honours the visitor's Do Not Track preference (\"true\" or \"false\")",
        schema: ( value ) => value
    }
} );
