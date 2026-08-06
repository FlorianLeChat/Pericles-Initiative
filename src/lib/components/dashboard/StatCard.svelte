<script lang="ts">
    /**
     * Single figure of the dashboard.
     *
     * @author Claude
     */
    interface Props {
        label: string;
        value: string | number;
        /** Short clarification shown under the figure. */
        hint?: string;
    }

    let { label, value, hint }: Props = $props();
</script>

<div class="surface p-5">
    <p class="text-ink-400 text-xs tracking-wide uppercase">{label}</p>
    <p class="mt-2 font-serif text-3xl font-semibold tracking-tight">{value}</p>
    {#if hint}
        <p class="text-ink-400 mt-1 text-xs leading-relaxed">{hint}</p>
    {/if}
</div>
