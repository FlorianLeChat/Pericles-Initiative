<script lang="ts">
    /**
     * Folded help beside the page being written: how to cite a page, what a red
     * link means, the slash menu, the two shapes of a date, and what publishing
     * changes.
     *
     * Each of these was only learnt by stumbling on it, a red link read as a
     * broken one, a date typed as free text and wondered at in the chronology.
     * It sits under the settings, the same folded `.surface` with its one muted
     * line, so it costs a writer who knows nothing, and the shortcut it names is
     * the one of the platform, as on the toolbar.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import { platform } from "#lib/state/platform.svelte.ts";
    import ChevronDown from "@lucide/svelte/icons/chevron-down";

    let open = $state( false );

    const shortcut = $derived(
        platform.apple ? m.markdown_editor_link_shortcut_apple() : m.markdown_editor_link_shortcut()
    );

    const tips = $derived( [
        m.writing_help_links( { shortcut } ),
        m.writing_help_red_links(),
        m.writing_help_blocks(),
        m.writing_help_dates(),
        m.writing_help_publish()
    ] );
</script>

<section class="surface">
    <h2>
        <button
            type="button"
            class="hover:bg-paper-100/60 dark:hover:bg-ink-800/40 flex min-h-12 w-full items-center gap-3 rounded-xl
                   px-4 py-2 text-left transition-colors"
            aria-expanded={open}
            aria-controls="writing-help"
            onclick={() => ( open = !open )}
        >
            <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium">{m.writing_help_title()}</span>
                <span class="text-muted block truncate text-xs">{m.writing_help_summary()}</span>
            </span>

            <ChevronDown class="text-muted h-4 w-4 shrink-0 transition-transform {open ? "rotate-180" : ""}" />
        </button>
    </h2>

    {#if open}
        <ul
            id="writing-help"
            class="border-paper-200 dark:border-ink-700 divide-paper-200 dark:divide-ink-700 divide-y border-t px-4
                   text-sm leading-relaxed"
        >
            {#each tips as tip ( tip )}
                <li class="py-3 text-pretty">{tip}</li>
            {/each}
        </ul>
    {/if}
</section>
