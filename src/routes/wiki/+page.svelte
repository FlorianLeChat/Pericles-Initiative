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
    import Label from "flowbite-svelte/Label.svelte";
    import Radio from "flowbite-svelte/Radio.svelte";
    import Search from "flowbite-svelte/Search.svelte";
    import Select from "flowbite-svelte/Select.svelte";
    import { resolve } from "$app/paths";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import EntryCard from "$lib/components/EntryCard.svelte";
    import { ENTRY_TYPES } from "$lib/config/entry-types";
    import { RADIO_OVERLAY } from "$lib/config/forms";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { EntryStatus, EntryType } from "$lib/types";
    import { timelineSortKey } from "$lib/utilities/date";
    import { counted } from "$lib/utilities/plural";
    import { deburr } from "$lib/utilities/slug";

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
     * Appearance of one nature pill, which only depends on whether it is the chosen one.
     *
     * @param chosen True when the pill is the selected nature.
     * @returns Classes for the label wrapping the radio.
     * @author Claude
     */
    const natureClass = ( chosen: boolean ): string =>
        `relative flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium transition
         has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-500 ${
            chosen
                ? "bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900"
                : "bg-paper-200 text-ink-600 dark:bg-ink-800 dark:text-paper-300" }`;

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

            <p class="text-muted mt-3 leading-relaxed">
                {wiki.entries.length} fiches, dont {wiki.drafts.length} en brouillon. Filtrez par nature, par catégorie ou
                par mot clé.
            </p>
        </div>

        <Button href={resolve( "/new" )} color="primary">Nouvelle fiche</Button>
    </header>

    <div class="surface mt-8 space-y-4 p-5">
        <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-4">
            <Search
                bind:value={query}
                placeholder="Filtrer par titre ou par résumé"
                aria-label="Filtrer les fiches"
            />

            <div class="flex items-center gap-2.5">
                <Label for="filtre-categorie" class="text-muted sr-only shrink-0 text-sm sm:not-sr-only">
                    Catégorie
                </Label>

                <Select id="filtre-categorie" bind:value={category} placeholder="" class="sm:w-52">
                    <option value="toutes">Toutes</option>

                    {#each wiki.categories as item ( item.slug )}
                        <option value={item.slug}>{item.name}</option>
                    {/each}
                </Select>
            </div>

            <div class="flex items-center gap-2.5">
                <Label for="filtre-tri" class="text-muted sr-only shrink-0 text-sm sm:not-sr-only">Tri</Label>

                <Select id="filtre-tri" bind:value={sort} placeholder="" class="sm:w-44">
                    <option value="alphabetique">Alphabétique</option>
                    <option value="recent">Modifiées récemment</option>
                    <option value="chronologique">Chronologique</option>
                </Select>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <fieldset class="contents">
                <legend class="sr-only">Filtrer par nature</legend>

                <Radio
                    name="filtre-nature"
                    value="tous"
                    bind:group={type}
                    class={RADIO_OVERLAY}
                    classes={{ label: natureClass( type === "tous" ) }}
                >
                    Toutes natures
                </Radio>

                {#each ENTRY_TYPES as config ( config.id )}
                    <Radio
                        name="filtre-nature"
                        value={config.id}
                        bind:group={type}
                        class={RADIO_OVERLAY}
                        classes={{ label: natureClass( type === config.id ) }}
                    >
                        {config.plural}

                        <span class="font-mono">{countByType.get( config.id ) ?? 0}</span>
                    </Radio>
                {/each}
            </fieldset>

            <span class="bg-paper-300 dark:bg-ink-700 mx-2 hidden h-4 w-px sm:block"></span>

            <div class="text-muted flex items-center gap-2.5 text-xs">
                <Label for="filtre-statut" class="shrink-0 sr-only sm:not-sr-only">Statut</Label>

                <Select id="filtre-statut" bind:value={status} size="sm" placeholder="" class="w-auto">
                    <option value="tous">Tous</option>
                    <option value="publie">Publiées</option>
                    <option value="brouillon">Brouillons</option>
                </Select>
            </div>
        </div>
    </div>

    <p class="text-muted mt-6 text-sm">{counted( filtered.length, "fiche" )}</p>

    {#if wiki.entries.length === 0}
        <div class="mt-6">
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
                description="Aucune fiche du corpus ne satisfait cette combinaison de filtres."
            >
                <Button color="alternative" onclick={reset}>Réinitialiser les filtres</Button>
            </EmptyState>
        </div>
    {:else}
        <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {#each filtered as entry, index ( entry.id )}
                <EntryCard {entry} {index} />
            {/each}
        </div>
    {/if}
</div>
