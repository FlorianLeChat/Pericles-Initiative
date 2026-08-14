<script lang="ts">
    /**
     * Index of every page, with filtering and sorting.
     *
     * This listing is what the prerenderer crawls, so it must link to every
     * page of the dataset, drafts included.
     *
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import { resolve } from "$app/paths";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import EntryCard from "$lib/components/EntryCard.svelte";
    import EntryFilters from "$lib/components/EntryFilters.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { EntryFilterState } from "$lib/types";
    import { timelineSortKey } from "$lib/utilities/date";
    import { deburr } from "$lib/utilities/slug";

    let filters = $state<EntryFilterState>( {
        query: "",
        category: "toutes",
        status: "tous",
        sort: "alphabetique"
    } );

    const normalizedQuery = $derived( deburr( filters.query.trim() ) );

    const filtered = $derived.by( () =>
    {
        const matching = wiki.entries.filter( ( entry ) =>
        {
            if ( filters.status !== "tous" && entry.status !== filters.status )
            {
                return false;
            }
            if ( filters.category !== "toutes" && !entry.categories.includes( filters.category ) )
            {
                return false;
            }
            if ( normalizedQuery.length > 0 )
            {
                const haystack = deburr( `${ entry.title } ${ entry.summary } ${ entry.aliases.join( " " ) }` );
                return haystack.includes( normalizedQuery );
            }
            return true;
        } );

        if ( filters.sort === "recent" )
        {
            return matching.sort( ( a, b ) => b.updatedAt.localeCompare( a.updatedAt ) );
        }
        if ( filters.sort === "chronologique" )
        {
            return matching.sort( ( a, b ) => timelineSortKey( a.timelineDate ) - timelineSortKey( b.timelineDate ) );
        }
        return matching.sort( ( a, b ) => a.title.localeCompare( b.title, "fr" ) );
    } );

    /**
     * Clears every filter, leaving the ordering as the reader set it.
     *
     * @author Claude
     */
    const reset = (): void =>
    {
        filters.query = "";
        filters.category = "toutes";
        filters.status = "tous";
    };
</script>

<svelte:head>
    <title>Encyclopédie · {wiki.meta.universe}</title>

    <meta name="description" content="Index de toutes les fiches de {wiki.meta.universe}." />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <PageHeader title="Encyclopédie">
        {#snippet description()}
            {wiki.entries.length} fiches, dont {wiki.drafts.length} en brouillon. Filtrez par catégorie, par statut ou
            par mot clé.
        {/snippet}

        {#snippet action()}
            <Button href={resolve( "/new" )} color="primary">Nouvelle fiche</Button>
        {/snippet}
    </PageHeader>

    {#if wiki.entries.length > 0}
        <div class="mt-8">
            <EntryFilters bind:filters shown={filtered.length} onreset={reset} />
        </div>
    {/if}

    {#if wiki.entries.length === 0}
        <div class="mt-8">
            <EmptyState
                title="Aucune fiche pour le moment"
                description="Ce wiki est vide : commencez par créer la première fiche."
            >
                <Button href={resolve( "/new" )} color="alternative">Créer une fiche</Button>
            </EmptyState>
        </div>
    {:else if filtered.length === 0}
        <div class="mt-6">
            <EmptyState
                title="Aucune fiche ne correspond"
                description="Élargissez ou réinitialisez les filtres pour retrouver le corpus."
            />
        </div>
    {:else}
        <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {#each filtered as entry, index ( entry.id )}
                <EntryCard {entry} {index} />
            {/each}
        </div>
    {/if}
</div>
