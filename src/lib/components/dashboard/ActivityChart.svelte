<script lang="ts">
    /**
     * Edition activity over the last months, as a small column chart.
     *
     * Twelve columns do not fit across a phone: flattened to the width of one
     * they gave labels a couple of characters wide, overlapping each other. Each
     * column is given the room it needs instead and the strip scrolls sideways,
     * so a month stays legible at every size.
     *
     * The figures are plain text, above and below each column, so this reads as a
     * list of months and counts without anything being restated for a screen
     * reader. That is why it carries no `img` role: one would replace all of that
     * with a single label.
     *
     * @author Claude
     */
    import { staggerRank } from "$lib/config/motion";
    import type { ActivityPoint } from "$lib/utilities/stats";

    interface Props {
        points: ActivityPoint[];
    }

    let { points }: Props = $props();

    /** Room one month needs for its column and its label to stay readable. */
    const COLUMN_WIDTH = 44;

    const largest = $derived( Math.max( 1, ...points.map( ( point ) => point.count ) ) );
    const minimumWidth = $derived( `${ points.length * COLUMN_WIDTH }px` );
</script>

<!--
    Focusable and named, because a strip that scrolls sideways and cannot be
    reached by the keyboard is unreachable without a mouse.

    The rule against a tab stop on something non interactive is right in general
    and wrong for a scroll container, which is the one case where the guidelines
    ask for exactly this.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="overflow-x-auto" tabindex="0" role="group" aria-label="Fiches modifiées par mois">
    <ul class="flex items-end gap-1.5" style="min-width: {minimumWidth}">
        {#each points as point, index ( point.month )}
            <li class="flex flex-1 flex-col items-center gap-1.5">
                <span class="text-muted font-mono text-[10px]">{point.count > 0 ? point.count : ""}</span>

                <span
                    class="bg-paper-200 dark:bg-ink-800 flex w-full items-end overflow-hidden rounded-md"
                    style="height: 4.5rem"
                >
                    <span
                        class="bg-accent-500 grow-y block w-full rounded-md"
                        style="height: {point.count === 0 ? 2 : ( point.count / largest ) * 100}%; --rank: {staggerRank(
                            index
                        )}"
                    ></span>
                </span>

                <span class="text-muted text-[10px] whitespace-nowrap">{point.label}</span>
            </li>
        {/each}
    </ul>
</div>
