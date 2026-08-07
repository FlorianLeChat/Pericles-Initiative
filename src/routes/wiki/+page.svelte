<script lang="ts">
    /**
     * Index of every page, with filtering and sorting.
     *
     * This listing is what the prerenderer crawls, so it must link to every
     * page of the dataset, drafts included.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import EntryCard from "$lib/components/EntryCard.svelte";
    import Icon from "$lib/components/Icon.svelte";
    import { ENTRY_TYPES } from "$lib/config/entry-types";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { EntryStatus, EntryType } from "$lib/types";
    import { timelineSortKey } from "$lib/utilities/date";
    import { deburr } from "$lib/utilities/slug";

    const SEARCH = "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z";

    type TypeFilter = EntryType | "tous";
    type StatusFilter = EntryStatus | "tous";
    type SortMode = "alphabetique" | "recent" | "chronologique";

    let query = $state( "" );
    let type = $state<TypeFilter>( "tous" );
    let category = $state( "toutes" );
    let status = $state<StatusFilter>( "tous" );
    let sort = $state<SortMode>( "alphabetique" );

    const normalizedQuery = $derived( deburr( query.trim() ) );

    const filtered = $derived.by( () =>
    {
        const matching = wiki.entries.filter( ( entry ) =>
        {
            if ( type !== "tous" && entry.type !== type )
            {
                return false;
            }
            if ( status !== "tous" && entry.status !== status )
            {
                return false;
            }
            if ( category !== "toutes" && !entry.categories.includes( category ) )
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

        if ( sort === "recent" )
        {
            return matching.sort( ( a, b ) => b.updatedAt.localeCompare( a.updatedAt ) );
        }
        if ( sort === "chronologique" )
        {
            return matching.sort( ( a, b ) => timelineSortKey( a.timelineDate ) - timelineSortKey( b.timelineDate ) );
        }
        return matching.sort( ( a, b ) => a.title.localeCompare( b.title, "fr" ) );
    } );

    const countByType = $derived(
        new Map( ENTRY_TYPES.map( ( config ) => [ config.id, wiki.entries.filter( ( e ) => e.type === config.id ).length ] ) )
    );

    /**
     * Clears every filter.
     *
     * @author Claude
     */
    const reset = (): void =>
    {
        query = "";
        type = "tous";
        category = "toutes";
        status = "tous";
    };
</script>

<svelte:head>
    <title>Encyclopédie · {wiki.meta.universe}</title>

    <meta name="description" content="Index de toutes les fiches de {wiki.meta.universe}." />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-2xl">
            <h1 class="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Encyclopédie</h1>

            <p class="text-ink-400 mt-3 leading-relaxed">
                {wiki.entries.length} fiches, dont {wiki.drafts.length} en brouillon. Filtrez par nature, par catégorie ou
                par mot clé.
            </p>
        </div>

        <a href={resolve( "/new" )} class="btn btn-primary">Nouvelle fiche</a>
    </header>

    <div class="surface mt-8 space-y-4 p-5">
        <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div class="relative">
                <Icon path={SEARCH} class="text-ink-400 absolute top-3 left-3.5 h-4 w-4" />

                <input
                    bind:value={query}
                    type="search"
                    class="field pl-10"
                    placeholder="Filtrer par titre ou par résumé"
                    aria-label="Filtrer les fiches"
                />
            </div>

            <label class="flex items-center gap-2">
                <span class="text-ink-400 sr-only text-sm sm:not-sr-only">Catégorie</span>

                <select bind:value={category} class="field sm:w-52">
                    <option value="toutes">Toutes</option>

                    {#each wiki.categories as item ( item.slug )}
                        <option value={item.slug}>{item.name}</option>
                    {/each}
                </select>
            </label>

            <label class="flex items-center gap-2">
                <span class="text-ink-400 sr-only text-sm sm:not-sr-only">Tri</span>

                <select bind:value={sort} class="field sm:w-44">
                    <option value="alphabetique">Alphabétique</option>
                    <option value="recent">Modifiées récemment</option>
                    <option value="chronologique">Chronologique</option>
                </select>
            </label>
        </div>

        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par nature">
            <button
                type="button"
                class="rounded-full px-3 py-1.5 text-xs font-medium transition {type === "tous"
                    ? "bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900"
                    : "bg-paper-200 text-ink-600 dark:bg-ink-800 dark:text-paper-300"}"
                onclick={() => ( type = "tous" )}
                aria-pressed={type === "tous"}
            >
                Toutes natures
            </button>

            {#each ENTRY_TYPES as config ( config.id )}
                <button
                    type="button"
                    class="rounded-full px-3 py-1.5 text-xs font-medium transition {type === config.id
                        ? "bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900"
                        : "bg-paper-200 text-ink-600 dark:bg-ink-800 dark:text-paper-300"}"
                    onclick={() => ( type = config.id )}
                    aria-pressed={type === config.id}
                >
                    {config.plural}
                    <span class="opacity-60">{countByType.get( config.id ) ?? 0}</span>
                </button>
            {/each}

            <span class="bg-paper-300 dark:bg-ink-700 mx-1 hidden h-4 w-px sm:block"></span>

            <label class="text-ink-400 flex items-center gap-2 text-xs">
                <span class="sr-only sm:not-sr-only">Statut</span>

                <select bind:value={status} class="field w-auto py-1.5 text-xs">
                    <option value="tous">Tous</option>
                    <option value="publie">Publiées</option>
                    <option value="brouillon">Brouillons</option>
                </select>
            </label>
        </div>
    </div>

    <p class="text-ink-400 mt-6 text-sm">
        {filtered.length}
        {filtered.length === 1 ? "fiche" : "fiches"}
    </p>

    {#if filtered.length === 0}
        <div class="mt-6">
            <EmptyState
                title="Aucune fiche ne correspond"
                description="Aucune fiche du corpus ne satisfait cette combinaison de filtres."
            >
                <button type="button" class="btn btn-outline" onclick={reset}>Réinitialiser les filtres</button>
            </EmptyState>
        </div>
    {:else}
        <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {#each filtered as entry ( entry.id )}
                <EntryCard {entry} />
            {/each}
        </div>
    {/if}
</div>
