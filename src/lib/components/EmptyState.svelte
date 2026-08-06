<script lang="ts">
    /**
     * Placeholder shown when a listing has nothing to display.
     *
     * @author Claude
     */
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        description?: string;
        children?: Snippet;
    }

    let { title, description, children }: Props = $props();
</script>

<div class="border-paper-300 dark:border-ink-800 rounded-2xl border border-dashed px-6 py-14 text-center">
    <p class="text-lg font-medium">{title}</p>
    {#if description}
        <p class="text-ink-400 mx-auto mt-2 max-w-md text-sm leading-relaxed">{description}</p>
    {/if}
    {#if children}
        <div class="mt-5 flex justify-center gap-3">{@render children()}</div>
    {/if}
</div>
