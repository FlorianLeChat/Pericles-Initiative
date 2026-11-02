<script lang="ts">
    /**
     * Index of every page, with filtering and sorting.
     *
     * This listing is what the prerenderer crawls, so it must link to every
     * page of the dataset, drafts included.
     *
     * The ordering can be asked for in the address, `/entries/?tri=recent`, so
     * another page can link straight to the pages most recently changed. The
     * values are the ones of the sort menu: `alphabetique`, `recent`,
     * `chronologique`.
     *
     * @author Claude
     */
    import { page } from "$app/state";
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import { deburr } from "#lib/utilities/slug.ts";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { earliestDateKey } from "#lib/utilities/date.ts";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import type { Entry, EntryFilterState } from "#lib/types.ts";
    import EntryCard from "#lib/components/wiki/EntryCard.svelte";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import EntryFilters, { ENTRY_SORTS } from "#lib/components/wiki/EntryFilters.svelte";

    /** Name of the query parameter carrying the ordering. */
    const SORT_PARAMETER = "tri";

    /** A plain latin letter, the only first characters that get a guide heading of their own. */
    const LATIN_LETTER = /^[a-z]$/;

    /** Guide heading shared by every title opening on a digit, a sign or a non latin letter. */
    const OTHER_INITIAL = "#";

    interface LetterGroup {
        letter: string;
        entries: Entry[];
        /** Position of the first row of the group in the whole listing, for the entrance wave. */
        start: number;
    }

    let filters = $state<EntryFilterState>( {
        query: "",
        category: "toutes",
        status: "tous",
        sort: "alphabetique"
    } );

    // Read in an effect rather than a derived: a prerendered page may not touch
    // the query string while rendering on the server, and the menu stays free to
    // change the ordering afterwards without fighting the address.
    $effect( () =>
    {
        const requested = page.url.searchParams.get( SORT_PARAMETER );
        const match = ENTRY_SORTS.find( ( option ) => option.value === requested );

        if ( match )
        {
            filters.sort = match.value;
        }
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
     * Rows of the alphabetical ordering, gathered under the letter they start
     * with, like the guide cards of a catalogue drawer. Built in one pass over a
     * listing already sorted, so a letter is closed as soon as the next appears.
     */
    const letterGroups = $derived.by( () =>
    {
        const groups: LetterGroup[] = [];

        filtered.forEach( ( entry, index ) =>
        {
            const initial = deburr( entry.title.trim() ).charAt( 0 );
            const isLetter = LATIN_LETTER.test( initial );
            const letter = isLetter ? initial.toUpperCase() : OTHER_INITIAL;
            const current = groups.at( -1 );

            if ( current?.letter === letter )
            {
                current.entries.push( entry );
                return;
            }

            groups.push( { letter, entries: [ entry ], start: index } );
        } );

        return groups;
    } );

    /** The first letter clears the filters above it, every following one is ruled off from the last. */
    const groupSpacing = ( rank: number ): string => ( rank === 0 ? "mt-6" : "border-t" );

    const isAlphabetical = $derived( filters.sort === "alphabetique" );
    const listingHeading = $derived(
        filters.sort === "recent" ? m.wiki_listing_heading_recent() : m.wiki_listing_heading_chronological()
    );

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

<PageMeta
    title={m.wiki_title( { universe: wiki.meta.universe } )}
    description={m.wiki_meta_description( { universe: wiki.meta.universe } )}
/>

<div class="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <PageHeader title={m.common_encyclopedia_label()}>
        {#snippet description()}
            {pluralize( wiki.entries.length, { one: m.common_count_fiche_one, other: m.common_count_fiche_other } )},
            {m.wiki_description_drafts( { count: wiki.drafts.length } )}
            {m.wiki_description_filter_hint()}
        {/snippet}

        {#snippet action()}
            <!-- From `lg` the header already offers it, a second one beside the title only competes with it. -->
            <Button href={resolve( "/new" )} color="primary" class="lg:hidden">{m.wiki_new_entry_button()}</Button>
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
    {:else if isAlphabetical}
        <!--
            The letter stands in a gutter of its own beside its rows rather than on a
            line above them, so a letter holding a single page costs one row, not two.
        -->
        {#each letterGroups as group, rank ( group.letter )}
            <section
                class="border-paper-200 dark:border-ink-800 grid grid-cols-1 gap-x-4 sm:grid-cols-[2rem_minmax(0,1fr)]
                       {groupSpacing( rank )}"
            >
                <h2
                    class="text-ink-800 dark:text-paper-200 pt-2.5 font-serif text-lg leading-none font-semibold
                           sm:sticky sm:top-20 sm:self-start sm:pt-3"
                >
                    {group.letter}
                </h2>

                <ul class="divide-paper-200 dark:divide-ink-800 divide-y">
                    {#each group.entries as entry, offset ( entry.id )}
                        <li><EntryCard {entry} index={group.start + offset} /></li>
                    {/each}
                </ul>
            </section>
        {/each}
    {:else}
        <section class="mt-6">
            <h2 class="text-muted text-sm font-medium">{listingHeading}</h2>

            <ul class="divide-paper-200 dark:divide-ink-800 mt-1 divide-y">
                {#each filtered as entry, index ( entry.id )}
                    <li><EntryCard {entry} {index} /></li>
                {/each}
            </ul>
        </section>
    {/if}
</div>
