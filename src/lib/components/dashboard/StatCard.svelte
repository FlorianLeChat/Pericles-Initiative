<script lang="ts">
    /**
     * One cell of the dashboard summary row: a muted label, a figure, an optional hint.
     *
     * It renders a `div` grouping a `dt` and its `dd`, so it belongs directly inside a `<dl>`.
     *
     * @author Claude
     */
    interface Props {
        label: string;
        value: string | number;
        /** Short clarification shown beside the figure. */
        hint?: string;
    }

    let { label, value, hint }: Props = $props();
</script>

<div class="dark:bg-ink-950 bg-white px-4 py-3">
    <dt class="text-muted text-sm">{label}</dt>

    <dd class="text-ink-900 dark:text-paper-100 mt-0.5 text-lg font-semibold">{value}</dd>

    {#if hint}
        <dd class="text-muted text-xs">{hint}</dd>
    {/if}
</div>
