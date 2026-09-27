<script lang="ts">
    /**
     * Editor for the label and value rows of the infobox.
     *
     * The three controls of a row used to be twenty eight pixel squares holding
     * an arrow character, which is both under the size a finger can reliably hit
     * and a glyph rather than an icon. They are now full sized targets carrying a
     * real icon and a name that says which row they act on, since «Monter» repeated
     * five times down a column tells a screen reader user nothing.
     *
     * @author Claude
     */
    import ArrowDown from "@lucide/svelte/icons/arrow-down";
    import ArrowUp from "@lucide/svelte/icons/arrow-up";
    import X from "@lucide/svelte/icons/x";
    import Button from "flowbite-svelte/Button.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import { SMALL_FIELD } from "$lib/config/forms";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { InfoboxField } from "$lib/types";

    import { tick } from "svelte";

    interface Props {
        fields: InfoboxField[];
    }

    let { fields = $bindable() }: Props = $props();

    /** The first field of each row, so Enter can walk down the column. */
    let labelFields = $state<( HTMLInputElement | undefined )[]>( [] );

    /** Identifier of the suggestion list every intitulé of the panel points at. */
    const LABEL_LIST = "entry-infobox-labels";

    /**
     * Intitulés the wiki already uses, most used first.
     *
     * Suggested rather than declared in `src/lib/config/`, unlike the dates: an
     * infobox describes whatever its page is, so the vocabulary belongs to the
     * fiction rather than to the application, and a list written here would be
     * wrong for the second wiki that installs this. Reading the corpus instead
     * makes the panel push towards the words already chosen, which is what keeps
     * an encyclopedia readable: «Fondation» on one page and «Fondée en» on the
     * next are two rows saying one thing.
     *
     * Counted in a plain record and sorted once, the way the store builds its
     * own groupings, and derived from the corpus rather than from the field, so
     * typing an intitulé does not recount the wiki.
     */
    const suggestions = $derived.by( () =>
    {
        const counts: Record<string, number> = {};

        for ( const entry of wiki.entries )
        {
            for ( const field of entry.infobox )
            {
                const label = field.label.trim();

                if ( label )
                {
                    counts[ label ] = ( counts[ label ] ?? 0 ) + 1;
                }
            }
        }

        return Object.entries( counts )
            .sort( ( [ left, times ], [ right, others ] ) => others - times || left.localeCompare( right, "fr" ) )
            .map( ( [ label ] ) => label );
    } );

    /**
     * Appends an empty row.
     *
     * @author Claude
     */
    const add = (): void =>
    {
        fields = [ ...fields, { label: "", value: "" } ];
    };

    /**
     * Removes a row.
     *
     * @param index Position of the row.
     * @author Claude
     */
    const remove = ( index: number ): void =>
    {
        fields = fields.filter( ( _, position ) => position !== index );
    };

    /**
     * Moves a row up or down.
     *
     * @param index Position of the row.
     * @param offset -1 to move up, 1 to move down.
     * @author Claude
     */
    const move = ( index: number, offset: number ): void =>
    {
        const target = index + offset;

        if ( target < 0 || target >= fields.length )
        {
            return;
        }

        const reordered = [ ...fields ];
        [ reordered[ index ], reordered[ target ] ] = [ reordered[ target ], reordered[ index ] ];
        fields = reordered;
    };

    /**
     * Walks to the next row on Enter, adding one when there is none.
     *
     * Enter inside a text field of a form submits it, which here saved the page
     * and left the editor in the middle of filling a table. Rows are written one
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

        if ( index === fields.length - 1 )
        {
            add();
        }

        // The row Enter walks into may not be rendered yet.
        void tick().then( () => labelFields[ index + 1 ]?.focus() );
    };

    /**
     * Names a row for assistive technology, by its label when it has one.
     *
     * @param field Row being described.
     * @param index Position of the row.
     * @returns A phrase identifying the row.
     * @author Claude
     */
    const rowName = ( field: InfoboxField, index: number ): string =>
        field.label.trim() || m.infobox_editor_row_fallback( { index: index + 1 } );
</script>

<div class="space-y-2">
    <datalist id={LABEL_LIST}>
        {#each suggestions as label ( label )}
            <option value={label}></option>
        {/each}
    </datalist>

    {#each fields as field, index ( index )}
        <div class="flex items-start gap-1.5">
            <div class="grid flex-1 gap-1.5">
                <Input
                    bind:elementRef={labelFields[ index ]}
                    bind:value={field.label}
                    onkeydown={( event: KeyboardEvent ) => onEnter( event, index )}
                    type="text"
                    size="sm"
                    class={SMALL_FIELD}
                    list={LABEL_LIST}
                    placeholder={m.infobox_editor_label_placeholder()}
                    aria-label={m.infobox_editor_label_aria( { index: index + 1 } )}
                />

                <Input
                    bind:value={field.value}
                    onkeydown={( event: KeyboardEvent ) => onEnter( event, index )}
                    type="text"
                    size="sm"
                    class={SMALL_FIELD}
                    placeholder={m.infobox_editor_value_placeholder()}
                    aria-label={m.infobox_editor_value_aria( { index: index + 1 } )}
                />
            </div>

            <div class="flex flex-col gap-1">
                <Button
                    color="alternative"
                    class="h-9 w-9 border-0 p-0"
                    onclick={() => move( index, -1 )}
                    disabled={index === 0}
                    aria-label={m.common_move_up( { name: rowName( field, index ) } )}
                >
                    <ArrowUp class="h-4 w-4" />
                </Button>

                <Button
                    color="alternative"
                    class="h-9 w-9 border-0 p-0"
                    onclick={() => move( index, 1 )}
                    disabled={index === fields.length - 1}
                    aria-label={m.common_move_down( { name: rowName( field, index ) } )}
                >
                    <ArrowDown class="h-4 w-4" />
                </Button>

                <Button
                    color="alternative"
                    class="hover:text-alert-500 h-9 w-9 border-0 p-0"
                    onclick={() => remove( index )}
                    aria-label={m.common_delete_row( { name: rowName( field, index ) } )}
                >
                    <X class="h-4 w-4" />
                </Button>
            </div>
        </div>
    {/each}

    <Button color="alternative" size="sm" class="w-full" onclick={add}>{m.infobox_editor_add_button()}</Button>
</div>
