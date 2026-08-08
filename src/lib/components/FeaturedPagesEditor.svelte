<script lang="ts">
    /**
     * Reorderable list of the pages featured on the home page.
     *
     * Owns the add, reorder and remove interactions, so the settings page only
     * has to seed and read the list of slugs.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import { wiki } from "$lib/state/wiki.svelte";
    import EntryPicker from "./editor/EntryPicker.svelte";

    interface Props {
        /** Slugs of the featured pages, most prominent first. */
        slugs: string[];
    }

    let { slugs = $bindable() }: Props = $props();

    let pickerOpen = $state( false );
</script>

<section class="surface p-6">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="font-serif text-xl font-semibold tracking-tight">Fiches à la une</h2>

        <button
            type="button"
            class="text-accent-600 dark:text-accent-400 text-xs underline"
            onclick={() => ( pickerOpen = true )}
        >
            Ajouter une fiche
        </button>
    </div>

    <p class="text-muted mt-1 text-sm leading-relaxed">
        La première occupe la grande carte de l'accueil, les deux suivantes les cartes latérales.
    </p>

    {#if slugs.length === 0}
        <p class="text-muted mt-4 text-sm">Aucune fiche mise en avant.</p>
    {:else}
        <ol class="mt-4 space-y-2">
            {#each slugs as slug, index ( slug )}
                {@const entry = wiki.bySlug( slug )}

                <li class="border-paper-200 dark:border-ink-800 flex items-center gap-3 rounded-xl border p-3">
                    <span class="text-muted font-mono text-xs">{index + 1}</span>

                    <span class="min-w-0 flex-1">
                        {#if entry}
                            <a href={resolve( `/wiki/${ slug }` )} class="text-sm font-medium">{entry.title}</a>
                        {:else}
                            <span class="text-alert-500 font-mono text-xs">{slug}, fiche absente</span>
                        {/if}
                    </span>

                    <button
                        type="button"
                        class="btn btn-ghost h-7 w-7 px-0 text-xs"
                        disabled={index === 0}
                        onclick={() =>
                        {
                            const next = [ ...slugs ];
                            [ next[ index - 1 ], next[ index ] ] = [ next[ index ], next[ index - 1 ] ];
                            slugs = next;
                        }}
                        aria-label="Monter">&uarr;</button
                    >

                    <button
                        type="button"
                        class="btn btn-ghost h-7 w-7 px-0 text-xs"
                        disabled={index === slugs.length - 1}
                        onclick={() =>
                        {
                            const next = [ ...slugs ];
                            [ next[ index ], next[ index + 1 ] ] = [ next[ index + 1 ], next[ index ] ];
                            slugs = next;
                        }}
                        aria-label="Descendre">&darr;</button
                    >

                    <button
                        type="button"
                        class="btn btn-ghost hover:text-alert-500 h-7 w-7 px-0 text-xs"
                        onclick={() => ( slugs = slugs.filter( ( item ) => item !== slug ) )}
                        aria-label="Retirer">&times;</button
                    >
                </li>
            {/each}
        </ol>
    {/if}
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
