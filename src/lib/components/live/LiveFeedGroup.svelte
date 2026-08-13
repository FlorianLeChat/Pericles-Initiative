<script lang="ts">
    /**
     * One heading and its items in the live feed: either the pinned entries or one day.
     *
     * Carries the entrance and reorder motion so `live/+page.svelte` does not have
     * to repeat it once per group.
     *
     * @author Claude
     */
    import { flip } from "svelte/animate";
    import { cubicOut } from "svelte/easing";
    import { fly, slide } from "svelte/transition";
    import { staggerDelay } from "$lib/config/motion";
    import type { LiveEntry } from "$lib/types";
    import LiveItem from "./LiveItem.svelte";

    interface Props {
        /** Section title, shown above the items. */
        heading: string;
        /** Items of this group, most recent first. */
        items: LiveEntry[];
        /** Loads an item into the composer. */
        onedit: ( item: LiveEntry ) => void;
        /** Asks for an item to be removed. */
        ondelete: ( item: LiveEntry ) => void;
    }

    let { heading, items, onedit, ondelete }: Props = $props();
</script>

<section class="mt-10">
    <h2 class="text-muted mb-4 text-xs tracking-[0.15em] uppercase">{heading}</h2>

    <div class="border-paper-200 dark:border-ink-800 space-y-8 border-l">
        {#each items as item, index ( item.id )}
            <div
                animate:flip={{ duration: 260, easing: cubicOut }}
                in:fly={{ y: 12, duration: 260, delay: staggerDelay( index ), easing: cubicOut }}
                out:slide={{ duration: 200, easing: cubicOut }}
            >
                <LiveItem {item} {onedit} {ondelete} />
            </div>
        {/each}
    </div>
</section>
