<script lang="ts">
    /**
     * Edition activity over the last months, as a small column chart.
     *
     * Twelve columns do not fit across a phone, so the chart lies down instead of
     * scrolling: below `sm` each month is a row, label, bar and figure, and from
     * `sm` up it stands back up as the strip of columns. Nothing overflows at any
     * width, which is what keeps the chart out of a scrolling container: such a
     * container has to be focusable to be reachable without a mouse, and a tab
     * stop on a graphic is a stop the reader gains nothing from.
     *
     * Standing, a column has no track behind it, only a hairline at its foot, so
     * a month with nothing edited reads as a low mark on the baseline: a full
     * height pale track behind every column made eleven empty months of a young
     * wiki look like eleven bars. Lying down on a phone, the track stays, a row
     * being read along its length rather than compared by height.
     *
     * The figures are plain text, above and below each column, so this reads as a
     * list of months and counts without anything being restated for a screen
     * reader. That is why it carries no `img` role: one would replace all of that
     * with a single label.
     *
     * @author Claude
     */
    import { staggerRank } from "#lib/config/motion.ts";
    import type { ActivityPoint } from "#lib/utilities/stats.ts";

    interface Props {
        points: ActivityPoint[];
    }

    let { points }: Props = $props();

    /** Length given to an empty month, so it reads as a bar at zero rather than as nothing. */
    const EMPTY_LENGTH = 2;

    const largest = $derived( Math.max( 1, ...points.map( ( point ) => point.count ) ) );

    /**
     * Length of the bar of a month, as a percentage of the longest one.
     *
     * @param count Pages edited that month.
     * @returns The length, ready for the `--length` custom property.
     * @author Claude
     */
    const barLength = ( count: number ): string => `${ count === 0 ? EMPTY_LENGTH : ( count / largest ) * 100 }%`;
</script>

<ul class="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:gap-1.5">
    {#each points as point, index ( point.month )}
        <li class="flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-1.5">
            <span class="text-muted w-12 shrink-0 text-xs whitespace-nowrap sm:order-last sm:w-auto">
                {point.label}
            </span>

            <span
                class="bg-paper-200 dark:bg-ink-800 border-paper-300 dark:border-ink-700 h-2.5 flex-1 overflow-hidden
                       rounded-md sm:order-none sm:flex sm:h-[4.5rem] sm:w-full sm:flex-none sm:items-end sm:rounded-none
                       sm:border-b sm:bg-transparent sm:dark:bg-transparent"
            >
                <span
                    class="bg-ink-400 dark:bg-paper-400 chart-column rounded-md"
                    style="--length: {barLength( point.count )}; --rank: {staggerRank( index )}"
                ></span>
            </span>

            <span class="text-muted w-6 shrink-0 text-right text-xs sm:order-first sm:w-auto">
                {#if point.count > 0}
                    {point.count}
                {:else}
                    <span class="sr-only">0</span>
                {/if}
            </span>
        </li>
    {/each}
</ul>
