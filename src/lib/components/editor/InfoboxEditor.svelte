<script lang="ts">
    /**
     * Editor for the label and value rows of the infobox.
     *
     * @author Claude
     */
    import type { InfoboxField } from "$lib/types";

    interface Props {
        fields: InfoboxField[];
    }

    let { fields = $bindable() }: Props = $props();

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
</script>

<div class="space-y-2">
    {#each fields as field, index ( index )}
        <div class="flex items-start gap-1.5">
            <div class="grid flex-1 gap-1.5">
                <input bind:value={field.label} type="text" class="field py-2" placeholder="Intitulé" />
                <input bind:value={field.value} type="text" class="field py-2" placeholder="Valeur" />
            </div>

            <div class="flex flex-col gap-1">
                <button
                    type="button"
                    class="btn btn-ghost h-7 w-7 px-0 text-xs"
                    onclick={() => move( index, -1 )}
                    disabled={index === 0}
                    aria-label="Monter cette ligne">&uarr;</button
                >

                <button
                    type="button"
                    class="btn btn-ghost h-7 w-7 px-0 text-xs"
                    onclick={() => move( index, 1 )}
                    disabled={index === fields.length - 1}
                    aria-label="Descendre cette ligne">&darr;</button
                >

                <button
                    type="button"
                    class="btn btn-ghost hover:text-alert-500 h-7 w-7 px-0 text-xs"
                    onclick={() => remove( index )}
                    aria-label="Supprimer cette ligne">&times;</button
                >
            </div>
        </div>
    {/each}

    <button type="button" class="btn btn-outline w-full py-1.5 text-xs" onclick={add}> Ajouter une ligne </button>
</div>
