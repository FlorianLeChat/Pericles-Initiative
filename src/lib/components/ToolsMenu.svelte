<script lang="ts">
    /**
     * Dropdown of secondary tool links, shown in the desktop header.
     *
     * Owns its own open state and the click outside handling that closes it,
     * which is what keeps `SiteHeader.svelte` from having to know about either.
     *
     * @author Claude
     */
    import { cubicOut } from "svelte/easing";
    import { fly } from "svelte/transition";
    import { resolve } from "$app/paths";
    import type { NavLink } from "$lib/config/navigation";
    import Icon from "./Icon.svelte";

    interface Props {
        /** Links shown in the dropdown. */
        links: readonly NavLink[];
        /** Tells whether a link matches the current page. */
        isActive: ( href: string ) => boolean;
    }

    let { links, isActive }: Props = $props();

    const TOOLS
        = "M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3m7.5-12.99.75-1.3m-6.063 16.658.26-1.477m2.605-14.772.26-1.477m0 17.726-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205 12 12m6.894 5.785-1.149-.964M20.55 8.51l-1.41-.513";

    let open = $state( false );
    let container: HTMLDivElement | null = $state( null );

    /**
     * Closes the menu when the click landed outside of it.
     *
     * @param event Click event on the window.
     * @author Claude
     */
    const onWindowClick = ( event: MouseEvent ): void =>
    {
        if ( open && container && !container.contains( event.target as Node ) )
        {
            open = false;
        }
    };
</script>

<svelte:window onclick={onWindowClick} />

<div class="relative hidden lg:block" bind:this={container}>
    <button
        type="button"
        class="btn btn-ghost h-9 w-9 px-0"
        onclick={() => ( open = !open )}
        aria-expanded={open}
        aria-label="Outils"
        title="Outils"
    >
        <Icon path={TOOLS} class="h-[18px] w-[18px]" />
    </button>

    {#if open}
        <div
            class="surface absolute right-0 z-50 mt-2 w-52 origin-top-right p-1.5"
            transition:fly={{ y: -6, duration: 180, easing: cubicOut }}
        >
            <ul>
                {#each links as link ( link.href )}
                    <li>
                        <a
                            href={resolve( link.href )}
                            class="hover:bg-paper-100 dark:hover:bg-ink-800 block rounded-lg px-3 py-2 text-sm {isActive(
                                link.href
                            )
                                ? "text-accent-600 dark:text-accent-400 font-medium"
                                : ""}"
                            onclick={() => ( open = false )}
                        >
                            {link.label}
                        </a>
                    </li>
                {/each}
            </ul>
        </div>
    {/if}
</div>
