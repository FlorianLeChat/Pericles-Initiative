<script lang="ts">
    /**
     * Sticky header: identity, main navigation, tools, search and theme.
     *
     * @author Claude
     */
    import { cubicOut } from "svelte/easing";
    import { slide } from "svelte/transition";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import { NAV_LINKS, TOOL_LINKS } from "$lib/config/navigation";
    import { wiki } from "$lib/state/wiki.svelte";
    import Icon from "./Icon.svelte";
    import ThemeToggle from "./ThemeToggle.svelte";
    import ToolsMenu from "./ToolsMenu.svelte";

    interface Props {
        /** Opens the search palette. */
        onsearch: () => void;
    }

    let { onsearch }: Props = $props();

    const SEARCH = "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z";
    const MENU = "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5";
    const CLOSE = "M6 18 18 6M6 6l12 12";
    const PLUS = "M12 4.5v15m7.5-7.5h-15";

    let menuOpen = $state( false );

    const monogram = $derived( wiki.meta.universe.trim().charAt( 0 ).toUpperCase() || "Π" );

    /**
     * Tells whether a navigation link matches the current page.
     *
     * @param href Link target.
     * @returns True when the link should be highlighted.
     * @author Claude
     */
    const isActive = ( href: string ): boolean => page.url.pathname === href || page.url.pathname.startsWith( `${ href }/` );
</script>

<header
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

                <span class="text-muted hidden truncate text-xs leading-tight sm:block">Encyclopédie</span>
            </span>
        </a>

        <nav class="ml-4 hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
            {#each NAV_LINKS as link ( link.href )}
                <a
                    href={resolve( link.href )}
                    class="rounded-full px-3 py-1.5 text-sm font-medium transition {isActive( link.href )
                        ? "bg-paper-200 text-ink-900 dark:bg-ink-800 dark:text-paper-100"
                        : "text-ink-500 hover:bg-paper-100 dark:text-paper-300 dark:hover:bg-ink-800/60"}"
                >
                    {link.label}
                </a>
            {/each}
        </nav>

        <div class="ml-auto flex items-center gap-1.5">
            <button
                type="button"
                class="border-paper-300 text-muted hover:border-accent-400 hover:text-accent-600 dark:border-ink-800 dark:hover:text-accent-400 hidden h-9 items-center gap-2 rounded-full border px-3 text-sm leading-none transition sm:flex"
                onclick={onsearch}
            >
                <Icon path={SEARCH} class="h-4 w-4" />

                <span>Rechercher</span>

                <kbd
                    class="border-paper-300 dark:border-ink-700 ml-2 rounded border px-1.5 py-0.5 font-sans text-[10px] leading-none"
                >
                    Ctrl K
                </kbd>
            </button>

            <button
                type="button"
                class="btn btn-ghost h-9 w-9 px-0 sm:hidden"
                onclick={onsearch}
                aria-label="Rechercher"
            >
                <Icon path={SEARCH} class="h-[18px] w-[18px]" />
            </button>

            <a href={resolve( "/new" )} class="btn btn-primary hidden h-9 px-3.5 sm:inline-flex">
                <Icon path={PLUS} class="h-4 w-4" />
                Nouvelle fiche
            </a>

            <div class="border-paper-200 dark:border-ink-800 ml-1 flex items-center gap-1 border-l pl-1.5">
                <ToolsMenu links={TOOL_LINKS} {isActive} />

                <ThemeToggle />
            </div>

            <button
                type="button"
                class="btn btn-ghost h-9 w-9 px-0 lg:hidden"
                onclick={() => ( menuOpen = !menuOpen )}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-label="Ouvrir la navigation"
            >
                <Icon path={menuOpen ? CLOSE : MENU} class="h-[18px] w-[18px]" />
            </button>
        </div>
    </div>

    {#if menuOpen}
        <nav
            id="mobile-nav"
            class="border-paper-200 dark:border-ink-800 border-t px-4 py-3 lg:hidden"
            aria-label="Navigation mobile"
            transition:slide={{ duration: 220, easing: cubicOut }}
        >
            <ul class="space-y-1">
                {#each NAV_LINKS as link ( link.href )}
                    <li>
                        <a
                            href={resolve( link.href )}
                            class="hover:bg-paper-100 dark:hover:bg-ink-800 block rounded-xl px-3 py-2 text-sm font-medium"
                            onclick={() => ( menuOpen = false )}
                        >
                            {link.label}
                        </a>
                    </li>
                {/each}
            </ul>

            <p class="text-muted mt-3 px-3 text-xs tracking-wide uppercase">Outils</p>

            <ul class="mt-1 space-y-1">
                {#each TOOL_LINKS as link ( link.href )}
                    <li>
                        <a
                            href={resolve( link.href )}
                            class="hover:bg-paper-100 dark:hover:bg-ink-800 text-ink-500 dark:text-paper-300 block rounded-xl px-3 py-2 text-sm"
                            onclick={() => ( menuOpen = false )}
                        >
                            {link.label}
                        </a>
                    </li>
                {/each}

                <li class="pt-2">
                    <a href={resolve( "/new" )} class="btn btn-primary w-full" onclick={() => ( menuOpen = false )}>
                        <Icon path={PLUS} class="h-4 w-4" />
                        Nouvelle fiche
                    </a>
                </li>
            </ul>
        </nav>
    {/if}
</header>
