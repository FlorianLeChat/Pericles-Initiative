<script lang="ts">
    /**
     * One page of a listing, laid out as a row of the index rather than a card.
     *
     * The title is the only link, spread over the whole row by `.stretched-link`,
     * so a row costs a single tab stop. The categories are therefore plain text
     * with their dot: a chip linking to its category would be a second stop, and
     * the overlay of the title would swallow its click anyway.
     *
     * The draft marker is a dashed tag with a word in it, never a colour alone.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import { staggerRank } from "#lib/config/motion.ts";
    import { excerpt } from "#lib/utilities/markdown.ts";
    import { paletteColor } from "#lib/config/palette.ts";
    import type { Entry, EntryDate } from "#lib/types.ts";
    import { formatShortDate, formatUniverseDate, timelineSortKey } from "#lib/utilities/date.ts";

    interface Props {
        entry: Entry;
        /** Position in the listing, which offsets the entrance animation. */
        index?: number;
    }

    let { entry, index = 0 }: Props = $props();

    const lead = $derived( entry.summary || excerpt( entry.body, 150 ) );
    const categories = $derived(
        entry.categories.map( ( slug ) => wiki.categoriesBySlug.get( slug ) ).filter( ( category ) => category !== undefined )
    );
    const isDraft = $derived( entry.status === "brouillon" );

    /** The date the page starts from, the same one the chronological sort orders it by. */
    const firstDate = $derived(
        entry.dates.reduce<EntryDate | undefined>( ( earliest, date ) =>
        {
            const isEarlier = earliest === undefined || timelineSortKey( date.value ) < timelineSortKey( earliest.value );
            return isEarlier ? date : earliest;
        }, undefined )
    );
</script>

<article
    class="rise-in group relative py-2.5"
    style="--rank: {staggerRank( index )}"
>
    <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 class="text-ink-900 dark:text-paper-100 text-base leading-snug font-semibold">
                <a
                    href={resolve( `entries/${ entry.slug }/` )}
                    class="group-hover:text-accent-700 dark:group-hover:text-accent-300 stretched-link
                           group-hover:underline group-hover:underline-offset-2"
                >
                    {entry.title}
                </a>
            </h3>

            {#if isDraft}
                <span
                    class="border-paper-400 text-ink-600 dark:border-ink-600 dark:text-paper-300 rounded-full border
                           border-dashed px-2 py-px text-xs"
                >
                    {m.entry_card_draft_badge()}
                </span>
            {/if}
        </div>

        {#if lead}
            <p class="text-ink-600 dark:text-paper-300 mt-0.5 line-clamp-2 max-w-help text-sm leading-relaxed sm:line-clamp-1">{lead}</p>
        {/if}

        <div class="text-muted mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {#if categories.length > 0}
                <ul class="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label={m.common_categories_label()}>
                    {#each categories as category ( category.slug )}
                        <li class="flex items-center gap-1.5">
                            <span
                                class="h-2 w-2 shrink-0 rounded-full {paletteColor( category.color ).dot}"
                                aria-hidden="true"
                            ></span>
                            {category.name}
                        </li>
                    {/each}
                </ul>
            {/if}

            {#if firstDate}
                <span>{firstDate.label || m.infobox_unlabelled_date()} {formatUniverseDate( firstDate.value )}</span>
            {/if}

            <span>
                {m.entry_card_updated_label()}
                <time datetime={entry.updatedAt}>{formatShortDate( entry.updatedAt )}</time>
            </span>
        </div>
    </div>
</article>
