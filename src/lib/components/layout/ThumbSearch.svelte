<script lang="ts">
    /**
     * Search bar at the foot of the screen, for a phone that only reads.
     *
     * A player consulting the wiki at the table holds the phone in one hand, and
     * every control of the header sits at the top of the screen, out of reach of
     * the thumb. On a device set to read only, below `lg`, searching is nearly the
     * whole use of the site, so the search leaves the header for a full width
     * pill at the foot, over a hairline and an opaque ground, clear of the home
     * indicator through the safe area inset. A device that writes keeps the
     * header as it is: it has a new page button and a menu to reach anyway.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import Search from "@lucide/svelte/icons/search";

    interface Props {
        /** Opens the search palette. */
        onsearch: () => void;
    }

    let { onsearch }: Props = $props();
</script>

<div
    class="border-paper-200 dark:border-ink-700 dark:bg-ink-950 fixed inset-x-0 bottom-0 z-40 border-t bg-white px-4 pt-3
           pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
>
    <button
        type="button"
        class="bg-paper-100 text-muted hover:bg-paper-200 dark:bg-ink-900 dark:hover:bg-ink-800 flex h-11 w-full
               items-center gap-2.5 rounded-full px-4 text-sm leading-none transition-colors"
        onclick={onsearch}
    >
        <Search class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="flex-1 text-left">{m.common_search()}</span>
    </button>
</div>
