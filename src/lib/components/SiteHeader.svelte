<script lang="ts">
    /**
     * Sticky header: identity, main navigation, tools, search and theme.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import { NAV_LINKS, TOOL_LINKS } from "$lib/config/navigation";
    import { wiki } from "$lib/state/wiki.svelte";
    import Icon from "./Icon.svelte";
    import ThemeToggle from "./ThemeToggle.svelte";

    interface Props {
        /** Opens the search palette. */
        onsearch: () => void;
    }

    let { onsearch }: Props = $props();

    const SEARCH = "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z";
    const MENU = "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5";
    const CLOSE = "M6 18 18 6M6 6l12 12";
    const PLUS = "M12 4.5v15m7.5-7.5h-15";
    const TOOLS
        = "M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3m7.5-12.99.75-1.3m-6.063 16.658.26-1.477m2.605-14.772.26-1.477m0 17.726-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205 12 12m6.894 5.785-1.149-.964M20.55 8.51l-1.41-.513";

    let menuOpen = $state( false );
    let toolsOpen = $state( false );
    let toolsContainer: HTMLDivElement | null = $state( null );

    const monogram = $derived( wiki.meta.universe.trim().charAt( 0 ).toUpperCase() || "Π" );

    /**
     * Tells whether a navigation link matches the current page.
     *
     * @param href Link target.
     * @returns True when the link should be highlighted.
     * @author Claude
     */
    const isActive = ( href: string ): boolean => page.url.pathname === href || page.url.pathname.startsWith( `${ href }/` );

    /**
     * Closes the tools menu when the click landed outside of it.
     *
     * @param event Click event on the window.
     * @author Claude
     */
    const onWindowClick = ( event: MouseEvent ): void =>
    {
        if ( toolsOpen && toolsContainer && !toolsContainer.contains( event.target as Node ) )
        {
            toolsOpen = false;
        }
    };
</script>

<svelte:window onclick={onWindowClick} />

<header
    class="border-paper-200 dark:border-ink-800 dark:bg-ink-950/80 sticky top-0 z-40 border-b bg-white/85 backdrop-blur"
>
    <div class="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <a href={resolve( "/" )} class="group flex min-w-0 items-center gap-2.5">
            {#if wiki.meta.logo}
                <img
                    src={wiki.meta.logo}
                    alt=""
                    class="h-9 w-9 shrink-0 rounded-xl object-cover"
                    width="36"
                    height="36"
                />
            {:else}
                <span
                    class="bg-accent-600 grid h-9 w-9 shrink-0 place-items-center rounded-xl font-serif text-lg font-semibold text-white"
                    aria-hidden="true"
                >
                    {monogram}
                </span>
            {/if}

            <span class="min-w-0">
                <span class="block truncate text-sm leading-tight font-semibold tracking-tight">
                    {wiki.meta.universe}
                </span>

                <span class="text-ink-400 hidden truncate text-xs leading-tight sm:block">Encyclopédie</span>
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
                class="border-paper-300 text-ink-400 hover:border-accent-400 hover:text-accent-600 dark:border-ink-800 dark:hover:text-accent-400 hidden items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition sm:flex"
                onclick={onsearch}
            >
                <Icon path={SEARCH} class="h-4 w-4" />

                <span>Rechercher</span>

                <kbd
                    class="border-paper-300 dark:border-ink-700 ml-2 rounded border px-1.5 py-0.5 font-sans text-[10px]"
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

            <div class="relative hidden lg:block" bind:this={toolsContainer}>
                <button
                    type="button"
                    class="btn btn-ghost h-9 w-9 px-0"
                    onclick={() => ( toolsOpen = !toolsOpen )}
                    aria-expanded={toolsOpen}
                    aria-label="Outils"
                    title="Outils"
                >
                    <Icon path={TOOLS} class="h-[18px] w-[18px]" />
                </button>

                {#if toolsOpen}
                    <div class="surface absolute right-0 z-50 mt-2 w-52 p-1.5">
                        <ul>
                            {#each TOOL_LINKS as link ( link.href )}
                                <li>
                                    <a
                                        href={resolve( link.href )}
                                        class="hover:bg-paper-100 dark:hover:bg-ink-800 block rounded-lg px-3 py-2 text-sm {isActive(
                                            link.href
                                        )
                                            ? "text-accent-600 dark:text-accent-400 font-medium"
                                            : ""}"
                                        onclick={() => ( toolsOpen = false )}
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </div>

            <a href={resolve( "/new" )} class="btn btn-primary hidden px-3.5 py-1.5 sm:inline-flex">
                <Icon path={PLUS} class="h-4 w-4" />
                Nouvelle fiche
            </a>

            <ThemeToggle />

            <button
                type="button"
                class="btn btn-ghost h-9 w-9 px-0 lg:hidden"
                onclick={() => ( menuOpen = !menuOpen )}
                aria-expanded={menuOpen}
                aria-label="Ouvrir la navigation"
            >
                <Icon path={menuOpen ? CLOSE : MENU} class="h-[18px] w-[18px]" />
            </button>
        </div>
    </div>

    {#if menuOpen}
        <nav class="border-paper-200 dark:border-ink-800 border-t px-4 py-3 lg:hidden" aria-label="Navigation mobile">
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

            <p class="text-ink-400 mt-3 px-3 text-xs tracking-wide uppercase">Outils</p>

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
