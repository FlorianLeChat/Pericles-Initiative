<script lang="ts">
    /**
     * Placeholder shown when a listing has nothing to display.
     *
     * The title is a real heading rather than a styled paragraph: an empty wiki
     * is the ordinary state of this site, so this block is what most pages
     * actually offer, and it has to appear in the outline like anything else.
     *
     * @author Claude
     */
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        description?: string;
        level?: 2 | 3;
        children?: Snippet;
    }

    let { title, description, level = 2, children }: Props = $props();
</script>

<div class="border-paper-300 dark:border-ink-800 rise-in rounded-2xl border border-dashed px-6 py-14 text-center">
    <svelte:element this={level === 2 ? "h2" : "h3"} class="text-lg font-medium">
        {title}
    </svelte:element>

    {#if description}
        <p class="text-muted mx-auto mt-2 max-w-md text-sm leading-relaxed">{description}</p>
    {/if}

    {#if children}
        <div class="mt-5 flex flex-wrap justify-center gap-3">{@render children()}</div>
    {/if}
</div>
