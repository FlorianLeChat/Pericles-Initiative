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
    import type { Pathname } from "$app/types";
    import { staggerRank } from "$lib/config/motion";
    import type { CountByKey } from "$lib/utilities/stats";

    interface Props {
        items: CountByKey[];
        /** Optional link target per item. */
        href?: ( item: CountByKey ) => Pathname;
    }

    let { items, href }: Props = $props();

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
                    <a href={resolve( href( item ) )} class="hover:text-accent-600 dark:hover:text-accent-400">
                        {item.label}
                    </a>
                {:else}
                    {item.label}
                {/if}
            </span>

            <span class="bg-paper-200 dark:bg-ink-800 h-2.5 overflow-hidden rounded-full">
                <span
                    class="bg-accent-500 grow-x block h-full rounded-full"
                    style="width: {( item.count / largest ) * 100}%; --rank: {staggerRank( index )}"
                ></span>
            </span>

            <span class="text-muted text-right font-mono text-xs">{item.count}</span>
        </li>
    {/each}
</ul>
