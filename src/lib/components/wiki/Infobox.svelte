<script lang="ts">
    /**
     * Summary panel displayed beside an article.
     *
     * Beside the body from `lg`, it stacks above it on a phone, where a long
     * panel pushed the first sentence of the page two screens down. There, only
     * its first `FOLDED_ROWS` rows show, and a button under them unfolds the
     * others, unless there is only one, which shows: a button costing as much as
     * the row it hides saved the reader nothing; the image, the aliases and the categories stay, being the
     * identity of the page rather than its detail. From `lg` every row shows and
     * the button leaves, the hiding being a breakpoint class rather than a
     * branch, so the prerendered panel is the same on both.
     *
     * The image heads the panel beside the body, and closes it on a phone: a
     * player looking someone up at the table wants the dates and the facts on
     * the first screen, and a 16:9 plate above them pushed both to the second.
     *
     * @author Claude
     */
    import type { Entry } from "#lib/types.ts";
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import CategoryChip from "./CategoryChip.svelte";
    import { TOUCH_HEIGHT } from "#lib/config/forms.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { renderPhrase } from "#lib/utilities/markdown.ts";
    import ChevronDown from "@lucide/svelte/icons/chevron-down";
    import { ageAtDeath, formatUniverseDate } from "#lib/utilities/date.ts";

    interface Props {
        entry: Entry;
    }

    let { entry }: Props = $props();

    /** Heading printed for a date whose author gave it no intitulé. */
    const UNLABELLED_DATE = m.infobox_unlabelled_date();

    const categories = $derived(
        entry.categories.map( ( slug ) => wiki.categoriesBySlug.get( slug ) ).filter( ( category ) => category !== undefined )
    );

    const age = $derived( ageAtDeath( entry.dates ) );

    /** Rows a phone shows before the panel is unfolded. */
    const FOLDED_ROWS = 4;

    let unfolded = $state( false );

    /** True once the panel has something to lay out as a label and value pair. */
    const hasRows = $derived( entry.dates.length > 0 || entry.infobox.length > 0 );

    const rowCount = $derived( entry.dates.length + ( age === null ? 0 : 1 ) + entry.infobox.length );

    const hiddenCount = $derived( Math.max( 0, rowCount - FOLDED_ROWS ) );

    /** A single row past the fold shows rather than hiding behind a button as tall as itself. */
    const foldable = $derived( hiddenCount > 1 );

    const listId = $derived( `infobox-rows-${ entry.id }` );

    /**
     * Tells whether a row waits behind the button on a phone.
     *
     * @param position Rank of the row in the panel, dates first, from zero.
     * @returns True when the row is past the folded ones and the panel is still folded.
     * @author Claude
     */
    const foldedAway = ( position: number ): boolean => foldable && !unfolded && position >= FOLDED_ROWS;
</script>

{#snippet row( position: number, label: string, value: string, markdown = false )}
    <div class="gap-x-3 py-2 sm:grid sm:grid-cols-5 {foldedAway( position ) ? "max-lg:hidden" : ""}">
        <dt class="text-muted leading-snug sm:col-span-2 lg:col-span-2">{label}</dt>
        <dd class="leading-snug font-medium sm:col-span-3">
            {#if markdown}
                {@html renderPhrase( value, wiki.slugs )}
            {:else}
                {value}
            {/if}
        </dd>
    </div>
{/snippet}

<aside class="surface flex flex-col overflow-hidden" aria-label={m.infobox_aria_label()}>
    {#if entry.image}
        <figure class="border-paper-200 dark:border-ink-700 max-lg:order-last max-lg:border-t lg:border-b">
            <img
                src={entry.image.src}
                alt={entry.image.alt}
                class="aspect-video w-full object-cover"
                loading="lazy"
                decoding="async"
            />

            {#if entry.image.caption}
                <figcaption class="text-muted px-4 py-2 text-xs leading-relaxed">
                    {entry.image.caption}
                </figcaption>
            {/if}
        </figure>
    {/if}

    <div class="space-y-4 p-5">
        <p class="text-ink-900 dark:text-paper-100 font-serif text-lg leading-snug font-semibold">{entry.title}</p>

        {#if hasRows}
            <dl id={listId} class="divide-paper-200 dark:divide-ink-700 divide-y text-sm">
                {#each entry.dates as date, index ( date.id )}
                    {@render row( index, date.label || UNLABELLED_DATE, formatUniverseDate( date.value ) )}
                {/each}

                {#if age !== null}
                    {@render row(
                        entry.dates.length,
                        m.infobox_age_at_death(),
                        pluralize( age, { one: m.infobox_age_one, other: m.infobox_age_other } )
                    )}
                {/if}

                {#each entry.infobox as field, index ( index )}
                    {@render row( rowCount - entry.infobox.length + index, field.label, field.value, true )}
                {/each}
            </dl>

            {#if foldable}
                <button
                    type="button"
                    class="text-accent-700 dark:text-accent-300 -mt-2 inline-flex items-center gap-1.5 text-sm font-medium
                           lg:hidden {TOUCH_HEIGHT}"
                    aria-expanded={unfolded}
                    aria-controls={listId}
                    onclick={() => ( unfolded = !unfolded )}
                >
                    {unfolded
                        ? m.infobox_fold()
                        : pluralize( hiddenCount, { one: m.infobox_unfold_one, other: m.infobox_unfold_other } )}
                    <ChevronDown class="h-4 w-4 transition-transform {unfolded ? "rotate-180" : ""}" aria-hidden="true" />
                </button>
            {/if}
        {/if}

        {#if entry.aliases.length > 0}
            <p class="text-muted text-xs leading-relaxed">
                {m.infobox_aliases_prefix()} {entry.aliases.join( ", " )}
            </p>
        {/if}

        {#if categories.length > 0}
            <div class="border-paper-200 dark:border-ink-700 space-y-2 border-t pt-4">
                <p class="text-muted text-xs">{m.common_categories_label()}</p>

                <div class="flex flex-wrap gap-1.5">
                    {#each categories as category ( category.slug )}
                        <CategoryChip {category} />
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</aside>
