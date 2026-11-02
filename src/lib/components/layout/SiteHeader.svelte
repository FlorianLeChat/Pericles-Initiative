<script lang="ts">
    /**
     * Sticky header: identity, main navigation, tools, search and theme.
     *
     * Below `lg` the navigation moves into a drawer rather than into a panel
     * unfolding under the bar. The panel pushed the page down as it opened, so
     * the article the reader was on jumped away from under their thumb, and it
     * left the rest of the page reachable behind it. The drawer is an overlay
     * with its own backdrop, and the page does not move.
     *
     * @author Claude
     */
    import { page } from "$app/state";
    import { resolve } from "$app/paths";
    import X from "@lucide/svelte/icons/x";
    import type { Path } from "$app/types";
    import ToolsMenu from "./ToolsMenu.svelte";
    import Menu from "@lucide/svelte/icons/menu";
    import Plus from "@lucide/svelte/icons/plus";
    import Kbd from "flowbite-svelte/Kbd.svelte";
    import * as m from "#lib/locales/messages.js";
    import ThemeToggle from "./ThemeToggle.svelte";
    import Search from "@lucide/svelte/icons/search";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Drawer from "flowbite-svelte/Drawer.svelte";
    import { platform } from "#lib/state/platform.svelte.ts";
    import { NAV_LINKS, TOOL_LINKS } from "#lib/config/navigation.ts";

    interface Props {
        /** Opens the search palette. */
        onsearch: () => void;
    }

    let { onsearch }: Props = $props();

    let menuOpen = $state( false );

    const shortcut = $derived( platform.apple ? m.site_header_shortcut_label_apple() : m.site_header_shortcut_label() );

    /**
     * Tells whether a navigation link matches the current page.
     *
     * Every link already ends in a slash, since the layout asks for one, so a
     * prefix test is enough to light «Encyclopédie» up on an article and needs no
     * separator of its own. Appending one here would look for `/wiki//`. The
     * link is a path relative to the base, while the page url is absolute, so
     * the test runs against its resolved form.
     *
     * @param href Link target, ending in a slash.
     * @returns True when the link should be highlighted.
     * @author Claude
     */
    const isActive = ( href: Path ): boolean => page.url.pathname.startsWith( resolve( href ) );
</script>

<header
    id="site-header"
    class="border-paper-200 dark:border-ink-800 dark:bg-ink-950/90 sticky top-0 z-40 border-b bg-white/90 backdrop-blur"
>
    <div class="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <a href={resolve( "/" )} class="group flex min-w-0 shrink-0 items-center gap-2.5">
            {#if wiki.meta.logo}
                <img src={wiki.meta.logo} alt="" class="h-8 w-8 shrink-0 rounded-lg object-cover" width="32" height="32" />
            {/if}

            <span class="min-w-0">
                <span
                    class="text-ink-900 dark:text-paper-100 group-hover:text-accent-600 dark:group-hover:text-accent-400
                           block truncate font-serif text-lg leading-tight font-semibold transition-colors"
                >
                    {wiki.meta.universe}
                </span>

                <span class="text-muted hidden truncate text-xs leading-tight sm:block">{m.common_encyclopedia_tagline()}</span>
            </span>
        </a>

        <button
            type="button"
            class="bg-paper-100 text-muted hover:bg-paper-200 dark:bg-ink-900 dark:hover:bg-ink-800 mx-auto hidden h-10
                   w-full max-w-sm items-center gap-2.5 rounded-full px-4 text-sm leading-none transition-colors lg:flex"
            onclick={onsearch}
        >
            <Search class="h-4 w-4 shrink-0" />

            <span class="flex-1 text-left">{m.common_search()}</span>

            <Kbd class="dark:bg-ink-800 dark:border-ink-700 bg-white px-1.5 py-1 font-sans text-xs leading-none font-normal">
                {shortcut}
            </Kbd>
        </button>

        <div class="ml-auto flex items-center gap-1 lg:ml-0">
            <nav class="mr-2 hidden items-center gap-1 lg:flex" aria-label={m.site_header_nav_main_aria()}>
                {#each NAV_LINKS as link ( link.href )}
                    <a
                        href={resolve( link.href )}
                        class="rounded-md px-2.5 py-2 text-sm transition-colors {isActive( link.href )
                            ? "text-ink-900 dark:text-paper-100 dark:decoration-paper-100 decoration-ink-900 font-semibold underline decoration-2 underline-offset-8"
                            : "text-ink-500 hover:text-ink-900 dark:text-paper-300 dark:hover:text-paper-100"}"
                        aria-current={isActive( link.href ) ? "page" : undefined}
                    >
                        {link.label}
                    </a>
                {/each}
            </nav>

            <button
                type="button"
                class="text-ink-600 hover:bg-paper-200 dark:text-paper-300 dark:hover:bg-ink-800 inline-flex h-11 w-11
                       items-center justify-center rounded-full transition lg:hidden"
                onclick={onsearch}
                aria-label={m.common_search()}
            >
                <Search class="h-[18px] w-[18px]" />
            </button>

            <a
                href={resolve( "/new" )}
                class="bg-accent-700 hover:bg-accent-800 hidden h-9 items-center gap-2 rounded-lg px-3.5 text-sm
                       leading-none font-medium text-white transition-colors lg:inline-flex"
            >
                <Plus class="h-4 w-4" />
                {m.common_new_entry()}
            </a>

            <div class="border-paper-200 dark:border-ink-800 ml-1 flex items-center gap-1 border-l pl-1.5">
                <ToolsMenu links={TOOL_LINKS} {isActive} />

                <ThemeToggle />
            </div>

            <button
                type="button"
                class="text-ink-600 hover:bg-paper-200 dark:text-paper-300 dark:hover:bg-ink-800 inline-flex h-11 w-11
                       items-center justify-center rounded-full transition lg:hidden"
                onclick={() => ( menuOpen = true )}
                aria-expanded={menuOpen}
                aria-controls="navigation-mobile"
                aria-label={m.site_header_open_nav()}
            >
                <Menu class="h-[18px] w-[18px]" />
            </button>
        </div>
    </div>
</header>

<Drawer
    bind:open={menuOpen}
    id="navigation-mobile"
    placement="right"
    dismissable={false}
    transitionParams={{ duration: 0 }}
    class="text-ink-800 dark:bg-ink-950 dark:text-paper-200 z-50 w-72 bg-white p-0 lg:hidden"
    aria-label={m.site_header_drawer_aria()}
>
    <div class="border-paper-200 dark:border-ink-800 flex items-center justify-between border-b px-4 py-3">
        <p class="text-muted text-xs tracking-wide uppercase">{m.site_header_drawer_heading()}</p>

        <button
            type="button"
            class="text-ink-600 hover:bg-paper-200 dark:text-paper-300 dark:hover:bg-ink-800 inline-flex h-11 w-11
                   items-center justify-center rounded-full transition"
            onclick={() => ( menuOpen = false )}
            aria-label={m.site_header_close_nav()}
        >
            <X class="h-4.5 w-4.5" />
        </button>
    </div>

    <nav class="px-4 py-3" aria-label={m.site_header_nav_mobile_aria()}>
        <ul class="space-y-1">
            {#each NAV_LINKS as link ( link.href )}
                <li>
                    <a
                        href={resolve( link.href )}
                        class="flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors {isActive( link.href )
                            ? "bg-paper-100 text-ink-900 dark:bg-ink-800 dark:text-paper-100 font-semibold"
                            : "hover:bg-paper-100 dark:hover:bg-ink-800 font-medium"}"
                        aria-current={isActive( link.href ) ? "page" : undefined}
                        onclick={() => ( menuOpen = false )}
                    >
                        {link.label}
                    </a>
                </li>
            {/each}
        </ul>

        <p class="text-muted mt-3 px-3 text-xs tracking-wide uppercase">{m.common_tools_label()}</p>

        <ul class="mt-1 space-y-1">
            {#each TOOL_LINKS as link ( link.href )}
                <li>
                    <a
                        href={resolve( link.href )}
                        class="flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors {isActive( link.href )
                            ? "bg-paper-100 text-ink-900 dark:bg-ink-800 dark:text-paper-100 font-semibold"
                            : "hover:bg-paper-100 dark:hover:bg-ink-800 text-ink-500 dark:text-paper-300"}"
                        aria-current={isActive( link.href ) ? "page" : undefined}
                        onclick={() => ( menuOpen = false )}
                    >
                        {link.label}
                    </a>
                </li>
            {/each}

            <li class="pt-2">
                <a
                    href={resolve( "/new" )}
                    class="bg-accent-700 hover:bg-accent-800 flex min-h-11 w-full items-center justify-center gap-2
                           rounded-lg px-4 text-sm font-medium text-white transition-colors"
                    onclick={() => ( menuOpen = false )}
                >
                    <Plus class="h-4 w-4" />
                    {m.common_new_entry()}
                </a>
            </li>
        </ul>
    </nav>
</Drawer>
