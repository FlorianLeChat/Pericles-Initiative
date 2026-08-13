<script lang="ts">
    /**
     * Header of a section page: what the page is about, and what it lets you do.
     *
     * The action belongs here rather than in each page so that every section puts
     * it in the same place: beside the title on a wide screen, under the
     * introduction and full width on a phone. Written by hand page after page,
     * that slot drifted, and a reader who had found «Nouvelle fiche» in the
     * corner of the encyclopedia had to look for the equivalent elsewhere on the
     * next section.
     *
     * @author Claude
     */
    import type { Snippet } from "svelte";
    import { ACTION_ROW } from "$lib/config/forms";

    interface Props {
        title: string;
        /** Line above the title, such as the pulsing marker of the live feed. */
        eyebrow?: Snippet;
        /** A sentence or two under the title. */
        description?: Snippet;
        /** Actions of the page, laid out by `ACTION_ROW`. */
        action?: Snippet;
    }

    let { title, eyebrow, description, action }: Props = $props();
</script>

<header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
    <div class="max-w-2xl">
        {#if eyebrow}
            <div class="mb-3">{@render eyebrow()}</div>
        {/if}

        <h1 class="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>

        {#if description}
            <p class="text-muted mt-3 leading-relaxed">{@render description()}</p>
        {/if}
    </div>

    {#if action}
        <div class="{ACTION_ROW} sm:shrink-0">{@render action()}</div>
    {/if}
</header>
