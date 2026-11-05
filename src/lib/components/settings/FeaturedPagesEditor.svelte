<script lang="ts">
    /**
     * Reorderable list of the pages featured on the home page.
     *
     * Owns the add, reorder and remove interactions, so the settings page only
     * has to seed and read the list of slugs. Each row also says which place of the
     * home page it will take, since the order is the whole point of the list and a
     * page beyond the last place is kept but not shown.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import X from "@lucide/svelte/icons/x";
    import Plus from "@lucide/svelte/icons/plus";
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import ArrowUp from "@lucide/svelte/icons/arrow-up";
    import SettingsSection from "./SettingsSection.svelte";
    import EntryPicker from "../editor/EntryPicker.svelte";
    import ArrowDown from "@lucide/svelte/icons/arrow-down";
    import { FEATURED_LIST_LENGTH } from "#lib/config/featured.ts";

    interface Props {
        /** Slugs of the featured pages, most prominent first. */
        slugs: string[];
    }

    let { slugs = $bindable() }: Props = $props();

    let pickerOpen = $state( false );

    /** Classes of a row action: a borderless square the size of a fingertip. */
    const ROW_ACTION = "h-9 w-9 shrink-0 border-0 p-0";

    /**
     * Names the place of the home page a featured page takes.
     *
     * @param index Position of the page in the list, from zero.
     * @returns The place, or the fact that the page is not shown.
     * @author Claude
     */
    const slotOf = ( index: number ): string =>
    {
        if ( index === 0 )
        {
            return m.featured_pages_slot_lead();
        }

        const listed = index <= FEATURED_LIST_LENGTH;

        return listed ? m.featured_pages_slot_list() : m.featured_pages_slot_hidden();
    };

    /**
     * Swaps a page with its neighbour.
     *
     * @param index Position of the page that moves.
     * @param offset One step up, `-1`, or down, `1`.
     * @author Claude
     */
    const move = ( index: number, offset: -1 | 1 ): void =>
    {
        const next = [ ...slugs ];
        const target = index + offset;

        [ next[ index ], next[ target ] ] = [ next[ target ], next[ index ] ];
        slugs = next;
    };
</script>

{#snippet addButton()}
    <Button color="alternative" size="xs" class="gap-1.5 rounded-full" onclick={() => ( pickerOpen = true )}>
        <Plus class="h-3.5 w-3.5" />
        {m.featured_pages_add()}
    </Button>
{/snippet}

<SettingsSection heading={m.featured_pages_heading()} description={m.featured_pages_description()}>
    {#if slugs.length === 0}
        <div
            class="border-paper-300 dark:border-ink-700 flex flex-col items-center gap-3 rounded-xl border border-dashed
                   px-4 py-8 text-center"
        >
            <p class="text-muted text-sm">{m.featured_pages_empty()}</p>

            {@render addButton()}
        </div>
    {:else}
        <ol
            class="border-paper-200 divide-paper-200 dark:border-ink-700 dark:divide-ink-700 divide-y rounded-xl border"
            aria-label={m.featured_pages_list_label()}
        >
            {#each slugs as slug, index ( slug )}
                {@const entry = wiki.bySlug( slug )}
                {@const shown = index <= FEATURED_LIST_LENGTH}

                <li class="flex items-center gap-3 py-2 pr-1.5 pl-3">
                    <span class="text-muted w-4 shrink-0 text-center text-xs tabular-nums">{index + 1}</span>

                    <span class="min-w-0 flex-1 py-0.5">
                        {#if entry}
                            <a
                                href={resolve( `entries/${ slug }/` )}
                                class="text-ink-900 dark:text-paper-100 block truncate text-sm font-medium hover:underline"
                            >
                                {entry.title}
                            </a>
                        {:else}
                            <span class="text-alert-500 block truncate font-mono text-xs">
                                {m.featured_pages_missing( { slug } )}
                            </span>
                        {/if}

                        <span class="block text-xs {shown ? "text-muted" : "text-signal-700"}">{slotOf( index )}</span>
                    </span>

                    <Button
                        color="alternative"
                        class={ROW_ACTION}
                        disabled={index === 0}
                        onclick={() => move( index, -1 )}
                        aria-label={m.common_move_up( { name: entry?.title ?? slug } )}
                    >
                        <ArrowUp class="h-4 w-4" />
                    </Button>

                    <Button
                        color="alternative"
                        class={ROW_ACTION}
                        disabled={index === slugs.length - 1}
                        onclick={() => move( index, 1 )}
                        aria-label={m.common_move_down( { name: entry?.title ?? slug } )}
                    >
                        <ArrowDown class="h-4 w-4" />
                    </Button>

                    <Button
                        color="alternative"
                        class="hover:text-alert-500 {ROW_ACTION}"
                        onclick={() => ( slugs = slugs.filter( ( item ) => item !== slug ) )}
                        aria-label={m.common_remove_item( { name: entry?.title ?? slug } )}
                    >
                        <X class="h-4 w-4" />
                    </Button>
                </li>
            {/each}
        </ol>

        <div class="mt-3">
            {@render addButton()}
        </div>
    {/if}
</SettingsSection>

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
