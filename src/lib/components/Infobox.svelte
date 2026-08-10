<script lang="ts">
    /**
     * Summary panel displayed beside an article.
     *
     * @author Claude
     */
    import { wiki } from "$lib/state/wiki.svelte";
    import type { Entry } from "$lib/types";
    import { formatUniverseDate } from "$lib/utilities/date";
    import CategoryChip from "./CategoryChip.svelte";
    import TypeBadge from "./TypeBadge.svelte";

    interface Props {
        entry: Entry;
    }

    let { entry }: Props = $props();

    const categories = $derived(
        entry.categories.map( ( slug ) => wiki.categoriesBySlug.get( slug ) ).filter( ( category ) => category !== undefined )
    );
</script>

<aside class="surface overflow-hidden" aria-label="Fiche signalétique">
    {#if entry.image}
        <figure class="border-paper-200 dark:border-ink-800 border-b">
            <img src={entry.image.src} alt={entry.image.alt} class="aspect-video w-full object-cover" />

            {#if entry.image.caption}
                <figcaption class="text-muted px-4 py-2 text-xs leading-relaxed">
                    {entry.image.caption}
                </figcaption>
            {/if}
        </figure>
    {/if}

    <div class="space-y-4 p-5">
        <div class="flex flex-wrap items-center gap-2">
            <TypeBadge type={entry.type} />
        </div>

        <p class="font-serif text-lg leading-snug font-semibold">{entry.title}</p>

        {#if entry.timelineDate}
            <p class="text-ink-500 dark:text-paper-300/80 text-sm">
                <span class="text-muted">Date : </span>{formatUniverseDate( entry.timelineDate )}
            </p>
        {/if}

        {#if entry.infobox.length > 0}
            <dl class="divide-paper-200 dark:divide-ink-800 divide-y text-sm">
                {#each entry.infobox as field, index ( index )}
                    <div class="gap-x-3 py-2 sm:grid sm:grid-cols-5">
                        <dt class="text-muted leading-snug sm:col-span-2">{field.label}</dt>
                        <dd class="leading-snug font-medium sm:col-span-3">{field.value}</dd>
                    </div>
                {/each}
            </dl>
        {/if}

        {#if entry.aliases.length > 0}
            <p class="text-muted text-xs leading-relaxed">
                Aussi appelé : {entry.aliases.join( ", " )}
            </p>
        {/if}

        {#if categories.length > 0}
            <div class="border-paper-200 dark:border-ink-800 space-y-2 border-t pt-4">
                <p class="text-muted text-xs tracking-wide uppercase">Catégories</p>

                <div class="flex flex-wrap gap-1.5">
                    {#each categories as category ( category.slug )}
                        <CategoryChip {category} />
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</aside>
