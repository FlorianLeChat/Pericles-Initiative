<script lang="ts">
    /**
     * Reorderable list of the pages featured on the home page.
     *
     * Owns the add, reorder and remove interactions, so the settings page only
     * has to seed and read the list of slugs.
     *
     * @author Claude
     */
    import ArrowDown from "@lucide/svelte/icons/arrow-down";
    import ArrowUp from "@lucide/svelte/icons/arrow-up";
    import X from "@lucide/svelte/icons/x";
    import Button from "flowbite-svelte/Button.svelte";
    import type { Snippet } from "svelte";
    import { resolve } from "$app/paths";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import EntryPicker from "../editor/EntryPicker.svelte";

    interface Props {
        /** Slugs of the featured pages, most prominent first. */
        slugs: string[];
        /** Control writing the list down, rendered at the foot of the card. */
        actions: Snippet;
    }

    let { slugs = $bindable(), actions }: Props = $props();

    let pickerOpen = $state( false );
</script>

<section class="surface p-6">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="font-serif text-xl font-semibold tracking-tight">{m.featured_pages_heading()}</h2>

        <button
            type="button"
            class="text-accent-600 dark:text-accent-400 text-xs underline"
            onclick={() => ( pickerOpen = true )}
        >
            {m.featured_pages_add()}
        </button>
    </div>

    <p class="text-muted mt-1 text-sm leading-relaxed">
        {m.featured_pages_description()}
    </p>

    {#if slugs.length === 0}
        <p class="text-muted mt-4 text-sm">{m.featured_pages_empty()}</p>
    {:else}
        <ol class="mt-4 space-y-2">
            {#each slugs as slug, index ( slug )}
                {@const entry = wiki.bySlug( slug )}

                <li class="border-paper-200 dark:border-ink-800 flex items-center gap-3 rounded-xl border p-3">
                    <span class="text-muted font-mono text-xs">{index + 1}</span>

                    <span class="min-w-0 flex-1">
                        {#if entry}
                            <a href={resolve( `/wiki/${ slug }/` )} class="text-sm font-medium">{entry.title}</a>
                        {:else}
                            <span class="text-alert-500 font-mono text-xs">{m.featured_pages_missing( { slug } )}</span>
                        {/if}
                    </span>

                    <Button
                        color="alternative"
                        class="h-9 w-9 shrink-0 border-0 p-0"
                        disabled={index === 0}
                        onclick={() =>
                        {
                            const next = [ ...slugs ];
                            [ next[ index - 1 ], next[ index ] ] = [ next[ index ], next[ index - 1 ] ];
                            slugs = next;
                        }}
                        aria-label={m.common_move_up( { name: entry?.title ?? slug } )}
                    >
                        <ArrowUp class="h-4 w-4" />
                    </Button>

                    <Button
                        color="alternative"
                        class="h-9 w-9 shrink-0 border-0 p-0"
                        disabled={index === slugs.length - 1}
                        onclick={() =>
                        {
                            const next = [ ...slugs ];
                            [ next[ index ], next[ index + 1 ] ] = [ next[ index + 1 ], next[ index ] ];
                            slugs = next;
                        }}
                        aria-label={m.common_move_down( { name: entry?.title ?? slug } )}
                    >
                        <ArrowDown class="h-4 w-4" />
                    </Button>

                    <Button
                        color="alternative"
                        class="hover:text-alert-500 h-9 w-9 shrink-0 border-0 p-0"
                        onclick={() => ( slugs = slugs.filter( ( item ) => item !== slug ) )}
                        aria-label={m.common_remove_item( { name: entry?.title ?? slug } )}
                    >
                        <X class="h-4 w-4" />
                    </Button>
                </li>
            {/each}
        </ol>
    {/if}

    <div class="mt-5">{@render actions()}</div>
</section>

<EntryPicker
    bind:open={pickerOpen}
    onselect={( slug ) =>
    {
        if ( !slugs.includes( slug ) )
        {
            slugs = [ ...slugs, slug ];
        }
    }}
/>
