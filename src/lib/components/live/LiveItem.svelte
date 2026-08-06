<script lang="ts">
    /**
     * One item of the live feed.
     *
     * @author Claude
     */
    import { severityConfig } from "$lib/config/severities";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { LiveEntry } from "$lib/types";
    import { formatDateTime, formatTime, relativeTime } from "$lib/utilities/date";
    import { renderInline } from "$lib/utilities/markdown";
    import SeverityBadge from "./SeverityBadge.svelte";

    interface Props {
        item: LiveEntry;
        /** Loads the item into the composer. */
        onedit?: ( item: LiveEntry ) => void;
        /** Asks for the item to be removed. */
        ondelete?: ( item: LiveEntry ) => void;
    }

    let { item, onedit, ondelete }: Props = $props();

    const config = $derived( severityConfig( item.severity ) );
    const body = $derived( renderInline( item.body, wiki.slugs ) );
    const target = $derived( item.entrySlug ? wiki.bySlug( item.entrySlug ) : undefined );
</script>

<article class="relative pl-8">
    <span
        class="border-paper-50 dark:border-ink-950 absolute top-1.5 left-[9px] h-3 w-3 rounded-full border-2 {config.dot}"
        aria-hidden="true"
    ></span>

    <div class="flex flex-wrap items-center gap-2">
        <time datetime={item.publishedAt} class="text-ink-400 font-mono text-xs" title={formatDateTime( item.publishedAt )}>
            {formatTime( item.publishedAt )}
        </time>
        <span class="text-ink-400 text-xs">· {relativeTime( item.publishedAt )}</span>
        <SeverityBadge severity={item.severity} />
        {#if item.pinned}
            <span class="border-paper-300 text-ink-400 dark:border-ink-700 rounded-full border px-2 py-0.5 text-xs">
                Épinglée
            </span>
        {/if}
    </div>

    <h3 class="mt-2 text-lg leading-snug font-semibold tracking-tight">{item.title}</h3>

    {#if item.body}
        <div class="article-body prose-sm mt-2 max-w-2xl">
            <!-- The HTML is produced by renderInline, which sanitizes it, so it is trusted here. -->
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html body}
        </div>
    {/if}

    <div class="text-ink-400 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {#if target}
            <a href="/wiki/{target.slug}" class="wiki-link font-medium">Lire la fiche complète</a>
        {:else if item.entrySlug}
            <a href="/wiki/{item.entrySlug}" class="wiki-link-missing font-medium">
                Fiche à écrire : {item.entrySlug}
            </a>
        {/if}

        {#if item.source}
            <span>Source : {item.source}</span>
        {/if}

        {#each item.tags as tag ( tag )}
            <span class="bg-paper-200 dark:bg-ink-800 rounded-full px-2 py-0.5">{tag}</span>
        {/each}

        {#if onedit || ondelete}
            <span class="ml-auto flex gap-2">
                {#if onedit}
                    <button type="button" class="hover:text-accent-600 dark:hover:text-accent-400 underline" onclick={() => onedit( item )}>
                        Modifier
                    </button>
                {/if}
                {#if ondelete}
                    <button type="button" class="hover:text-alert-500 underline" onclick={() => ondelete( item )}>
                        Supprimer
                    </button>
                {/if}
            </span>
        {/if}
    </div>
</article>
