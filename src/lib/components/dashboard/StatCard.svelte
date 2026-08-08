<script lang="ts">
    /**
     * Single figure of the dashboard.
     *
     * @author Claude
     */
    import { staggerRank } from "$lib/config/motion";

    interface Props {
        label: string;
        value: string | number;
        /** Short clarification shown under the figure. */
        hint?: string;
        /** Position in the row of figures, which offsets the entrance animation. */
        index?: number;
    }

    let { label, value, hint, index = 0 }: Props = $props();
</script>

<div class="surface rise-in p-5" style="--rank: {staggerRank( index )}">
    <p class="text-ink-400 text-xs tracking-wide uppercase">{label}</p>
    <p class="mt-2 font-serif text-3xl font-semibold tracking-tight">{value}</p>

    {#if hint}
        <p class="text-ink-400 mt-1 text-xs leading-relaxed">{hint}</p>
    {/if}
</div>
