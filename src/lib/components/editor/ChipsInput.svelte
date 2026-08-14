<script lang="ts">
    /**
     * Free list of short strings, entered one at a time.
     *
     * @author Claude
     */
    import X from "@lucide/svelte/icons/x";
    import Input from "flowbite-svelte/Input.svelte";

    interface Props {
        values: string[];
        placeholder?: string;
        /** Identifier of the field, to bind a label to the input. */
        id: string;
    }

    let { values = $bindable(), placeholder = "Ajouter, puis Entrée", id }: Props = $props();

    let draft = $state( "" );

    /**
     * Adds the pending value, ignoring blanks and duplicates.
     *
     * @author Claude
     */
    const commit = (): void =>
    {
        const value = draft.trim();

        if ( value && !values.includes( value ) )
        {
            values = [ ...values, value ];
        }

        draft = "";
    };
</script>

<div class="space-y-2">
    <Input
        {id}
        bind:value={draft}
        onkeydown={( event: KeyboardEvent ) =>
        {
            if ( event.key === "Enter" || event.key === "," )
            {
                event.preventDefault();
                commit();
            }
            else if ( event.key === "Backspace" && draft === "" && values.length > 0 )
            {
                values = values.slice( 0, -1 );
            }
        }}
        onblur={commit}
        type="text"
        {placeholder}
    />

    {#if values.length > 0}
        <ul class="flex flex-wrap gap-1.5">
            {#each values as value ( value )}
                <li>
                    <button
                        type="button"
                        class="bg-paper-200 text-ink-600 dark:bg-ink-800 dark:text-paper-300 hover:text-alert-500
                               inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs
                               transition"
                        onclick={() => ( values = values.filter( ( item ) => item !== value ) )}
                        aria-label="Retirer {value}"
                    >
                        {value}

                        <X class="h-3.5 w-3.5" />
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>
