<script lang="ts">
    /**
     * Search palette, opened from the header or with Ctrl+K.
     *
     * @author Claude
     */
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { staggerRank } from "$lib/config/motion";
    import { wiki } from "$lib/state/wiki.svelte";
    import { searchEntries } from "$lib/utilities/search";
    import TypeBadge from "./TypeBadge.svelte";

    interface Props {
        open: boolean;
    }

    let { open = $bindable( false ) }: Props = $props();

    let dialog: HTMLDialogElement | null = $state( null );
    let input: HTMLInputElement | null = $state( null );
    let query = $state( "" );
    let selected = $state( 0 );

    // Drafts are searchable too: there is no audience to hide them from.
    const hits = $derived( query.trim().length > 0 ? searchEntries( wiki.entries, query, 8 ) : [] );

    $effect( () =>
    {
        if ( !dialog )
        {
            return;
        }

        if ( open && !dialog.open )
        {
            dialog.showModal();
            input?.focus();
        }
        else if ( !open && dialog.open )
        {
            dialog.close();
        }
    } );

    // Any new query starts the selection back at the first hit.
    $effect( () =>
    {
        void query;
        selected = 0;
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
        goto( resolve( `/wiki/${ slug }` ) );
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

<dialog
    bind:this={dialog}
    onclose={() => ( open = false )}
    onclick={( event ) =>
    {
        if ( event.target === dialog )
        {
            open = false;
        }
    }}
    class="backdrop:bg-ink-950/60 dark:bg-ink-900 border-paper-200 dark:border-ink-800 mx-auto mt-[12vh] w-[min(38rem,92vw)] rounded-2xl border bg-white p-0 shadow-2xl backdrop:backdrop-blur-sm"
    aria-label="Rechercher une fiche"
>
    <div class="border-paper-200 dark:border-ink-800 border-b p-3">
        <input
            bind:this={input}
            bind:value={query}
            onkeydown={onKeydown}
            type="search"
            class="field border-0 bg-transparent text-base focus:ring-0 dark:bg-transparent"
            placeholder="Rechercher un personnage, un lieu, un événement..."
            autocomplete="off"
        />
    </div>

    <div class="max-h-[55vh] overflow-y-auto p-2">
        {#if query.trim().length === 0}
            <p class="text-muted px-3 py-6 text-center text-sm">
                {wiki.entries.length} fiches consultables. Tapez pour chercher.
            </p>
        {:else if hits.length === 0}
            <p class="text-muted px-3 py-6 text-center text-sm">
                Aucune fiche ne correspond à « {query} ».
            </p>
        {:else}
            <ul>
                {#each hits as hit, index ( hit.entry.id )}
                    <li class="rise-in" style="--rank: {staggerRank( index )}">
                        <button
                            type="button"
                            class="hover:bg-paper-100 dark:hover:bg-ink-800 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition {index
                              === selected
                                ? "bg-paper-100 dark:bg-ink-800"
                                : ""}"
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
        {/if}
    </div>
</dialog>
