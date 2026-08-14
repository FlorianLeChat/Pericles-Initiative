<script lang="ts">
    /**
     * Settings page shell: title and header. The identity form itself lives in
     * `SettingsForm`, mounted only once the overlay has been read, see there.
     *
     * @author Claude
     */
    import PageHeader from "$lib/components/PageHeader.svelte";
    import SettingsForm from "$lib/components/SettingsForm.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
</script>

<svelte:head>
    <title>Paramètres · {wiki.meta.universe}</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <PageHeader title="Paramètres">
        {#snippet description()}
            Le nom de votre univers et la façon dont il se présente. Ces champs apparaissent dans l'entête, sur la page
            d'accueil, et quand quelqu'un partage un lien vers votre wiki.
        {/snippet}
    </PageHeader>

    {#if wiki.overlayLoaded}
        <SettingsForm />
    {:else}
        <p class="text-muted mt-8 text-sm">Chargement des paramètres...</p>
    {/if}
</div>
