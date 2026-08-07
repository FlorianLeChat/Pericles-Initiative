<script lang="ts">
    /**
     * Picks the page an internal link should point at.
     *
     * A title that matches nothing is not a dead end: it produces a red link,
     * which is how a page gets planned before it gets written.
     *
     * @author Claude
     */
    import TypeBadge from "$lib/components/TypeBadge.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import { searchEntries } from "$lib/utilities/search";
    import { slugify } from "$lib/utilities/slug";

    interface Props {
        open: boolean;
        /** Called with the target slug and the label to display. */
        onselect: ( slug: string, label: string ) => void;
    }

    let { open = $bindable( false ), onselect }: Props = $props();

    let dialog: HTMLDialogElement | null = $state( null );
    let input: HTMLInputElement | null = $state( null );
    let query = $state( "" );

    const trimmed = $derived( query.trim() );
    const hits = $derived( trimmed.length > 0 ? searchEntries( wiki.entries, trimmed, 8 ) : [] );
    const plannedSlug = $derived( trimmed.length > 0 ? slugify( trimmed ) : "" );
    const isNew = $derived( plannedSlug.length > 0 && !wiki.slugs.has( plannedSlug ) );

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

    /**
     * Sends the chosen target back and closes the dialog.
     *
     * @param slug Target page slug.
     * @param label Link text.
     * @author Claude
     */
    const choose = ( slug: string, label: string ): void =>
    {
        onselect( slug, label );
        open = false;
        query = "";
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
    class="backdrop:bg-ink-950/60 dark:bg-ink-900 border-paper-200 dark:border-ink-800 mx-auto mt-[12vh] w-[min(34rem,92vw)] rounded-2xl border bg-white p-0 shadow-2xl"
    aria-label="Lier une fiche"
>
    <div class="border-paper-200 dark:border-ink-800 border-b p-4">
        <p class="mb-2 text-sm font-medium">Lier une fiche</p>

        <input
            bind:this={input}
            bind:value={query}
            onkeydown={( event ) =>
            {
                if ( event.key === "Enter" )
                {
                    event.preventDefault();
                    const first = hits[ 0 ];
                    if ( first )
                    {
                        choose( first.entry.slug, first.entry.title );
                    }
                    else if ( isNew )
                    {
                        choose( plannedSlug, trimmed );
                    }
                }
            }}
            type="search"
            class="field"
            placeholder="Titre de la fiche à lier"
            autocomplete="off"
        />
    </div>

    <div class="max-h-[50vh] overflow-y-auto p-2">
        {#if trimmed.length === 0}
            <p class="text-ink-400 px-3 py-6 text-center text-sm">
                Cherchez une fiche existante, ou tapez un titre inédit pour poser un lien rouge.
            </p>
        {:else}
            <ul>
                {#each hits as hit ( hit.entry.id )}
                    <li>
                        <button
                            type="button"
                            class="hover:bg-paper-100 dark:hover:bg-ink-800 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition"
                            onclick={() => choose( hit.entry.slug, hit.entry.title )}
                        >
                            <TypeBadge type={hit.entry.type} iconOnly />

                            <span class="min-w-0 flex-1">
                                <span class="block truncate text-sm font-medium">{hit.entry.title}</span>

                                <span class="text-ink-400 block truncate font-mono text-xs">
                                    /wiki/{hit.entry.slug}
                                </span>
                            </span>
                        </button>
                    </li>
                {/each}

                {#if isNew}
                    <li>
                        <button
                            type="button"
                            class="hover:bg-paper-100 dark:hover:bg-ink-800 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition"
                            onclick={() => choose( plannedSlug, trimmed )}
                        >
                            <span
                                class="border-alert-500/40 text-alert-500 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-dashed text-xs"
                                aria-hidden="true"
                            >
                                +
                            </span>

                            <span class="min-w-0 flex-1">
                                <span class="block truncate text-sm font-medium">
                                    Lien rouge vers « {trimmed} »
                                </span>

                                <span class="text-ink-400 block truncate font-mono text-xs">
                                    /wiki/{plannedSlug}
                                </span>
                            </span>
                        </button>
                    </li>
                {/if}
            </ul>
        {/if}
    </div>
</dialog>
