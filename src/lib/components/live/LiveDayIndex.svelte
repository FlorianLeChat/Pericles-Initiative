<script lang="ts">
    /**
     * Rail beside the live feed, naming its groups and jumping to each one.
     *
     * The feed keeps a 48rem column, and the 22rem beside it used to stand empty
     * whenever the form was closed, the button of the header floating over
     * nothing. That column now holds what the article puts there, a list of where
     * the reader can go: the pinned entries, then every day, newest first, each
     * with its count. It takes the same place and the same look as the contents of
     * an article, a hairline on the left and muted rows, sticky under the header,
     * and the form, once open, takes the column back. It only exists from `lg`; a
     * phone reads the feed from the top and has no column to fill.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import { pluralize } from "#lib/utilities/plural.ts";

    interface Props {
        /** Groups of the feed in reading order, each with the anchor of its heading. */
        groups: { anchor: string; label: string; count: number }[];
    }

    let { groups }: Props = $props();
</script>

{#if groups.length > 0}
    <nav class="sticky top-24 hidden lg:block" aria-labelledby="live-index-heading">
        <p id="live-index-heading" class="text-ink-900 dark:text-paper-100 text-sm font-semibold">
            {m.live_index_heading()}
        </p>

        <ol class="border-paper-200 dark:border-ink-700 mt-3 space-y-0.5 border-l text-sm">
            {#each groups as group ( group.anchor )}
                <li>
                    <a
                        href="#{group.anchor}"
                        class="text-ink-500 hover:text-ink-900 dark:text-paper-300 dark:hover:text-paper-100 -ml-px flex
                               items-baseline justify-between gap-3 border-l border-transparent py-1 pl-3 leading-snug
                               transition-colors"
                    >
                        <span>{group.label}</span>
                        <span class="text-muted shrink-0 text-xs tabular-nums">
                            {pluralize( group.count, { one: m.common_count_entree_one, other: m.common_count_entree_other } )}
                        </span>
                    </a>
                </li>
            {/each}
        </ol>
    </nav>
{/if}
