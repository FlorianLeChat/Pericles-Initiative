<script lang="ts">
    /**
     * Overview of the categories.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import { staggerRank } from "$lib/config/motion";
    import { paletteColor } from "$lib/config/palette";
    import { wiki } from "$lib/state/wiki.svelte";

    const groups = $derived(
        wiki.categories.map( ( category ) => ( {
            category,
            color: paletteColor( category.color ),
            entries: wiki.entriesInCategory( category.slug )
        } ) )
    );

    const uncategorized = $derived( wiki.publishedEntries.filter( ( entry ) => entry.categories.length === 0 ) );
</script>

<svelte:head>
    <title>Catégories · {wiki.meta.universe}</title>

    <meta name="description" content="Les catégories thématiques de {wiki.meta.universe}." />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-2xl">
            <h1 class="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Catégories</h1>

            <p class="text-muted mt-3 leading-relaxed">
                Chaque fiche peut appartenir à plusieurs catégories. Elles regroupent par thème ce que la nature des
                fiches sépare par forme.
            </p>
        </div>

        <a href={resolve( "/categories/manage" )} class="btn btn-outline">Gérer les catégories</a>
    </header>

    {#if groups.length === 0}
        <div class="mt-10">
            <EmptyState title="Aucune catégorie" description="Aucune catégorie n'a encore été créée.">
                <a href={resolve( "/categories/manage" )} class="btn btn-outline">Créer une catégorie</a>
            </EmptyState>
        </div>
    {:else}
        <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {#each groups as group, index ( group.category.slug )}
                <a
                    href={resolve( `/categories/${ group.category.slug }` )}
                    class="surface surface-lift rise-in hover:border-accent-300 dark:hover:border-accent-700 group flex flex-col gap-3 p-6"
                    style="--rank: {staggerRank( index )}"
                >
                    <span class="flex items-center gap-2">
                        <span class="h-2 w-2 rounded-full {group.color.dot}"></span>

                        <span class="text-muted text-xs tracking-wide uppercase">
                            {group.entries.length}
                            {group.entries.length === 1 ? "fiche" : "fiches"}
                        </span>
                    </span>

                    <h2
                        class="group-hover:text-accent-600 dark:group-hover:text-accent-400 font-serif text-xl font-semibold tracking-tight"
                    >
                        {group.category.name}
                    </h2>

                    {#if group.category.description}
                        <p class="text-ink-500 dark:text-paper-300/80 text-sm leading-relaxed">
                            {group.category.description}
                        </p>
                    {/if}
                </a>
            {/each}
        </div>
    {/if}

    {#if uncategorized.length > 0}
        <section class="mt-12">
            <h2 class="font-serif text-xl font-semibold tracking-tight">Fiches sans catégorie</h2>

            <ul class="mt-4 flex flex-wrap gap-2">
                {#each uncategorized as entry ( entry.id )}
                    <li>
                        <a
                            href={resolve( `/wiki/${ entry.slug }` )}
                            class="border-paper-300 dark:border-ink-800 hover:border-accent-400 rounded-full border px-3 py-1.5 text-sm transition"
                        >
                            {entry.title}
                        </a>
                    </li>
                {/each}
            </ul>
        </section>
    {/if}
</div>
