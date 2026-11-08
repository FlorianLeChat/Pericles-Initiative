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
    import LiveItem from "./LiveItem.svelte";
    import Pin from "@lucide/svelte/icons/pin";
    import { fly, slide } from "svelte/transition";
    import type { LiveEntry } from "#lib/types.ts";
    import { staggerDelay } from "#lib/config/motion.ts";

    interface Props {
        /** Section title, shown above the items. */
        heading: string;
        /** Identifier of the heading, the target of the index beside the feed. */
        anchor: string;
        /** Marks the group of pinned items with a pin beside its heading. */
        pinned?: boolean;
        /** Items of this group, most recent first. */
        items: LiveEntry[];
        /** Loads an item into the composer, absent when the items cannot be edited. */
        onedit?: ( item: LiveEntry ) => void;
        /** Asks for an item to be removed, absent when the items cannot be removed. */
        ondelete?: ( item: LiveEntry ) => void;
    }

    let { heading, anchor, pinned = false, items, onedit, ondelete }: Props = $props();
</script>

<section class="mt-10">
    <h2
        id={anchor}
        class="section-heading border-paper-200 dark:border-ink-700 flex scroll-mt-24 items-center gap-2 border-b pb-2"
    >
        {#if pinned}
            <Pin class="text-ink-500 dark:text-paper-400 h-4.5 w-4.5" aria-hidden="true" />
        {/if}
        {heading}
    </h2>

    <div class="divide-paper-200 dark:divide-ink-700 divide-y">
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
