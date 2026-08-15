<script lang="ts">
    /**
     * Edition of an existing page.
     *
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import EntryForm from "$lib/components/editor/EntryForm.svelte";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";

    const slug = $derived( page.params.slug ?? "" );
    const entry = $derived( wiki.bySlug( slug ) );
</script>

<svelte:head>
    <title>{m.edit_title( { name: entry?.title ?? slug, universe: wiki.meta.universe } )}</title>
</svelte:head>

{#if entry}
    {#key entry.id}
        <EntryForm {entry} />
    {/key}
{:else if wiki.overlayLoaded}
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p class="text-muted font-mono text-sm">/wiki/{slug}</p>

        <EmptyState title={m.edit_empty_title()} description={m.edit_empty_description()}>
            <Button href={resolve( `/new?slug=${ slug }` )} color="primary">{m.common_create_this_entry()}</Button>
            <Button href={resolve( "/wiki" )} color="alternative">{m.common_browse_wiki()}</Button>
        </EmptyState>
    </div>
{:else}
    <p class="text-muted mx-auto max-w-3xl px-4 py-16 text-sm sm:px-6">{m.edit_loading()}</p>
{/if}
