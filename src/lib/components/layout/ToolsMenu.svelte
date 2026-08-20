<script lang="ts">
    /**
     * Dropdown of secondary tool links, shown in the desktop header.
     *
     * Flowbite positions the panel with floating-ui and paints it through the
     * native popover api, so it lives in the top layer: the click outside, the
     * `Échap` key and the repositioning that used to be written here are all its
     * job now. What is still ours is `aria-expanded` on the trigger, which the
     * library does not set, and which is the only thing telling a screen reader
     * that the button opens something.
     *
     * The panel is declared as a menu of links. Flowbite only accepts a role
     * from a fixed list, whose default is `tooltip`, and a tooltip holding
     * navigation is the one thing this must not claim to be. `menu` is the
     * honest member of that list, which is why the links are rendered directly
     * rather than through `DropdownItem`: that component wraps each one in a
     * list item, and a menu whose children are list items rather than menu items
     * is an invalid tree.
     *
     * Three of Flowbite's own choices are overridden on the panel, and the first
     * is not cosmetic. The panel is painted through the popover api, and the
     * browser's own stylesheet resets `color` on anything in the top layer, so an
     * inherited text colour never arrives: without a colour set here the entries
     * come out pure black, unreadable once the dark theme is on. The radius and
     * the dividers are taste, matching the surfaces and the menus the site had
     * before.
     *
     * `triggerDelay` and `transitionParams` are both forced to zero. Flowbite's
     * `Popper` debounces every open and close by `triggerDelay`, two hundred
     * milliseconds by default, so a click felt like it needed a second one, and
     * fades the panel in and out on top of that. A settings menu is not read
     * while it moves, so both are switched off rather than shortened.
     *
     * @author Claude
     */
    import Settings2 from "@lucide/svelte/icons/settings-2";
    import Dropdown from "flowbite-svelte/Dropdown.svelte";
    import { resolve } from "$app/paths";
    import type { NavLink } from "$lib/config/navigation";
    import * as m from "$lib/locales/messages.js";

    interface Props {
        /** Links shown in the dropdown. */
        links: readonly NavLink[];
        /** Tells whether a link matches the current page. */
        isActive: ( href: string ) => boolean;
    }

    let { links, isActive }: Props = $props();

    let open = $state( false );
</script>

<div class="hidden lg:block">
    <button
        type="button"
        class="text-ink-600 hover:bg-paper-200 dark:text-paper-300 dark:hover:bg-ink-800 inline-flex h-9 w-9
               items-center justify-center rounded-full transition"
        aria-expanded={open}
        aria-label={m.common_tools_label()}
    >
        <Settings2 class="h-4.5 w-4.5" />
    </button>

    <Dropdown
        bind:isOpen={open}
        role="menu"
        placement="bottom-end"
        triggerDelay={0}
        transitionParams={{ duration: 0 }}
        class="surface text-ink-800 dark:text-paper-200 z-50 w-52 divide-y-0 rounded-2xl p-1.5"
    >
        {#each links as link ( link.href )}
            <a
                href={resolve( link.href )}
                role="menuitem"
                class="hover:bg-paper-100 dark:hover:bg-ink-800 flex min-h-10 items-center rounded-lg px-3 text-sm
                       {isActive( link.href ) ? "text-accent-600 dark:text-accent-400 font-medium" : ""}"
                aria-current={isActive( link.href ) ? "page" : undefined}
                onclick={() => ( open = false )}
            >
                {link.label}
            </a>
        {/each}
    </Dropdown>
</div>
