<script lang="ts">
    /**
     * Editor for the dates of reference of a page.
     *
     * Twin of `InfoboxEditor`, with two differences the data asks for: a row is
     * keyed by its own identifier rather than by its position, since a date
     * survives being moved or relabelled, and the intitulé is backed by the
     * suggested vocabulary. A page carries no type this editor could read to
     * guess what dating it means, so the vocabulary is offered rather than
     * imposed: the field stays free text, and «Première crue» is as valid as
     * «Naissance».
     *
     * @author Claude
     */
    import ArrowDown from "@lucide/svelte/icons/arrow-down";
    import ArrowUp from "@lucide/svelte/icons/arrow-up";
    import X from "@lucide/svelte/icons/x";
    import Button from "flowbite-svelte/Button.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import { DATE_LABELS } from "$lib/config/dates";
    import { SMALL_FIELD } from "$lib/config/forms";
    import * as m from "$lib/locales/messages.js";
    import type { EntryDate } from "$lib/types";
    import { createId } from "$lib/utilities/dataset";

    interface Props {
        dates: EntryDate[];
    }

    let { dates = $bindable() }: Props = $props();

    /** Identifier of the suggestion list every intitulé of the panel points at. */
    const LABEL_LIST = "entry-date-labels";

    /**
     * Appends an empty date.
     *
     * @author Claude
     */
    const add = (): void =>
    {
        dates = [ ...dates, { id: createId(), label: "", value: "" } ];
    };

    /**
     * Removes a date.
     *
     * @param index Position of the date.
     * @author Claude
     */
    const remove = ( index: number ): void =>
    {
        dates = dates.filter( ( _, position ) => position !== index );
    };

    /**
     * Moves a date up or down.
     *
     * @param index Position of the date.
     * @param offset -1 to move up, 1 to move down.
     * @author Claude
     */
    const move = ( index: number, offset: number ): void =>
    {
        const target = index + offset;

        if ( target < 0 || target >= dates.length )
        {
            return;
        }

        const reordered = [ ...dates ];
        [ reordered[ index ], reordered[ target ] ] = [ reordered[ target ], reordered[ index ] ];
        dates = reordered;
    };

    /**
     * Names a date for assistive technology, by its intitulé when it has one.
     *
     * @param date Date being described.
     * @param index Position of the date.
     * @returns A phrase identifying the date.
     * @author Claude
     */
    const rowName = ( date: EntryDate, index: number ): string =>
        date.label.trim() || m.dates_editor_row_fallback( { index: index + 1 } );
</script>

<div class="space-y-2">
    <datalist id={LABEL_LIST}>
        {#each DATE_LABELS as label ( label )}
            <option value={label}></option>
        {/each}
    </datalist>

    {#each dates as date, index ( date.id )}
        <div class="flex items-start gap-1.5">
            <div class="grid flex-1 gap-1.5">
                <Input
                    bind:value={date.label}
                    type="text"
                    size="sm"
                    class={SMALL_FIELD}
                    list={LABEL_LIST}
                    placeholder={m.dates_editor_label_placeholder()}
                    aria-label={m.dates_editor_label_aria( { index: index + 1 } )}
                />

                <Input
                    bind:value={date.value}
                    type="text"
                    size="sm"
                    class={SMALL_FIELD}
                    placeholder={m.dates_editor_value_placeholder()}
                    aria-label={m.dates_editor_value_aria( { index: index + 1 } )}
                />
            </div>

            <div class="flex flex-col gap-1">
                <Button
                    color="alternative"
                    class="h-9 w-9 border-0 p-0"
                    onclick={() => move( index, -1 )}
                    disabled={index === 0}
                    aria-label={m.common_move_up( { name: rowName( date, index ) } )}
                >
                    <ArrowUp class="h-4 w-4" />
                </Button>

                <Button
                    color="alternative"
                    class="h-9 w-9 border-0 p-0"
                    onclick={() => move( index, 1 )}
                    disabled={index === dates.length - 1}
                    aria-label={m.common_move_down( { name: rowName( date, index ) } )}
                >
                    <ArrowDown class="h-4 w-4" />
                </Button>

                <Button
                    color="alternative"
                    class="hover:text-alert-500 h-9 w-9 border-0 p-0"
                    onclick={() => remove( index )}
                    aria-label={m.common_delete_row( { name: rowName( date, index ) } )}
                >
                    <X class="h-4 w-4" />
                </Button>
            </div>
        </div>
    {/each}

    <Button color="alternative" size="sm" class="w-full" onclick={add}>{m.dates_editor_add_button()}</Button>
</div>
