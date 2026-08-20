<script lang="ts">
    /**
     * Summary panel displayed beside an article.
     *
     * @author Claude
     */
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { Entry } from "$lib/types";
    import { formatUniverseDate } from "$lib/utilities/date";
    import CategoryChip from "./CategoryChip.svelte";

    interface Props {
        entry: Entry;
    }

    let { entry }: Props = $props();

    /** Heading printed for a date whose author gave it no intitulé. */
    const UNLABELLED_DATE = m.infobox_unlabelled_date();

    const categories = $derived(
        entry.categories.map( ( slug ) => wiki.categoriesBySlug.get( slug ) ).filter( ( category ) => category !== undefined )
    );

    /** True once the panel has something to lay out as a label and value pair. */
    const hasRows = $derived( entry.dates.length > 0 || entry.infobox.length > 0 );
</script>

{#snippet row( label: string, value: string )}
    <div class="gap-x-3 py-2 sm:grid sm:grid-cols-5">
        <dt class="text-muted leading-snug sm:col-span-2">{label}</dt>
        <dd class="leading-snug font-medium sm:col-span-3">{value}</dd>
    </div>
{/snippet}

<aside class="surface overflow-hidden" aria-label={m.infobox_aria_label()}>
    {#if entry.image}
        <figure class="border-paper-200 dark:border-ink-800 border-b">
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
        <p class="font-serif text-lg leading-snug font-semibold">{entry.title}</p>

        {#if hasRows}
            <dl class="divide-paper-200 dark:divide-ink-800 divide-y text-sm">
                {#each entry.dates as date ( date.id )}
                    {@render row( date.label || UNLABELLED_DATE, formatUniverseDate( date.value ) )}
                {/each}

                {#each entry.infobox as field, index ( index )}
                    {@render row( field.label, field.value )}
                {/each}
            </dl>
        {/if}

        {#if entry.aliases.length > 0}
            <p class="text-muted text-xs leading-relaxed">
                {m.infobox_aliases_prefix()} {entry.aliases.join( ", " )}
            </p>
        {/if}

        {#if categories.length > 0}
            <div class="border-paper-200 dark:border-ink-800 space-y-2 border-t pt-4">
                <p class="text-muted text-xs tracking-wide uppercase">{m.common_categories_label()}</p>

                <div class="flex flex-wrap gap-1.5">
                    {#each categories as category ( category.slug )}
                        <CategoryChip {category} />
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</aside>
