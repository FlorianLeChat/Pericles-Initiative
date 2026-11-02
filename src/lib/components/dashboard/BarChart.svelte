<script lang="ts">
    /**
     * Horizontal bar chart.
     *
     * Bars are laid out with the grid rather than drawn in SVG: labels wrap, the
     * width follows the container, and there is no viewBox to keep in sync. It
     * also means the chart is made of real text, so the label and the figure are
     * read out as they stand and nothing has to be restated for a screen reader.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import type { Path } from "$app/types";
    import { staggerRank } from "#lib/config/motion.ts";
    import type { CountByKey } from "#lib/utilities/stats.ts";

    interface Props {
        items: CountByKey[];
        /** Optional link target per item. */
        href?: ( item: CountByKey ) => Path;
        /** Optional background class per bar, such as the fixed hue of a category. */
        tint?: ( item: CountByKey ) => string;
    }

    /** Bars carry no meaning of their own colour, so they are drawn in ink rather than in the accent. */
    const NEUTRAL_BAR = "bg-ink-400 dark:bg-paper-400";

    let { items, href, tint }: Props = $props();

    const largest = $derived( Math.max( 1, ...items.map( ( item ) => item.count ) ) );
</script>

<ul class="space-y-2.5">
    {#each items as item, index ( item.key )}
        <li
            class="grid grid-cols-[minmax(4.5rem,7rem)_minmax(0,1fr)_1.75rem] items-center gap-2 text-sm
                   sm:grid-cols-[minmax(6rem,10rem)_minmax(0,1fr)_2.5rem] sm:gap-3"
        >
            <span class="truncate">
                {#if href}
                    <a href={resolve( href( item ) )} class="wiki-link">
                        {item.label}
                    </a>
                {:else}
                    {item.label}
                {/if}
            </span>

            <span class="bg-paper-200 dark:bg-ink-800 h-2.5 overflow-hidden rounded-full">
                <span
                    class="grow-x block h-full rounded-full {tint?.( item ) ?? NEUTRAL_BAR}"
                    style="width: {( item.count / largest ) * 100}%; --rank: {staggerRank( index )}"
                ></span>
            </span>

            <span class="text-muted text-right text-xs tabular-nums">{item.count}</span>
        </li>
    {/each}
</ul>
