<script lang="ts">
    /**
     * Lists the pages pointing at the current one.
     *
     * Closes an article, after its body, the way an encyclopedia ends on its «see
     * also»: the links are read once the page is, and set inline as a run of names
     * rather than as a column of cards.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import type { Entry } from "#lib/types.ts";
    import * as m from "#lib/locales/messages.js";

    interface Props {
        entries: Entry[];
        title?: string;
        emptyLabel?: string;
    }

    let { entries, title = m.backlinks_title(), emptyLabel = m.backlinks_empty() }: Props = $props();

    const headingId = $props.id();
</script>

<section class="border-paper-200 dark:border-ink-700 mt-12 max-w-[70ch] border-t pt-8" aria-labelledby={headingId}>
    <h2 id={headingId} class="section-heading">{title}</h2>

    {#if entries.length === 0}
        <p class="text-muted mt-3 text-sm">{emptyLabel}</p>
    {:else}
        <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {#each entries as entry ( entry.id )}
                <li>
                    <a href={resolve( `entries/${ entry.slug }/` )} class="wiki-link">{entry.title}</a>
                </li>
            {/each}
        </ul>
    {/if}
</section>
