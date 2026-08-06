<script lang="ts">
    /**
     * Lists the pages pointing at the current one.
     *
     * @author Claude
     */
    import type { Entry } from "$lib/types";
    import TypeBadge from "./TypeBadge.svelte";

    interface Props {
        entries: Entry[];
        title?: string;
        emptyLabel?: string;
    }

    let {
        entries,
        title = "Pages qui mènent ici",
        emptyLabel = "Aucune page ne pointe encore vers celle ci."
    }: Props = $props();
</script>

<section class="surface p-5" aria-label={title}>
    <p class="text-ink-400 mb-3 text-xs tracking-wide uppercase">{title}</p>

    {#if entries.length === 0}
        <p class="text-ink-400 text-sm">{emptyLabel}</p>
    {:else}
        <ul class="space-y-2.5 text-sm">
            {#each entries as entry ( entry.id )}
                <li class="flex items-center gap-2">
                    <TypeBadge type={entry.type} iconOnly />
                    <a href="/wiki/{entry.slug}" class="wiki-link">{entry.title}</a>
                </li>
            {/each}
        </ul>
    {/if}
</section>
