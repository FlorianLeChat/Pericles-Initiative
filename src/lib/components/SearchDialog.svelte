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
    import Input from "flowbite-svelte/Input.svelte";
    import Modal from "flowbite-svelte/Modal.svelte";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { MODAL_MOBILE_FULLSCREEN } from "$lib/config/dialogs";
    import { staggerRank } from "$lib/config/motion";
    import { wiki } from "$lib/state/wiki.svelte";
    import { counted } from "$lib/utilities/plural";
    import { searchEntries } from "$lib/utilities/search";
    import TypeBadge from "./TypeBadge.svelte";

    interface Props {
        open: boolean;
    }

    let { open = $bindable( false ) }: Props = $props();

    const LIST_ID = "recherche-resultats";

    let input: HTMLInputElement | undefined = $state();
    let query = $state( "" );
    let selected = $state( 0 );

    // Drafts are searchable too: there is no audience to hide them from.
    const hits = $derived( query.trim().length > 0 ? searchEntries( wiki.entries, query, 8 ) : [] );

    /** Identifier of the option the arrows are currently on, empty when there is none. */
    const activeId = $derived( hits[ selected ] ? `recherche-resultat-${ selected }` : undefined );

    /** Sentence announced to assistive technology whenever the hits change. */
    const announcement = $derived.by( () =>
    {
        if ( query.trim().length === 0 )
        {
            return "";
        }

        if ( hits.length === 0 )
        {
            return "Aucun résultat.";
        }

        return `${ counted( hits.length, "résultat" ) }.`;
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

    // Emptied on the way out, so the palette reopens on a blank field rather
    // than on the query of the last visit, which typing would append to.
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
        void goto( resolve( `/wiki/${ slug }` ) );
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
            selected = Math.min( selected + 1, hits.length - 1 );
        }
        else if ( event.key === "ArrowUp" )
        {
            event.preventDefault();
            selected = Math.max( selected - 1, 0 );
        }
        else if ( event.key === "Enter" )
        {
            const hit = hits[ selected ];

            if ( hit )
            {
                event.preventDefault();
                openEntry( hit.entry.slug );
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
    class="border-paper-200 text-ink-800 dark:border-ink-800 dark:bg-ink-900 dark:text-paper-200 mt-[8dvh]
           max-h-[80dvh] rounded-2xl border {MODAL_MOBILE_FULLSCREEN}"
    classes={{
        header: "border-paper-200 dark:border-ink-800 p-3",
        body: "p-2"
    }}
    aria-label="Rechercher une fiche"
>
    {#snippet header()}
        <div class="w-full">
            <Input
                bind:elementRef={input}
                bind:value={query}
                onkeydown={onKeydown}
                type="text"
                role="combobox"
                aria-expanded={hits.length > 0}
                aria-controls={LIST_ID}
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                aria-label="Rechercher une fiche"
                class="w-full border-0 bg-transparent px-2 py-1.5 text-base focus:border-transparent focus:ring-0
                       dark:bg-transparent"
                placeholder="Rechercher un personnage, un lieu, un événement..."
                autocomplete="off"
            />
        </div>
    {/snippet}

    <p class="sr-only" role="status" aria-live="polite">{announcement}</p>

    {#if query.trim().length === 0}
        <p class="text-muted px-3 py-6 text-center text-sm">
            {wiki.entries.length} fiches consultables. Tapez pour chercher.
        </p>
    {:else if hits.length === 0}
        <p class="text-muted px-3 py-6 text-center text-sm">
            Aucune fiche ne correspond à « {query} ».
        </p>
    {/if}

    <ul id={LIST_ID} role="listbox" aria-label="Fiches trouvées">
        {#each hits as hit, index ( hit.entry.id )}
            <li role="none">
                <button
                    id="recherche-resultat-{index}"
                    type="button"
                    role="option"
                    tabindex="-1"
                    aria-selected={index === selected}
                    class="rise-in hover:bg-paper-100 dark:hover:bg-ink-800 flex w-full items-center
                           gap-3 rounded-xl px-3 py-2.5 text-left transition {index === selected
                               ? "bg-paper-100 dark:bg-ink-800"
                               : ""}"
                    style="--rank: {staggerRank( index )}"
                    onclick={() => openEntry( hit.entry.slug )}
                    onmouseenter={() => ( selected = index )}
                >
                    <TypeBadge type={hit.entry.type} iconOnly />

                    <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-medium">{hit.entry.title}</span>

                        {#if hit.entry.summary}
                            <span class="text-muted block truncate text-xs">{hit.entry.summary}</span>
                        {/if}
                    </span>
                </button>
            </li>
        {/each}
    </ul>
</Modal>
