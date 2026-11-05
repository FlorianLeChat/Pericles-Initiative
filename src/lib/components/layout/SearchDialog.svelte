<script lang="ts">
    /**
     * Search palette, opened from the header or with Ctrl+K.
     *
     * The arrow keys move a selection that used to be visual only: the input is
     * declared as a combobox owning the list of hits, and points at the active
     * one through `aria-activedescendant`, so a screen reader announces what the
     * arrows land on.
     *
     * Each hit is a button wearing the `option` role: the role is what the
     * combobox pattern asks for, and the button is what makes a click a native
     * activation rather than a handler on an inert element. They are taken out of
     * the tab order, since that same pattern requires focus never to leave the
     * input.
     *
     * The field is a plain text input rather than a `search` one on purpose. A
     * search field spends the first Escape emptying itself, so closing the
     * palette took two presses, and answering the key here instead raced with
     * Flowbite's own handling of the dialog. Dropping the type lets the browser
     * close the dialog on the first press, which is both the simplest path and
     * the only one with no race in it. The only thing lost is the small clear
     * cross Chromium draws, which the palette has no use for.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import { goto } from "$app/navigation";
    import Plus from "@lucide/svelte/icons/plus";
    import * as m from "#lib/locales/messages.js";
    import Input from "flowbite-svelte/Input.svelte";
    import Modal from "flowbite-svelte/Modal.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import { slugify } from "#lib/utilities/slug.ts";
    import { staggerRank } from "#lib/config/motion.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { searchEntries } from "#lib/utilities/search.ts";
    import { MODAL_MOBILE_FULLSCREEN } from "#lib/config/dialogs.ts";

    interface Props {
        open: boolean;
    }

    let { open = $bindable( false ) }: Props = $props();

    const LIST_ID = "recherche-resultats";

    let input: HTMLInputElement | undefined = $state();
    let query = $state( "" );
    let selected = $state( 0 );

    /** Pages offered before anything is typed, so the palette is never an empty box. */
    const RECENT_COUNT = 5;

    const searching = $derived( query.trim().length > 0 );

    const hits = $derived( searching ? searchEntries( wiki.entries, query, 8 ) : [] );

    /**
     * What the arrows move through: the hits of a query, or the pages edited last
     * while nothing is typed yet. A query matching nothing offers to create the page
     * instead, as its one option.
     */
    const options = $derived(
        searching ? hits.map( ( hit ) => hit.entry ) : wiki.recentlyUpdated.slice( 0, RECENT_COUNT )
    );

    const offersCreation = $derived( searching && hits.length === 0 );

    /** Number of options the arrows can land on, the creation one included. */
    const optionCount = $derived( offersCreation ? 1 : options.length );

    /** Identifier of the option the arrows are currently on, empty when there is none. */
    const activeId = $derived( selected < optionCount ? `recherche-resultat-${ selected }` : undefined );

    /** Sentence announced to assistive technology whenever the hits change. */
    const announcement = $derived.by( () =>
    {
        if ( query.trim().length === 0 )
        {
            return "";
        }

        if ( hits.length === 0 )
        {
            return m.search_dialog_no_results();
        }

        return pluralize( hits.length, { one: m.search_dialog_result_one, other: m.search_dialog_result_other } );
    } );

    // The palette is mounted by the layout and never unmounted, so the field has
    // to be focused when it opens rather than on mount. Flowbite focuses the first
    // control of the dialog on its own, but only once, and reopening has to work
    // just as well as the first time.
    $effect( () =>
    {
        if ( open )
        {
            input?.focus();
        }
    } );

    $effect( () =>
    {
        void query;
        selected = 0;
    } );

    $effect( () =>
    {
        if ( !open )
        {
            query = "";
        }
    } );

    /**
     * Navigates to a page and closes the palette.
     *
     * @param slug Slug of the page to open.
     * @author Claude
     */
    const openEntry = ( slug: string ): void =>
    {
        open = false;
        query = "";
        void goto( resolve( `entries/${ slug }/` ) );
    };

    /**
     * Opens the editor on a new page titled after the query, and closes the palette.
     *
     * @author Claude
     */
    const createEntry = (): void =>
    {
        const title = query.trim();

        open = false;
        query = "";
        void goto( resolve( `new/?slug=${ encodeURIComponent( slugify( title ) ) }&titre=${ encodeURIComponent( title ) }` ) );
    };

    /**
     * Handles arrow navigation and validation inside the palette.
     *
     * @param event Keyboard event from the input.
     * @author Claude
     */
    const onKeydown = ( event: KeyboardEvent ): void =>
    {
        if ( event.key === "ArrowDown" )
        {
            event.preventDefault();
            selected = Math.min( selected + 1, optionCount - 1 );
        }
        else if ( event.key === "ArrowUp" )
        {
            event.preventDefault();
            selected = Math.max( selected - 1, 0 );
        }
        else if ( event.key === "Enter" )
        {
            const option = options[ selected ];

            if ( offersCreation )
            {
                event.preventDefault();
                createEntry();
            }
            else if ( option )
            {
                event.preventDefault();
                openEntry( option.slug );
            }
        }
    };
</script>

<Modal
    bind:open
    size="md"
    placement="top-center"
    dismissable={false}
    transitionParams={{ duration: 0 }}
    class="border-paper-200 text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-paper-200 mt-[8dvh]
           max-h-[80dvh] rounded-2xl border {MODAL_MOBILE_FULLSCREEN}"
    classes={{
        header: "border-paper-200 dark:border-ink-700 p-3",
        body: "p-2"
    }}
    aria-label={m.search_dialog_aria_label()}
>
    {#snippet header()}
        <div class="w-full">
            <Input
                bind:elementRef={input}
                bind:value={query}
                onkeydown={onKeydown}
                type="text"
                role="combobox"
                aria-expanded={optionCount > 0}
                aria-controls={LIST_ID}
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                aria-label={m.search_dialog_aria_label()}
                class="w-full border-0 bg-transparent px-2 py-1.5 text-base focus:border-transparent focus:ring-0
                       dark:bg-transparent"
                placeholder={m.search_dialog_placeholder()}
                autocomplete="off"
            />
        </div>
    {/snippet}

    <p class="sr-only" role="status" aria-live="polite">{announcement}</p>

    {#if offersCreation}
        <p class="text-muted px-3 pt-3 pb-1 text-sm">{m.search_dialog_empty( { query } )}</p>
    {:else if !searching && options.length > 0}
        <p class="text-muted px-3 pt-2 pb-1 text-xs">{m.search_dialog_recent_heading()}</p>
    {/if}

    <ul id={LIST_ID} role="listbox" aria-label={m.search_dialog_results_aria()}>
        {#if offersCreation}
            <li role="none">
                <button
                    id="recherche-resultat-0"
                    type="button"
                    role="option"
                    tabindex="-1"
                    aria-selected={selected === 0}
                    class="text-accent-600 dark:text-accent-400 hover:bg-paper-100 dark:hover:bg-ink-800 flex w-full
                           items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors
                           {selected === 0 ? "bg-paper-100 dark:bg-ink-800" : ""}"
                    onclick={createEntry}
                >
                    <Plus class="h-4 w-4 shrink-0" />
                    {m.search_dialog_create( { query: query.trim() } )}
                </button>
            </li>
        {:else}
            {#each options as entry, index ( entry.id )}
                <li role="none">
                    <button
                        id="recherche-resultat-{index}"
                        type="button"
                        role="option"
                        tabindex="-1"
                        aria-selected={index === selected}
                        class="rise-in hover:bg-paper-100 dark:hover:bg-ink-800 flex w-full items-center gap-3 rounded-lg
                               px-3 py-2.5 text-left transition-colors {index === selected
                                   ? "bg-paper-100 dark:bg-ink-800"
                                   : ""}"
                        style="--rank: {staggerRank( index )}"
                        onclick={() => openEntry( entry.slug )}
                        onmouseenter={() => ( selected = index )}
                    >
                        <span class="min-w-0 flex-1">
                            <span class="block truncate text-sm font-medium">{entry.title}</span>

                            {#if entry.summary}
                                <span class="text-muted block truncate text-xs">{entry.summary}</span>
                            {/if}
                        </span>
                    </button>
                </li>
            {/each}
        {/if}
    </ul>

    {#if !searching}
        <p class="text-muted border-paper-200 dark:border-ink-700 mt-2 border-t px-3 pt-3 pb-1 text-xs">
            {m.search_dialog_all_hint( { count: wiki.entries.length } )}
        </p>
    {/if}
</Modal>
