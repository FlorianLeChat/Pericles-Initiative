<script lang="ts">
    /**
     * Every page of one category, grouped by nature.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import EntryCard from "$lib/components/EntryCard.svelte";
    import { ENTRY_TYPES } from "$lib/config/entry-types";
    import { paletteColor } from "$lib/config/palette";
    import { wiki } from "$lib/state/wiki.svelte";

    const slug = $derived( page.params.slug ?? "" );
    const category = $derived( wiki.categoriesBySlug.get( slug ) );
    const color = $derived( paletteColor( category?.color ) );
    const entries = $derived( wiki.entriesInCategory( slug, true ) );

    const groups = $derived(
        ENTRY_TYPES.map( ( config ) => ( {
            config,
            entries: entries.filter( ( entry ) => entry.type === config.id )
        } ) ).filter( ( group ) => group.entries.length > 0 )
    );
</script>

<svelte:head>
    <title>{category?.name ?? "Catégorie inconnue"} · {wiki.meta.universe}</title>
    <meta name="description" content={category?.description ?? ""} />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <nav class="text-ink-400 flex flex-wrap items-center gap-2 text-sm" aria-label="Fil d'Ariane">
        <a href={resolve( "/categories" )} class="hover:text-accent-600 dark:hover:text-accent-400">Catégories</a>
        <span aria-hidden="true">/</span>
        <span>{category?.name ?? slug}</span>
    </nav>

    {#if category}
        <header class="border-paper-200 dark:border-ink-800 mt-4 border-b pb-8">
            <span class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full {color.dot}"></span>
                <span class="text-ink-400 text-xs tracking-wide uppercase">
                    {entries.length}
                    {entries.length === 1 ? "fiche" : "fiches"}
                </span>
            </span>
            <h1 class="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {category.name}
            </h1>
            {#if category.description}
                <p class="text-ink-600 dark:text-paper-300 mt-4 max-w-2xl leading-relaxed">
                    {category.description}
                </p>
            {/if}
        </header>

        {#if groups.length === 0}
            <div class="mt-10">
                <EmptyState
                    title="Catégorie vide"
                    description="Aucune fiche ne se rattache encore à cette catégorie."
                >
                    <a href={resolve( "/wiki" )} class="btn btn-outline">Parcourir l'encyclopédie</a>
                </EmptyState>
            </div>
        {:else}
            {#each groups as group ( group.config.id )}
                <section class="mt-10">
                    <h2 class="text-ink-400 text-xs tracking-[0.15em] uppercase">{group.config.plural}</h2>
                    <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {#each group.entries as entry ( entry.id )}
                            <EntryCard {entry} />
                        {/each}
                    </div>
                </section>
            {/each}
        {/if}
    {:else}
        <div class="mt-10">
            <EmptyState
                title="Catégorie inconnue"
                description="Aucune catégorie ne porte ce nom dans le fichier de données."
            >
                <a href={resolve( "/categories" )} class="btn btn-outline">Voir les catégories</a>
            </EmptyState>
        </div>
    {/if}
</div>
