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
    import { wiki } from "$lib/state/wiki.svelte";

    const slug = $derived( page.params.slug ?? "" );
    const entry = $derived( wiki.bySlug( slug ) );
</script>

<svelte:head>
    <title>Modifier {entry?.title ?? slug} · {wiki.meta.universe}</title>
</svelte:head>

{#if entry}
    {#key entry.id}
        <EntryForm {entry} />
    {/key}
{:else if wiki.overlayLoaded}
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p class="text-muted font-mono text-sm">/wiki/{slug}</p>

        <EmptyState
            title="Aucune fiche à cette adresse"
            description="Elle a peut être été supprimée, ou son adresse a changé."
        >
            <Button href={resolve( `/new?slug=${ slug }` )} color="primary">Créer cette fiche</Button>

            <Button href={resolve( "/wiki" )} color="alternative">Parcourir l'encyclopédie</Button>
        </EmptyState>
    </div>
{:else}
    <p class="text-muted mx-auto max-w-3xl px-4 py-16 text-sm sm:px-6">Chargement de la fiche...</p>
{/if}
