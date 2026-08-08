<script lang="ts">
    /**
     * Card used in every listing of pages.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import { staggerRank } from "$lib/config/motion";
    import type { Entry } from "$lib/types";
    import { formatShortDate } from "$lib/utilities/date";
    import { excerpt } from "$lib/utilities/markdown";
    import TypeBadge from "./TypeBadge.svelte";

    interface Props {
        entry: Entry;
        /** Compact variant, without the excerpt. */
        dense?: boolean;
        /** Position in the listing, which offsets the entrance animation. */
        index?: number;
    }

    let { entry, dense = false, index = 0 }: Props = $props();

    const lead = $derived( entry.summary || excerpt( entry.body, 150 ) );
</script>

<article
    class="surface surface-lift rise-in hover:border-accent-300 dark:hover:border-accent-700 group relative flex flex-col gap-3 p-5"
    style="--rank: {staggerRank( index )}"
>
    <div class="flex flex-wrap items-center gap-2">
        <TypeBadge type={entry.type} />

        {#if entry.status === "brouillon"}
            <span
                class="border-paper-300 text-ink-400 dark:border-ink-700 rounded-full border border-dashed px-2 py-0.5 text-xs"
            >
                Brouillon
            </span>
        {/if}
    </div>

    <h3 class="text-lg leading-snug font-semibold tracking-tight">
        <a
            href={resolve( `/wiki/${ entry.slug }` )}
            class="group-hover:text-accent-600 dark:group-hover:text-accent-400 stretched-link"
        >
            {entry.title}
        </a>
    </h3>

    {#if !dense && lead}
        <p class="text-ink-500 dark:text-paper-300/80 line-clamp-3 text-sm leading-relaxed">{lead}</p>
    {/if}

    <p class="text-ink-400 mt-auto text-xs">
        Modifié le {formatShortDate( entry.updatedAt )}
    </p>
</article>
