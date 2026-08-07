<script lang="ts">
    /**
     * Edition activity over the last months, as a small column chart.
     *
     * @author Claude
     */
    import type { ActivityPoint } from "$lib/utilities/stats";

    interface Props {
        points: ActivityPoint[];
    }

    let { points }: Props = $props();

    const largest = $derived( Math.max( 1, ...points.map( ( point ) => point.count ) ) );
</script>

<div class="flex items-end gap-1.5" role="img" aria-label="Activité d'édition des douze derniers mois">
    {#each points as point ( point.month )}
        <div class="flex flex-1 flex-col items-center gap-1.5">
            <span class="text-ink-400 font-mono text-[10px]">{point.count > 0 ? point.count : ""}</span>

            <span
                class="bg-paper-200 dark:bg-ink-800 flex w-full items-end overflow-hidden rounded-md"
                style="height: 4.5rem"
                title="{point.label} : {point.count}"
            >
                <span
                    class="bg-accent-500 block w-full rounded-md"
                    style="height: {point.count === 0 ? 2 : ( point.count / largest ) * 100}%"
                ></span>
            </span>

            <span class="text-ink-400 text-[10px]">{point.label}</span>
        </div>
    {/each}
</div>
