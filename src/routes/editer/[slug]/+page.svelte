<script lang="ts">
    /**
     * Edition of an existing page.
     *
     * @author Claude
     */
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
        <p class="text-ink-400 font-mono text-sm">/wiki/{slug}</p>
        <EmptyState
            title="Aucune fiche à cette adresse"
            description="Elle a peut être été supprimée, ou son adresse a changé."
        >
            <a href="/nouveau?slug={slug}" class="btn btn-primary">Créer cette fiche</a>
            <a href="/wiki" class="btn btn-outline">Parcourir l'encyclopédie</a>
        </EmptyState>
    </div>
{:else}
    <p class="text-ink-400 mx-auto max-w-3xl px-4 py-16 text-sm sm:px-6">Chargement de la fiche...</p>
{/if}
