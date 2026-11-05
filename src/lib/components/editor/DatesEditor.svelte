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
    import { tick } from "svelte";
    import Plus from "@lucide/svelte/icons/plus";
    import * as m from "#lib/locales/messages.js";
    import type { EntryDate } from "#lib/types.ts";
    import RowControls from "./RowControls.svelte";
    import UndoRemoval from "./UndoRemoval.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import { DATE_LABELS } from "#lib/config/dates.ts";
    import { createId } from "#lib/utilities/dataset.ts";
    import CalendarDays from "@lucide/svelte/icons/calendar-days";

    interface Props {
        dates: EntryDate[];
    }

    let { dates = $bindable() }: Props = $props();

    /** The intitulé field of each row, so Enter can walk down the column. */
    let labelFields = $state<( HTMLInputElement | undefined )[]>( [] );

    /** The value field of each row, so a row moved from the keyboard keeps the focus on the field it left. */
    let valueFields = $state<( HTMLInputElement | undefined )[]>( [] );

    /** Position of the row last touched, the only one whose controls a touch screen draws. */
    let active = $state<number | null>( null );

    /** The date removed last, where it stood and what it was called, until it is restored or another goes. */
    let removed = $state<{ date: EntryDate; index: number; name: string } | null>( null );

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
        const date = dates[ index ];

        if ( !date )
        {
            return;
        }

        removed = { date, index, name: rowName( date, index ) };
        active = null;
        dates = dates.filter( ( _, position ) => position !== index );
    };

    /**
     * Puts the date removed last back where it stood, and the focus on it.
     *
     * @author Claude
     */
    const restore = (): void =>
    {
        if ( !removed )
        {
            return;
        }

        const { date, index } = removed;

        dates = [ ...dates.slice( 0, index ), date, ...dates.slice( index ) ];
        removed = null;
        active = index;

        void tick().then( () => labelFields[ index ]?.focus() );
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
        active = target;
    };

    /**
     * Walks to the next date on Enter, adding one when there is none.
     *
     * Enter inside a text field of a form submits it, which here saved the page
     * and left the editor in the middle of filling a table. Dates are written one
     * after the other, so the key that ends a row is the one that opens the next.
     *
     * @param event Keyboard event on a field of the row.
     * @param index Position of the row.
     * @author Claude
     */
    const onEnter = ( event: KeyboardEvent, index: number ): void =>
    {
        if ( event.key !== "Enter" )
        {
            return;
        }

        event.preventDefault();

        if ( index === dates.length - 1 )
        {
            add();
        }

        // The row Enter walks into may not be rendered yet.
        void tick().then( () => labelFields[ index + 1 ]?.focus() );
    };

    /**
     * Answers the keys a field of a row understands: Enter walks down, and Alt
     * with an arrow moves the whole row, keeping the focus on the field it left.
     *
     * The arrows are what moving reads as everywhere else, and Alt keeps them
     * from the caret, which they still move inside the field when pressed alone.
     *
     * @param event Keyboard event on a field of the row.
     * @param index Position of the row.
     * @param column The fields of the column the event came from.
     * @author Claude
     */
    const onKeydown = ( event: KeyboardEvent, index: number, column: ( HTMLInputElement | undefined )[] ): void =>
    {
        const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";

        if ( !event.altKey || !vertical )
        {
            onEnter( event, index );

            return;
        }

        event.preventDefault();

        const offset = event.key === "ArrowUp" ? -1 : 1;

        move( index, offset );

        void tick().then( () => column[ index + offset ]?.focus() );
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

    /**
     * Names the value of a date after its intitulé, which is what the writer
     * reads beside it, and by its position only while the intitulé is empty.
     *
     * @param date Date being described.
     * @param index Position of the date.
     * @returns The accessible name of the value field.
     * @author Claude
     */
    const valueName = ( date: EntryDate, index: number ): string =>
    {
        const label = date.label.trim();

        return label ? m.dates_editor_value_named( { label } ) : m.dates_editor_value_aria( { index: index + 1 } );
    };
</script>

<div>
    <datalist id={LABEL_LIST}>
        {#each DATE_LABELS as label ( label )}
            <option value={label}></option>
        {/each}
    </datalist>

    <div class="divide-paper-200 dark:divide-ink-700 divide-y">
        {#each dates as date, index ( date.id )}
            <div class="group py-1" onfocusin={() => ( active = index )}>
                <div class="flex items-center gap-1">
                    <CalendarDays class="text-muted ml-2 h-3.5 w-3.5 shrink-0" aria-hidden="true" />

                    <input
                        bind:this={labelFields[ index ]}
                        bind:value={date.label}
                        onkeydown={( event ) => onKeydown( event, index, labelFields )}
                        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                        type="text"
                        class="field-ghost text-muted sm:text-xs"
                        list={LABEL_LIST}
                        placeholder={m.dates_editor_label_placeholder()}
                        aria-label={m.dates_editor_label_aria( { index: index + 1 } )}
                    />

                    <RowControls
                        name={rowName( date, index )}
                        first={index === 0}
                        last={index === dates.length - 1}
                        onmove={( offset ) => move( index, offset )}
                        onremove={() => remove( index )}
                        active={active === index}
                    />
                </div>

                <input
                    bind:this={valueFields[ index ]}
                    bind:value={date.value}
                    onkeydown={( event ) => onKeydown( event, index, valueFields )}
                    aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                    type="text"
                    class="field-ghost field-slot font-medium"
                    placeholder={m.dates_editor_value_placeholder()}
                    aria-label={valueName( date, index )}
                />
            </div>
        {/each}
    </div>

    <UndoRemoval message={removed ? m.dates_editor_removed( { name: removed.name } ) : null} onundo={restore} />

    <Button color="alternative" size="sm" class="mt-2 w-full gap-2 rounded-full" onclick={add}>
        <Plus class="h-4 w-4" />
        {m.dates_editor_add_button()}
    </Button>
</div>
