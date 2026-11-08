<script lang="ts">
    /**
     * Horizontal bar chart.
     *
     * Bars are laid out with the grid rather than drawn in SVG: labels wrap, the
     * width follows the container, and there is no viewBox to keep in sync. It
     * also means the chart is made of real text, so the label and the figure are
     * read out as they stand and nothing has to be restated for a screen reader.
     *
     * The figure counts every page, drafts included, since the dashboard is the
     * author's view; a bar holding drafts says how many beside its label, in the
     * label column rather than on a line under the bar, so the list keeps one
     * rhythm and never contradicts the published count a reader sees on
     * `/categories`. With a target, the label is drawn in ink and the whole row
     * is its link.
     *
     * On a phone the label takes a line of its own above the bar rather than a
     * truncated column beside it: «Guilds and offi…» named nothing, and the bar
     * keeps the whole width for its length.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import type { Path } from "$app/types";
    import * as m from "#lib/locales/messages.js";
    import { staggerRank } from "#lib/config/motion.ts";
    import { TOUCH_HEIGHT } from "#lib/config/forms.ts";
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
            class="relative grid grid-cols-[minmax(0,1fr)_1.75rem] items-center gap-x-2 text-sm
                   sm:grid-cols-[minmax(6rem,14rem)_minmax(0,1fr)_2.5rem] sm:gap-3"
        >
            <span class="col-span-2 flex min-w-0 items-baseline gap-2 sm:col-span-1">
                {#if href}
                    <a
                        href={resolve( href( item ) )}
                        class="row-link stretched-link block min-w-0 content-center sm:truncate {TOUCH_HEIGHT}"
                    >
                        {item.label}
                    </a>
                {:else}
                    <span class="min-w-0 sm:truncate">{item.label}</span>
                {/if}

                {#if item.drafts > 0}
                    <span class="text-muted shrink-0 text-xs">{m.dashboard_category_drafts( { count: item.drafts } )}</span>
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
