<script lang="ts">
    /**
     * Lists the pages citing a slug, each with the passage holding its link:
     * «Pages qui mènent ici» at the foot of an article, «Où elle est citée» on a
     * red link page.
     *
     * Rows are drawn like the related reads of an article: a hairline divided
     * list whose title link stretches over the whole row, the passage muted under
     * it, cut around the link by `citingExcerpt`. The backlinks of an article used
     * to run inline as a line of names; in ink with no underline at rest, on a
     * phone that has no hover, they read as a sentence fragment rather than as
     * links, and they said nothing of how the pages connect.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import type { Entry } from "#lib/types.ts";
    import * as m from "#lib/locales/messages.js";
    import { citingExcerpt } from "#lib/utilities/search.ts";

    interface Props {
        /** Pages citing the slug, in the order they are listed. */
        entries: Entry[];
        /** The slug they cite. */
        slug: string;
        /** Heading of the section. */
        title: string;
        /** Sentence shown when no page cites the slug. */
        emptyLabel?: string;
    }

    let { entries, slug, title, emptyLabel = m.backlinks_empty() }: Props = $props();

    const rows = $derived( entries.map( ( entry ) => ( { entry, passage: citingExcerpt( entry, slug ) } ) ) );

    const headingId = $props.id();
</script>

<section class="border-paper-200 dark:border-ink-700 mt-12 border-t pt-8" aria-labelledby={headingId}>
    <h2 id={headingId} class="section-heading">{title}</h2>

    {#if rows.length === 0}
        <p class="text-muted mt-3 text-sm">{emptyLabel}</p>
    {:else}
        <ul class="divide-paper-200 dark:divide-ink-700 mt-3 divide-y">
            {#each rows as { entry, passage } ( entry.id )}
                <li class="relative py-3">
                    <a href={resolve( `entries/${ entry.slug }/` )} class="row-link stretched-link font-medium">
                        {entry.title}
                    </a>

                    {#if passage}
                        <p class="text-muted mt-1 max-w-help text-sm leading-relaxed">{passage}</p>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
</section>
