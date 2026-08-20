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
    import Menu from "@lucide/svelte/icons/menu";
    import Plus from "@lucide/svelte/icons/plus";
    import Search from "@lucide/svelte/icons/search";
    import X from "@lucide/svelte/icons/x";
    import Drawer from "flowbite-svelte/Drawer.svelte";
    import Kbd from "flowbite-svelte/Kbd.svelte";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import { NAV_LINKS, TOOL_LINKS } from "$lib/config/navigation";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import ThemeToggle from "./ThemeToggle.svelte";
    import ToolsMenu from "./ToolsMenu.svelte";

    interface Props {
        /** Opens the search palette. */
        onsearch: () => void;
    }

    let { onsearch }: Props = $props();

    let menuOpen = $state( false );

    const monogram = $derived( wiki.meta.universe.trim().charAt( 0 ).toUpperCase() || "Π" );

    /**
     * Tells whether a navigation link matches the current page.
     *
     * Every link already ends in a slash, since the layout asks for one, so a
     * prefix test is enough to light «Encyclopédie» up on an article and needs no
     * separator of its own. Appending one here would look for `/wiki//`.
     *
     * @param href Link target, ending in a slash.
     * @returns True when the link should be highlighted.
     * @author Claude
     */
    const isActive = ( href: string ): boolean => page.url.pathname.startsWith( href );
</script>

<header
    id="site-header"
    class="border-paper-200 dark:border-ink-800 dark:bg-ink-950/80 sticky top-0 z-40 border-b bg-white/85 backdrop-blur"
>
    <div class="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <a href={resolve( "/" )} class="group flex min-w-0 items-center gap-2.5">
            {#if wiki.meta.logo}
                <img
                    src={wiki.meta.logo}
                    alt=""
                    class="h-9 w-9 shrink-0 rounded-xl object-cover transition duration-200 group-hover:scale-105"
                    width="36"
                    height="36"
                />
            {:else}
                <span
                    class="bg-accent-600 grid h-9 w-9 shrink-0 place-items-center rounded-xl font-serif text-lg font-semibold text-white transition duration-200 group-hover:scale-105"
                    aria-hidden="true"
                >
                    {monogram}
                </span>
            {/if}

            <span class="min-w-0">
                <span class="block truncate text-sm leading-tight font-semibold tracking-tight">
                    {wiki.meta.universe}
                </span>

                <span class="text-muted hidden truncate text-xs leading-tight sm:block">{m.common_encyclopedia_tagline()}</span>
            </span>
        </a>

        <nav class="ml-4 hidden items-center gap-1 lg:flex" aria-label={m.site_header_nav_main_aria()}>
            {#each NAV_LINKS as link ( link.href )}
                <a
                    href={resolve( link.href )}
                    class="rounded-full px-3 py-1.5 text-sm font-medium transition {isActive( link.href )
                        ? "bg-paper-200 text-ink-900 dark:bg-ink-800 dark:text-paper-100"
                        : "text-ink-500 hover:bg-paper-100 dark:text-paper-300 dark:hover:bg-ink-800/60"}"
                    aria-current={isActive( link.href ) ? "page" : undefined}
                >
                    {link.label}
                </a>
            {/each}
        </nav>

        <div class="ml-auto flex items-center gap-1.5">
            <button
                type="button"
                class="border-paper-300 text-muted hover:border-accent-400 hover:text-accent-600 dark:border-ink-800
                       dark:hover:text-accent-400 hidden h-9 items-center gap-2 rounded-full border px-3
                       text-sm leading-none transition lg:flex"
                onclick={onsearch}
            >
                <Search class="h-4 w-4" />

                <span>{m.common_search()}</span>

                <Kbd class="ml-2 px-1.5 py-0.5 font-sans text-[10px] leading-none font-normal">{m.site_header_shortcut_label()}</Kbd>
            </button>

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
                class="bg-accent-600 hover:bg-accent-700 hidden h-9 items-center gap-2 rounded-full px-3.5 text-sm
                       leading-none font-medium text-white shadow-sm transition lg:inline-flex"
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
                        class="hover:bg-paper-100 dark:hover:bg-ink-800 flex min-h-11 items-center rounded-xl px-3
                               text-sm font-medium"
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
                        class="hover:bg-paper-100 dark:hover:bg-ink-800 text-ink-500 dark:text-paper-300 flex min-h-11
                               items-center rounded-xl px-3 text-sm"
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
                    class="bg-accent-600 hover:bg-accent-700 flex min-h-11 w-full items-center justify-center gap-2
                           rounded-full px-4 text-sm font-medium text-white shadow-sm transition"
                    onclick={() => ( menuOpen = false )}
                >
                    <Plus class="h-4 w-4" />
                    {m.common_new_entry()}
                </a>
            </li>
        </ul>
    </nav>
</Drawer>
