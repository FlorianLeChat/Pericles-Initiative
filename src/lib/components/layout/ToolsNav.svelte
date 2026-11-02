<script lang="ts">
    /**
     * Row of tabs between the three tool pages: dashboard, backups, settings.
     *
     * The three pages are siblings that used to point at one another only in
     * prose, while the header gave no sign of which one was open: the tools sit
     * behind a menu, out of the main navigation. This puts the set and the
     * current one under the title of each, as links rather than in-page tabs, so
     * every tool keeps its own address and the prerender crawler sees plain
     * anchors.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import * as m from "#lib/locales/messages.js";
    import { TOOL_LINKS } from "#lib/config/navigation.ts";
</script>

<nav class="border-paper-200 dark:border-ink-800 mt-6 flex gap-6 border-b" aria-label={m.common_tools_label()}>
    {#each TOOL_LINKS as link ( link.href )}
        {@const current = page.url.pathname.startsWith( resolve( link.href ) )}

        <a
            href={resolve( link.href )}
            class="-mb-px flex min-h-11 items-center border-b-2 text-sm transition-colors {current
                ? "border-ink-900 text-ink-900 dark:border-paper-100 dark:text-paper-100 font-semibold"
                : "text-ink-500 hover:text-ink-900 dark:text-paper-300 dark:hover:text-paper-100 border-transparent"}"
            aria-current={current ? "page" : undefined}
        >
            {link.label}
        </a>
    {/each}
</nav>
