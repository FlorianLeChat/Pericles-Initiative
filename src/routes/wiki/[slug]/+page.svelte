<script lang="ts">
    /**
     * A single encyclopedia page.
     *
     * A slug with no page behind it is not an error: red links lead here, and
     * this is where a page gets created from.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import ArticleBody from "$lib/components/ArticleBody.svelte";
    import Backlinks from "$lib/components/Backlinks.svelte";
    import CategoryChip from "$lib/components/CategoryChip.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import Infobox from "$lib/components/Infobox.svelte";
    import TableOfContents from "$lib/components/TableOfContents.svelte";
    import TypeBadge from "$lib/components/TypeBadge.svelte";
    import { entryTypeConfig } from "$lib/config/entry-types";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { Category } from "$lib/types";
    import { formatDateTime, formatUniverseDate } from "$lib/utilities/date";
    import { excerpt, renderArticle } from "$lib/utilities/markdown";

    const slug = $derived( page.params.slug ?? "" );
    const entry = $derived( wiki.bySlug( slug ) );

    const rendered = $derived( entry ? renderArticle( entry.body, wiki.slugs ) : null );
    const backlinks = $derived( wiki.backlinksOf( slug ) );
    const related = $derived( entry ? wiki.relatedTo( entry ) : [] );

    /** Humanised slug, used to prefill the title of a page that does not exist yet. */
    const plannedTitle = $derived( slug.replace( /-/g, " " ).replace( /^./, ( letter ) => letter.toUpperCase() ) );

    const categories = $derived(
        ( entry?.categories ?? [] )
            .map( ( item ) => wiki.categoriesBySlug.get( item ) )
            .filter( ( item ): item is Category => item !== undefined )
    );
</script>

<svelte:head>
    {#if entry}
        <title>{entry.title} · {wiki.meta.universe}</title>

        <meta name="description" content={entry.summary || excerpt( entry.body, 155 )} />
    {:else}
        <title>Fiche à écrire · {wiki.meta.universe}</title>
    {/if}
</svelte:head>

{#if entry && rendered}
    <article class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <nav class="text-ink-400 flex flex-wrap items-center gap-2 text-sm" aria-label="Fil d'Ariane">
                <a href={resolve( "/wiki" )} class="hover:text-accent-600 dark:hover:text-accent-400">Encyclopédie</a>

                <span aria-hidden="true">/</span>

                <span>{entryTypeConfig( entry.type ).plural}</span>
            </nav>

            <a href={resolve( `/editer/${ entry.slug }` )} class="btn btn-outline px-3.5 py-1.5 text-xs">Modifier</a>
        </div>

        <header class="border-paper-200 dark:border-ink-800 mt-4 border-b pb-8">
            {#if entry.status === "brouillon"}
                <p
                    class="border-signal-500/40 bg-signal-500/10 text-signal-500 mb-4 inline-block rounded-full border px-3 py-1 text-xs font-medium"
                >
                    Brouillon, contenu incomplet
                </p>
            {/if}

            <h1 class="font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
                {entry.title}
            </h1>

            {#if entry.summary}
                <p class="text-ink-600 dark:text-paper-300 mt-5 max-w-3xl text-lg leading-relaxed">
                    {entry.summary}
                </p>
            {/if}

            <div class="mt-6 flex flex-wrap items-center gap-2">
                <TypeBadge type={entry.type} />

                {#each categories as category ( category.slug )}
                    <CategoryChip {category} />
                {/each}
            </div>

            <p class="text-ink-400 mt-5 text-xs">
                {#if entry.timelineDate}
                    Date dans l'univers : {formatUniverseDate( entry.timelineDate )} ·
                {/if}
                Dernière modification le {formatDateTime( entry.updatedAt )}
            </p>
        </header>

        <div class="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div class="order-2 min-w-0 lg:order-1">
                <ArticleBody html={rendered.html} />

                {#if related.length > 0}
                    <section class="border-paper-200 dark:border-ink-800 mt-14 border-t pt-8">
                        <h2 class="font-serif text-xl font-semibold tracking-tight">À lire aussi</h2>

                        <ul class="mt-4 grid gap-3 sm:grid-cols-2">
                            {#each related as item ( item.id )}
                                <li class="surface p-4">
                                    <div class="flex items-center gap-2">
                                        <TypeBadge type={item.type} iconOnly />

                                        <a href={resolve( `/wiki/${ item.slug }` )} class="text-sm font-medium">{item.title}</a>
                                    </div>

                                    {#if item.summary}
                                        <p class="text-ink-400 mt-2 line-clamp-2 text-xs leading-relaxed">
                                            {item.summary}
                                        </p>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    </section>
                {/if}
            </div>

            <aside class="order-1 space-y-5 lg:sticky lg:top-20 lg:order-2">
                <Infobox {entry} />
                <TableOfContents headings={rendered.headings} />
                <Backlinks entries={backlinks} />
            </aside>
        </div>
    </article>
{:else}
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p class="text-ink-400 font-mono text-sm">/wiki/{slug}</p>

        <EmptyState
            title="Cette fiche n'existe pas encore"
            description="Le lien qui mène ici attend une page. C'est le principe du lien rouge : il signale un manque à combler."
        >
            <a
                href={resolve( `/nouveau?slug=${ slug }&titre=${ encodeURIComponent( plannedTitle ) }` )}
                class="btn btn-primary"
            >
                Créer cette fiche
            </a>

            <a href={resolve( "/wiki" )} class="btn btn-outline">Parcourir l'encyclopédie</a>
        </EmptyState>

        {#if backlinks.length > 0}
            <div class="mt-8">
                <Backlinks
                    entries={backlinks}
                    title="Fiches qui attendent cette page"
                    emptyLabel="Aucune fiche ne pointe vers ce slug."
                />
            </div>
        {/if}
    </div>
{/if}
