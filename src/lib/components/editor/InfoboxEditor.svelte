<script lang="ts">
    /**
     * Editor for the label and value rows of the infobox, written in place on the card.
     *
     * A value is one line of Markdown, so it may point at other pages: the link
     * control of a row opens the page picker and writes the link at its end. While
     * the field does not hold the focus, a value carrying a link is drawn as the
     * article will show it, and its Markdown comes back as soon as it is edited.
     *
     * @author Claude
     */
    import { tick } from "svelte";
    import Plus from "@lucide/svelte/icons/plus";
    import * as m from "#lib/locales/messages.js";
    import EntryPicker from "./EntryPicker.svelte";
    import RowControls from "./RowControls.svelte";
    import UndoRemoval from "./UndoRemoval.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import type { InfoboxField } from "#lib/types.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { phraseSegments, type PhraseSegment } from "#lib/utilities/markdown.ts";

    interface Props {
        fields: InfoboxField[];
    }

    let { fields = $bindable() }: Props = $props();

    /** The first field of each row, so Enter can walk down the column. */
    let labelFields = $state<( HTMLInputElement | undefined )[]>( [] );

    /** The value field of each row, so a row moved from the keyboard keeps the focus on the field it left. */
    let valueFields = $state<( HTMLInputElement | undefined )[]>( [] );

    /** Position of the row last touched, the only one whose controls a touch screen draws. */
    let active = $state<number | null>( null );

    /** The row removed last, where it stood and what it was called, until it is restored or another goes. */
    let removed = $state<{ field: InfoboxField; index: number; name: string } | null>( null );

    /** Position of the row a page is being linked from. */
    let linking = $state( 0 );
    let pickerOpen = $state( false );

    /** Position of the row whose value holds the focus, and so shows its Markdown. */
    let editing = $state<number | null>( null );

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
        const field = fields[ index ];

        if ( !field )
        {
            return;
        }

        removed = { field, index, name: rowName( field, index ) };
        active = null;
        fields = fields.filter( ( _, position ) => position !== index );
    };

    /**
     * Puts the row removed last back where it stood, and the focus on it.
     *
     * @author Claude
     */
    const restore = (): void =>
    {
        if ( !removed )
        {
            return;
        }

        const { field, index } = removed;

        fields = [ ...fields.slice( 0, index ), field, ...fields.slice( index ) ];
        removed = null;
        active = index;

        void tick().then( () => labelFields[ index ]?.focus() );
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
        active = target;
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
     * Cuts a value into runs for its preview, when it holds a link at all.
     *
     * A value without a link is drawn by its own field, so it gets no preview.
     *
     * @param value Value of a row.
     * @returns The runs of the value, or nothing when none of them is a link.
     * @author Claude
     */
    const linkedSegments = ( value: string ): PhraseSegment[] =>
    {
        const segments = phraseSegments( value );

        return segments.some( ( segment ) => segment.link ) ? segments : [];
    };

    /**
     * Writes a link to the chosen page at the end of the value of the row.
     *
     * Appended rather than substituted, after a comma: «Parents» names two pages,
     * and the second link must not erase the first.
     *
     * @param slug Slug of the chosen page.
     * @param label Text of the link.
     * @author Claude
     */
    const linkPage = ( slug: string, label: string ): void =>
    {
        const field = fields[ linking ];

        if ( field )
        {
            const link = `[${ label }](/entries/${ slug })`;
            const current = field.value.trim();

            field.value = current ? `${ current }, ${ link }` : link;
        }
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

    /**
     * Names the value of a row after its intitulé, which is what the writer
     * reads beside it, and by its position only while the intitulé is empty.
     *
     * @param field Row being described.
     * @param index Position of the row.
     * @returns The accessible name of the value field.
     * @author Claude
     */
    const valueName = ( field: InfoboxField, index: number ): string =>
    {
        const label = field.label.trim();

        return label ? m.infobox_editor_value_named( { label } ) : m.infobox_editor_value_aria( { index: index + 1 } );
    };
</script>

<div>
    <datalist id={LABEL_LIST}>
        {#each suggestions as label ( label )}
            <option value={label}></option>
        {/each}
    </datalist>

    <div class="divide-paper-200 dark:divide-ink-700 divide-y">
        {#each fields as field, index ( index )}
            {@const preview = editing === index ? [] : linkedSegments( field.value )}

            <div class="group py-1" onfocusin={() => ( active = index )}>
                <div class="flex items-center gap-1">
                    <input
                        bind:this={labelFields[ index ]}
                        bind:value={field.label}
                        onkeydown={( event ) => onKeydown( event, index, labelFields )}
                        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                        type="text"
                        class="field-ghost text-muted sm:text-xs"
                        list={LABEL_LIST}
                        placeholder={m.infobox_editor_label_placeholder()}
                        aria-label={m.infobox_editor_label_aria( { index: index + 1 } )}
                    />

                    <RowControls
                        name={rowName( field, index )}
                        first={index === 0}
                        last={index === fields.length - 1}
                        onmove={( offset ) => move( index, offset )}
                        onremove={() => remove( index )}
                        active={active === index}
                        onlink={() =>
                        {
                            linking = index;
                            pickerOpen = true;
                        }}
                    />
                </div>

                <div class="relative">
                    <input
                        bind:this={valueFields[ index ]}
                        bind:value={field.value}
                        onkeydown={( event ) => onKeydown( event, index, valueFields )}
                        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                        onfocus={() => ( editing = index )}
                        onblur={() => ( editing = null )}
                        type="text"
                        class="field-ghost field-slot font-medium {preview.length > 0 ? "text-transparent" : ""}"
                        placeholder={m.infobox_editor_value_placeholder()}
                        aria-label={valueName( field, index )}
                    />

                    <!-- The field still holds the Markdown and is what assistive technology reads; this only draws it. -->
                    {#if preview.length > 0}
                        <span
                            class="text-ink-800 dark:text-paper-200 pointer-events-none absolute inset-0 truncate border
                               border-transparent px-2 py-1.5 text-base font-medium sm:text-sm"
                            aria-hidden="true"
                        >
                            {#each preview as segment, position ( position )}
                                {#if !segment.link}
                                    {segment.text}
                                {:else if segment.slug && !wiki.slugs.has( segment.slug )}
                                    <span class="wiki-link-missing">{segment.text}</span>
                                {:else}
                                    <span class="wiki-link">{segment.text}</span>
                                {/if}
                            {/each}
                        </span>
                    {/if}
                </div>
            </div>
        {/each}
    </div>

    <UndoRemoval message={removed ? m.infobox_editor_removed( { name: removed.name } ) : null} onundo={restore} />

    <Button color="alternative" size="sm" class="mt-2 w-full gap-2 rounded-full" onclick={add}>
        <Plus class="h-4 w-4" />
        {m.infobox_editor_add_button()}
    </Button>
</div>

<EntryPicker bind:open={pickerOpen} onselect={linkPage} />
