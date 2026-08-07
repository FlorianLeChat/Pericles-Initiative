<script lang="ts">
    /**
     * Horizontal bar chart.
     *
     * Bars are laid out with the grid rather than drawn in SVG: labels wrap,
     * the width follows the container, and there is no viewBox to keep in sync.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import type { Pathname } from "$app/types";
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
    {#each items as item ( item.key )}
        <li class="grid grid-cols-[minmax(6rem,10rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
            <span class="truncate">
                {#if href}
                    <a href={resolve( href( item ) )} class="hover:text-accent-600 dark:hover:text-accent-400"
                        >{item.label}</a
                    >
                {:else}
                    {item.label}
                {/if}
            </span>

            <span class="bg-paper-200 dark:bg-ink-800 h-2.5 overflow-hidden rounded-full">
                <span class="bg-accent-500 block h-full rounded-full" style="width: {( item.count / largest ) * 100}%"
                ></span>
            </span>

            <span class="text-ink-400 text-right font-mono text-xs">{item.count}</span>
        </li>
    {/each}
</ul>
