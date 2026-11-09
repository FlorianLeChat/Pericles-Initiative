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
     * The page has no «Nouvelle fiche» of its own. The header carries it from `lg`
     * and its drawer below, and a phone-only copy above the filters pushed the
     * search down for the reader who came to look something up.
     *
     * Filtered to drafts, on a device that writes, each row gains a checkbox and
     * the listing a row of its own above it: «Tout sélectionner», the count
     * chosen, and «Publier la sélection», an alternative pill since the header
     * already carries the one filled button. Publishing goes through the store in
     * one write, and the undo toast takes the whole publication back. Only the
     * rows still shown are published, so a selection hidden by a later filter is
     * never published unseen.
     *
     * An empty wiki gets no count line: «0 fiche, dont 0 en brouillon» and a hint
     * about filters nobody can see said less than the empty state under it, which
     * offers the demonstration as the home page and the dashboard do.
     *
     * @author Claude
     */
    import { page } from "$app/state";
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { sound } from "#lib/state/sound.svelte.ts";
    import { TOUCH_HEIGHT } from "#lib/config/forms.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { reading } from "#lib/state/reading.svelte.ts";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import { searchEntries } from "#lib/utilities/search.ts";
    import { earliestDateKey } from "#lib/utilities/date.ts";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import type { Entry, EntryFilterState } from "#lib/types.ts";
    import EntryCard from "#lib/components/wiki/EntryCard.svelte";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import { ENTRIES_QUERY_PARAMETER } from "#lib/config/navigation.ts";
    import { compareTitles, deburr, filingTitle } from "#lib/utilities/slug.ts";
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
        const keyword = page.url.searchParams.get( ENTRIES_QUERY_PARAMETER );
        const match = ENTRY_SORTS.find( ( option ) => option.value === requested );

        if ( match )
        {
            filters.sort = match.value;
        }

        if ( keyword )
        {
            filters.query = keyword;
        }
    } );

    /**
     * Pages the keyword finds, through the very search the palette runs.
     *
     * The palette hands its every result over to this listing, so the two have to
     * agree on what a keyword matches: every term somewhere in the title, another
     * name, the summary, a category or the body. Null while no keyword is typed.
     */
    const found = $derived.by( () =>
    {
        const keyword = filters.query.trim();

        if ( keyword.length === 0 )
        {
            return null;
        }

        return new Set( searchEntries( wiki.entries, keyword, Infinity ).map( ( hit ) => hit.entry.id ) );
    } );

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
            return found === null || found.has( entry.id );
        } );

        if ( filters.sort === "recent" )
        {
            return matching.sort( ( a, b ) => b.updatedAt.localeCompare( a.updatedAt ) );
        }
        if ( filters.sort === "chronologique" )
        {
            return matching.sort( ( a, b ) => earliestDateKey( a.dates ) - earliestDateKey( b.dates ) );
        }
        return matching.sort( ( a, b ) => compareTitles( a.title, b.title ) );
    } );

    /**
     * Rows of the alphabetical ordering, gathered under the letter they start
     * with, like the guide cards of a catalogue drawer, a leading article left
     * aside as the catalogue does: «The Long Night» files under L, and a corpus
     * of English titles no longer piles half its pages under T. Built in one
     * pass over a listing already sorted, so a letter is closed as soon as the
     * next appears.
     */
    const letterGroups = $derived.by( () =>
    {
        const groups: LetterGroup[] = [];

        filtered.forEach( ( entry, index ) =>
        {
            const initial = deburr( filingTitle( entry.title ) ).charAt( 0 );
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

    let selected = $state<string[]>( [] );

    const selecting = $derived( filters.status === "brouillon" && !reading.enabled );
    const selectedShown = $derived( filtered.filter( ( entry ) => selected.includes( entry.id ) ).map( ( entry ) => entry.id ) );
    const allSelected = $derived( filtered.length > 0 && selectedShown.length === filtered.length );

    /**
     * Adds a page to the selection, or takes it out.
     *
     * @param id Identifier of the page.
     * @author Claude
     */
    const toggle = ( id: string ): void =>
    {
        selected = selected.includes( id ) ? selected.filter( ( item ) => item !== id ) : [ ...selected, id ];
    };

    /**
     * Selects every row shown, or none when they all already are.
     *
     * @author Claude
     */
    const toggleAll = (): void =>
    {
        selected = allSelected ? [] : filtered.map( ( entry ) => entry.id );
    };

    /**
     * Publishes the selected rows still shown, and empties the selection.
     *
     * @author Claude
     */
    const publishSelection = (): void =>
    {
        wiki.publishEntries( selectedShown );
        sound.cue( "success", { emphasis: "strong" } );
        selected = [];
    };

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

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <div class="max-w-5xl">
        {#snippet counts()}
            {pluralize( wiki.entries.length, { one: m.common_count_fiche_one, other: m.common_count_fiche_other } )},
            {m.wiki_description_drafts( { count: wiki.drafts.length } )}
            {m.wiki_description_filter_hint()}
        {/snippet}

        <PageHeader title={m.common_encyclopedia_label()} description={wiki.entries.length > 0 ? counts : undefined} />

        {#if wiki.entries.length > 0}
            <div class="mt-8">
                <EntryFilters bind:filters shown={filtered.length} onreset={reset} />
            </div>
        {/if}

        {#snippet row( entry: Entry, index: number )}
            {#if selecting}
                <li class="flex items-start gap-3">
                    <Checkbox
                        data-cuelume-toggle
                        class="mt-4 shrink-0"
                        checked={selected.includes( entry.id )}
                        onchange={() => toggle( entry.id )}
                        aria-label={m.wiki_select_entry_aria( { title: entry.title } )}
                    />

                    <div class="min-w-0 flex-1"><EntryCard {entry} {index} /></div>
                </li>
            {:else}
                <li><EntryCard {entry} {index} /></li>
            {/if}
        {/snippet}

        {#if selecting && filtered.length > 0}
            <div
                class="border-paper-200 dark:border-ink-700 mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y py-2"
            >
                <Checkbox data-cuelume-toggle classes={{ div: "text-sm" }} checked={allSelected} onchange={toggleAll}>
                    {m.wiki_select_all()}
                </Checkbox>

                <span class="text-muted text-sm" role="status">
                    {pluralize( selectedShown.length, { one: m.wiki_selected_one, other: m.wiki_selected_other } )}
                </span>

                <Button
                    color="alternative"
                    size="sm"
                    class="ml-auto rounded-full {TOUCH_HEIGHT}"
                    disabled={selectedShown.length === 0}
                    onclick={publishSelection}
                >
                    {m.wiki_publish_selection()}
                </Button>
            </div>
        {/if}

        {#if wiki.entries.length === 0}
            <div class="mt-8">
                <EmptyState title={m.common_empty_wiki_title()} description={m.common_empty_wiki_description()}>
                    <Button href={resolve( "/new" )} color="alternative">{m.common_create_entry()}</Button>
                    <a href={resolve( "/data" )} class="wiki-link content-center text-sm text-balance {TOUCH_HEIGHT}">{m.home_empty_demo_link()}</a>
                </EmptyState>
            </div>
        {:else if filtered.length === 0}
            <div class="mt-6">
                <EmptyState title={m.wiki_no_match_title()} description={m.wiki_no_match_description()} />
            </div>
        {:else if isAlphabetical}
            {#each letterGroups as group, rank ( group.letter )}
                <section
                    class="border-paper-200 dark:border-ink-700 grid grid-cols-1 gap-x-4 sm:grid-cols-[2rem_minmax(0,1fr)]
                           {groupSpacing( rank )}"
                >
                    <h2
                        class="text-ink-800 dark:text-paper-200 pt-2.5 font-serif text-lg leading-none font-semibold
                               sm:sticky sm:top-20 sm:self-start sm:pt-3"
                    >
                        {group.letter}
                    </h2>

                    <ul class="divide-paper-200 dark:divide-ink-700 divide-y">
                        {#each group.entries as entry, offset ( entry.id )}
                            {@render row( entry, group.start + offset )}
                        {/each}
                    </ul>
                </section>
            {/each}
        {:else}
            <section class="mt-6">
                <h2 class="text-muted text-sm font-medium">{listingHeading}</h2>

                <ul class="divide-paper-200 dark:divide-ink-700 mt-1 divide-y">
                    {#each filtered as entry, index ( entry.id )}
                        {@render row( entry, index )}
                    {/each}
                </ul>
            </section>
        {/if}
    </div>
</div>
