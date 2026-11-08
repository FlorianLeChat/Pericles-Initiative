<script lang="ts">
    /**
     * Header of a section page: what the page is about, and what it lets you do.
     *
     * The action belongs here rather than in each page so that every section puts
     * it in the same place: beside the title on a wide screen, under the
     * introduction on a phone. Written by hand page after page, that slot
     * drifted, and a reader who had found an action in the corner of one section
     * had to look for the equivalent elsewhere on the next.
     *
     * On a phone the action keeps its own width rather than the whole line. A
     * full width filled button between the introduction and the filters was the
     * heaviest thing on the screen, and pushed what a reader came for, the
     * filters and the list, below it.
     *
     * The red rule under the title is the mark of a page of the world, the one
     * catalogue detail the site keeps beside the red link. The tools, the
     * dashboard, the backups, the settings and the management of categories,
     * pass `rule={false}`: stamped on every page, the rule read as a template
     * rather than as the sign that one is reading.
     *
     * An action that renders nothing, as on a device set to read only, leaves no
     * empty row behind: the slot hides itself while it holds no element.
     *
     * @author Claude
     */
    import type { Snippet } from "svelte";
    import { ACTION_ROW } from "#lib/config/forms.ts";

    interface Props {
        title: string;
        /** A sentence or two under the title. */
        description?: Snippet;
        /** Actions of the page, laid out by `ACTION_ROW`. */
        action?: Snippet;
        /** Whether the red title rule follows the title: true on a page of the world, false on a tool. */
        rule?: boolean;
    }

    let { title, description, action, rule = true }: Props = $props();
</script>

<header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
    <div class="max-w-2xl">
        <h1 class="text-ink-900 dark:text-paper-100 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
        </h1>

        {#if rule}
            <span class="title-rule" aria-hidden="true"></span>
        {/if}

        {#if description}
            <p class="text-muted {rule ? "mt-4" : "mt-3"} max-w-measure leading-relaxed text-pretty">{@render description()}</p>
        {/if}
    </div>

    {#if action}
        <div class="{ACTION_ROW} items-start sm:shrink-0 empty:hidden">{@render action()}</div>
    {/if}
</header>
