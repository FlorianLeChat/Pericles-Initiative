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
     * Below `sm` the field is followed by a «Fermer» text button. A phone has no
     * Escape key, and the top sheet left the only way out on the backdrop under
     * it, a strip the open keyboard mostly covers. Flowbite's own cross stays off
     * (`dismissable={false}`), for its English name; the button is written here,
     * like the other crosses of the site.
     *
     * A hit says why it came up: its first category with its dot, the terms of
     * the query set in bold wherever they appear, and under the title the line
     * that matched, another name, the summary or a passage of the body. After the
     * hits come up to three red links the query names, drawn as the article draws
     * them, with how many pages cite each: a page still to write is part of the
     * world too, and choosing one opens its red link page, which shows who waits
     * for it and offers to write it. Then two more options: every result in the
     * encyclopedia, through the same search, and the creation of a page titled
     * after the query, offered unless a page or a red link already bears that
     * exact title or the device is set to read only.
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
    import { getLocale } from "#lib/locales/runtime.js";
    import { staggerRank } from "#lib/config/motion.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import type { Category, Entry } from "#lib/types.ts";
    import { paletteColor } from "#lib/config/palette.ts";
    import { reading } from "#lib/state/reading.svelte.ts";
    import ArrowRight from "@lucide/svelte/icons/arrow-right";
    import { MODAL_MOBILE_FULLSCREEN } from "#lib/config/dialogs.ts";
    import { ENTRIES_QUERY_PARAMETER } from "#lib/config/navigation.ts";
    import { deburr, humanizeSlug, slugify } from "#lib/utilities/slug.ts";
    import { bodyExcerpt, markTerms, searchEntries, searchMissing, type SearchHit } from "#lib/utilities/search.ts";

    interface Props {
        open: boolean;
    }

    let { open = $bindable( false ) }: Props = $props();

    const LIST_ID = "search-results";

    /**
     * Ink of a matched term. A red link's title keeps its catalogue red instead:
     * set in ink, the term split «Varga family» into a black and a red half.
     */
    const MATCH_INK = "text-ink-900 dark:text-paper-50";

    let input: HTMLInputElement | undefined = $state();
    let query = $state( "" );
    let selected = $state( 0 );

    /** Pages offered before anything is typed, so the palette is never an empty box. */
    const RECENT_COUNT = 5;

    const searching = $derived( query.trim().length > 0 );

    /** Hits the palette shows at most; every other one is a step away, in the index. */
    const HIT_COUNT = 8;

    /** Pages still to write the palette names at most, after the hits. */
    const MISSING_COUNT = 3;

    /** One line of the list the arrows move through. */
    type Row
        = | { kind: "entry"; entry: Entry; hit?: SearchHit }
          | { kind: "missing"; slug: string; title: string; count: number }
          | { kind: "all" }
          | { kind: "create" };

    const hits = $derived( searching ? searchEntries( wiki.entries, query, HIT_COUNT ) : [] );

    const missing = $derived(
        searching
            ? searchMissing( wiki.missingLinks, query, MISSING_COUNT ).map( ( item ) => ( {
                kind: "missing" as const,
                slug: item.slug,
                title: humanizeSlug( item.slug ),
                count: item.from.length
            } ) )
            : []
    );

    /**
     * True when a page already bears the title typed, or a red link already waits
     * under it: creating it again would only duplicate the one, and the other is
     * offered above with the pages citing it.
     */
    const titleTaken = $derived.by( () =>
    {
        const typed = deburr( query.trim() );
        const written = wiki.entries.some( ( entry ) => deburr( entry.title ) === typed );
        const waiting = missing.some( ( item ) => deburr( item.title ) === typed );

        return written || waiting;
    } );

    /**
     * Title a page created from the query starts with: the query as typed, its
     * first letter raised, since a title always opens on a capital and a search
     * is mostly typed in lower case.
     */
    const proposedTitle = $derived.by( () =>
    {
        const typed = query.trim();
        return typed.charAt( 0 ).toLocaleUpperCase( getLocale() ) + typed.slice( 1 );
    } );

    /** Hits and pages still to write together, what the announcement counts. */
    const foundCount = $derived( hits.length + missing.length );

    /**
     * What the arrows move through: the hits of a query followed by its two
     * further options, or the pages edited last while nothing is typed yet.
     */
    const rows = $derived.by( (): Row[] =>
    {
        if ( !searching )
        {
            return wiki.recentlyUpdated.slice( 0, RECENT_COUNT ).map( ( entry ) => ( { kind: "entry", entry } ) );
        }

        const found: Row[] = hits.map( ( hit ) => ( { kind: "entry", entry: hit.entry, hit } ) );
        const all: Row[] = hits.length > 0 ? [ { kind: "all" } ] : [];
        const offersCreation = !titleTaken && !reading.enabled;
        const create: Row[] = offersCreation ? [ { kind: "create" } ] : [];

        return [ ...found, ...missing, ...all, ...create ];
    } );

    /** Number of options the arrows can land on. */
    const optionCount = $derived( rows.length );

    /** Position of the first option that acts rather than opens a page, which a hairline sets apart. */
    const firstAction = $derived( rows.findIndex( ( row ) => row.kind === "all" || row.kind === "create" ) );

    /**
     * Muted text inside an option. The site's `.text-muted` softens the dark
     * theme's `paper-400` to 80%, which on the `ink-800` of a selected or
     * hovered row fell to 4.37:1 at 12px; the full stop holds 4.5:1 there.
     */
    const OPTION_MUTED = "text-ink-400 dark:text-paper-400";

    /** Hairline drawn above the options following the hits. */
    const ACTIONS_DIVIDER = "border-paper-200 dark:border-ink-700 mt-1 border-t pt-1";

    /** Look of an option that acts rather than opens a page: an accent label, like a link. */
    const ACTION_OPTION = "text-accent-600 dark:text-accent-400 text-sm font-medium";

    /** Identifier of the option the arrows are currently on, empty when there is none. */
    const activeId = $derived( selected < optionCount ? `search-result-${ selected }` : undefined );

    /** Sentence announced to assistive technology whenever the hits change. */
    const announcement = $derived.by( () =>
    {
        if ( query.trim().length === 0 )
        {
            return "";
        }

        if ( foundCount === 0 )
        {
            return m.search_dialog_no_results();
        }

        return pluralize( foundCount, { one: m.search_dialog_result_one, other: m.search_dialog_result_other } );
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
        const title = proposedTitle;

        open = false;
        query = "";
        void goto( resolve( `new/?slug=${ encodeURIComponent( slugify( title ) ) }&titre=${ encodeURIComponent( title ) }` ) );
    };

    /**
     * Opens the index filtered by the query, which runs the same search without a limit.
     *
     * @author Claude
     */
    const openAll = (): void =>
    {
        const keyword = query.trim();

        open = false;
        query = "";
        void goto( resolve( `entries/?${ ENTRIES_QUERY_PARAMETER }=${ encodeURIComponent( keyword ) }` ) );
    };

    /**
     * Acts on a row, the way pressing it does.
     *
     * @param row Row chosen.
     * @author Claude
     */
    const choose = ( row: Row ): void =>
    {
        if ( row.kind === "entry" )
        {
            openEntry( row.entry.slug );
        }
        else if ( row.kind === "missing" )
        {
            openEntry( row.slug );
        }
        else if ( row.kind === "all" )
        {
            openAll();
        }
        else
        {
            createEntry();
        }
    };

    /**
     * Tells whether a row leads to a page, written or still to write, rather
     * than acting on the query.
     *
     * @param row Row of the list.
     * @returns True for a hit or a red link.
     * @author Claude
     */
    const opensPage = ( row: Row ): boolean => row.kind === "entry" || row.kind === "missing";

    /**
     * Key of a row in the keyed list, stable across queries for the same page.
     *
     * @param row Row of the list.
     * @returns The page id, the address of a red link, or the kind of an action.
     * @author Claude
     */
    const keyOf = ( row: Row ): string =>
    {
        if ( row.kind === "entry" )
        {
            return row.entry.id;
        }

        return row.kind === "missing" ? `missing-${ row.slug }` : row.kind;
    };

    /**
     * Name of a page's first category, the one its dot is drawn in.
     *
     * @param entry The page.
     * @returns The category, or undefined for a page filed nowhere.
     * @author Claude
     */
    const firstCategory = ( entry: Entry ): Category | undefined =>
        wiki.categoriesBySlug.get( entry.categories[ 0 ] ?? "" );

    /**
     * The line set under the title of a hit, the one that explains it.
     *
     * @param row Row of a page.
     * @returns The matched alias, the summary or a passage of the body, empty when
     *          the title or the category already says it all and there is no summary.
     * @author Claude
     */
    const detailOf = ( row: Extract<Row, { kind: "entry" }> ): string =>
    {
        if ( row.hit?.reason === "alias" && row.hit.alias )
        {
            return m.search_dialog_reason_alias( { alias: row.hit.alias } );
        }

        if ( row.hit?.reason === "body" )
        {
            return bodyExcerpt( row.entry, query ) || row.entry.summary;
        }

        return row.entry.summary;
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
            const row = rows.at( selected );

            if ( row )
            {
                event.preventDefault();
                choose( row );
            }
        }
    };
</script>

{#snippet marked( text: string, keepColor: boolean )}
    {#each markTerms( text, query ) as segment, index ( index )}
        {#if segment.match}
            <mark class="{keepColor ? "text-inherit" : MATCH_INK} bg-transparent font-bold">{segment.text}</mark>
        {:else}
            {segment.text}
        {/if}
    {/each}
{/snippet}

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
        <div class="flex w-full items-center gap-2">
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

            <button
                type="button"
                class="text-accent-700 dark:text-accent-300 hover:bg-paper-100 dark:hover:bg-ink-800 inline-flex
                       min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium transition-colors sm:hidden"
                onclick={() => ( open = false )}
            >
                {m.search_dialog_close()}
            </button>
        </div>
    {/snippet}

    <p class="sr-only" role="status" aria-live="polite">{announcement}</p>

    {#if searching && foundCount === 0}
        <p class="text-muted px-3 pt-3 pb-1 text-sm">{m.search_dialog_empty( { query } )}</p>
    {:else if !searching && rows.length > 0}
        <p class="text-muted px-3 pt-2 pb-1 text-xs">{m.search_dialog_recent_heading()}</p>
    {/if}

    <ul id={LIST_ID} role="listbox" aria-label={m.search_dialog_results_aria()}>
        {#each rows as row, index ( keyOf( row ) )}
            {@const active = index === selected}

            <li role="none" class={index > 0 && index === firstAction ? ACTIONS_DIVIDER : ""}>
                <button
                    id="search-result-{index}"
                    type="button"
                    role="option"
                    tabindex="-1"
                    aria-selected={active}
                    class="hover:bg-paper-100 dark:hover:bg-ink-800 flex w-full items-center gap-3 rounded-lg px-3
                           py-2.5 text-left transition-colors {active ? "bg-paper-100 dark:bg-ink-800" : ""}
                           {opensPage( row ) ? "rise-in" : ACTION_OPTION}"
                    style={opensPage( row ) ? `--rank: ${ staggerRank( index ) }` : undefined}
                    onclick={() => choose( row )}
                    onmouseenter={() => ( selected = index )}
                >
                    {#if row.kind === "entry"}
                        {@const category = firstCategory( row.entry )}
                        {@const detail = detailOf( row )}

                        <span class="min-w-0 flex-1">
                            <span class="flex items-baseline gap-3">
                                <span class="min-w-0 flex-1 truncate text-sm font-medium">
                                    {@render marked( row.entry.title, false )}
                                </span>

                                {#if category}
                                    <span class="{OPTION_MUTED} flex shrink-0 items-center gap-1.5 text-xs">
                                        <span
                                            class="h-2 w-2 shrink-0 rounded-full {paletteColor( category.color ).dot}"
                                            aria-hidden="true"
                                        ></span>
                                        {category.name}
                                    </span>
                                {/if}
                            </span>

                            {#if detail}
                                <span class="{OPTION_MUTED} block truncate text-xs">{@render marked( detail, false )}</span>
                            {/if}
                        </span>
                    {:else if row.kind === "missing"}
                        <span class="min-w-0 flex-1">
                            <span class="wiki-link-missing block truncate text-sm font-medium">
                                {@render marked( row.title, true )}
                            </span>

                            <span class="{OPTION_MUTED} block truncate text-xs">
                                {pluralize( row.count, { one: m.search_dialog_missing_one, other: m.search_dialog_missing_other } )}
                            </span>
                        </span>
                    {:else if row.kind === "all"}
                        <ArrowRight class="h-4 w-4 shrink-0" />
                        {m.search_dialog_see_all( { query: query.trim() } )}
                    {:else}
                        <Plus class="h-4 w-4 shrink-0" />
                        {m.search_dialog_create( { query: proposedTitle } )}
                    {/if}
                </button>
            </li>
        {/each}
    </ul>

    {#if !searching}
        <p class="text-muted border-paper-200 dark:border-ink-700 mt-2 border-t px-3 pt-3 pb-1 text-xs">
            {m.search_dialog_all_hint( { count: wiki.entries.length } )}
        </p>
    {/if}
</Modal>
