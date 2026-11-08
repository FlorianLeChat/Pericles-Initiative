<script lang="ts">
    /**
     * One item of the live feed, laid out as a wire dispatch: a dateline, a title,
     * a sentence or two, then the link to the full page.
     *
     * Editing and deleting stay one tab stop each, but as quiet icon buttons after
     * the link, drawn a step lighter than the text, so the dispatch carries the
     * weight of the row and the destructive one is never the most prominent thing
     * on it. «Lire la fiche» names its page to assistive technology, its accessible
     * name opening on the visible words, since a feed of eleven identical links
     * told a screen reader nothing of where each led.
     *
     * A pinned item carries no marker of its own: the feed only ever shows one
     * under the «Épinglées» heading, which already says it of each. The date in
     * full on its dateline stays, since that group has no day heading above it,
     * and the relative time leaves it: «7 novembre 2026 à 19:23 · hier» said the
     * same date twice.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import type { LiveEntry } from "#lib/types.ts";
    import Pencil from "@lucide/svelte/icons/pencil";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Trash2 from "@lucide/svelte/icons/trash-2";
    import SeverityBadge from "./SeverityBadge.svelte";
    import { renderInline } from "#lib/utilities/markdown.ts";
    import { severityConfig } from "#lib/config/severities.ts";
    import { ICON_BUTTON, TOUCH_HEIGHT } from "#lib/config/forms.ts";
    import { formatDateTime, formatTime, relativeTime } from "#lib/utilities/date.ts";

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

    const dateline = $derived( item.pinned ? formatDateTime( item.publishedAt ) : formatTime( item.publishedAt ) );
</script>

<article class="py-6">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <span class="h-2 w-2 shrink-0 rounded-full {config.dot}" aria-hidden="true"></span>

        <time
            datetime={item.publishedAt}
            class="text-ink-600 dark:text-paper-300 tabular-nums"
            title={formatDateTime( item.publishedAt )}
        >
            {dateline}
        </time>

        {#if !item.pinned}
            <span class="text-muted">{relativeTime( item.publishedAt )}</span>
        {/if}

        <SeverityBadge severity={item.severity} />
    </div>

    <h3 class="text-ink-900 dark:text-paper-100 mt-2 text-lg leading-snug font-semibold tracking-tight text-balance">
        {item.title}
    </h3>

    {#if item.body}
        <div class="article-body prose-sm mt-1.5 max-w-help">
            {@html body}
        </div>
    {/if}

    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {#if target}
            <a
                href={resolve( `entries/${ target.slug }/` )}
                class="wiki-link inline-flex items-center font-medium {TOUCH_HEIGHT}"
                aria-label={m.live_item_read_entry_aria( { title: target.title } )}
            >
                {m.live_item_read_entry()}
            </a>
        {:else if item.entrySlug}
            <a href={resolve( `entries/${ item.entrySlug }/` )} class="wiki-link-missing inline-flex items-center font-medium {TOUCH_HEIGHT}">
                {m.live_item_missing_entry( { slug: item.entrySlug } )}
            </a>
        {/if}

        {#if item.source}
            <span class="text-muted text-xs">{m.live_item_source( { source: item.source } )}</span>
        {/if}

        {#each item.tags as tag ( tag )}
            <span class="bg-paper-100 text-ink-600 dark:bg-ink-800 dark:text-paper-200 rounded-full px-2 py-0.5 text-xs">
                {tag}
            </span>
        {/each}

        {#if onedit || ondelete}
            <span class="ml-auto flex gap-0.5">
                {#if onedit}
                    <button
                        type="button"
                        class="text-ink-400 dark:text-paper-400/70 hover:bg-paper-100 dark:hover:bg-ink-800 hover:text-accent-600
                               dark:hover:text-accent-400 inline-flex {ICON_BUTTON} items-center justify-center rounded-full
                               transition"
                        onclick={() => onedit( item )}
                        aria-label={m.live_item_edit_aria( { title: item.title } )}
                        title={m.common_edit()}
                    >
                        <Pencil class="h-4 w-4" aria-hidden="true" />
                    </button>
                {/if}

                {#if ondelete}
                    <button
                        type="button"
                        class="text-ink-400 dark:text-paper-400/70 hover:bg-paper-100 dark:hover:bg-ink-800 hover:text-alert-500
                               inline-flex {ICON_BUTTON} items-center justify-center rounded-full transition"
                        onclick={() => ondelete( item )}
                        aria-label={m.live_item_delete_aria( { title: item.title } )}
                        title={m.common_delete()}
                    >
                        <Trash2 class="h-4 w-4" aria-hidden="true" />
                    </button>
                {/if}
            </span>
        {/if}
    </div>
</article>
