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
    import EntryCard from "$lib/components/wiki/EntryCard.svelte";
    import EntryFilters from "$lib/components/wiki/EntryFilters.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { EntryFilterState } from "$lib/types";
    import { earliestDateKey } from "$lib/utilities/date";
    import { pluralize } from "$lib/utilities/plural";
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
            return matching.sort( ( a, b ) => earliestDateKey( a.dates ) - earliestDateKey( b.dates ) );
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
    <title>{m.wiki_title( { universe: wiki.meta.universe } )}</title>

    <meta name="description" content={m.wiki_meta_description( { universe: wiki.meta.universe } )} />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <PageHeader title={m.common_encyclopedia_label()}>
        {#snippet description()}
            {pluralize( wiki.entries.length, { one: m.common_count_fiche_one, other: m.common_count_fiche_other } )},
            {m.wiki_description_drafts( { count: wiki.drafts.length } )}
            {m.wiki_description_filter_hint()}
        {/snippet}

        {#snippet action()}
            <Button href={resolve( "/new" )} color="primary">{m.wiki_new_entry_button()}</Button>
        {/snippet}
    </PageHeader>

    {#if wiki.entries.length > 0}
        <div class="mt-8">
            <EntryFilters bind:filters shown={filtered.length} onreset={reset} />
        </div>
    {/if}

    {#if wiki.entries.length === 0}
        <div class="mt-8">
            <EmptyState title={m.common_empty_wiki_title()} description={m.common_empty_wiki_description()}>
                <Button href={resolve( "/new" )} color="alternative">{m.common_create_entry()}</Button>
            </EmptyState>
        </div>
    {:else if filtered.length === 0}
        <div class="mt-6">
            <EmptyState title={m.wiki_no_match_title()} description={m.wiki_no_match_description()} />
        </div>
    {:else}
        <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {#each filtered as entry, index ( entry.id )}
                <EntryCard {entry} {index} />
            {/each}
        </div>
    {/if}
</div>
