<script lang="ts">
    /**
     * Data management: what this browser holds, and the two ways of backing it up.
     *
     * The page only assembles the panels. Each one owns its own state and its own
     * feedback, since a file backup and an online backup fail for unrelated
     * reasons and must never speak for each other.
     *
     * @author Claude
     */
    import Alert from "flowbite-svelte/Alert.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import FileBackup from "$lib/components/data/FileBackup.svelte";
    import LocalContent from "$lib/components/data/LocalContent.svelte";
    import RemoteBackup from "$lib/components/data/RemoteBackup.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { ACTION_BUTTON } from "$lib/config/forms";
    import { wiki } from "$lib/state/wiki.svelte";

    let resetOpen = $state( false );
    let feedback = $state<string | null>( null );
</script>

<svelte:head>
    <title>Sauvegardes · {wiki.meta.universe}</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <PageHeader title="Sauvegardes">
        {#snippet description()}
            Ce que vous écrivez reste sur cet appareil, et nulle part ailleurs. Personne d'autre ne le voit, mais rien ne
            le protège non plus : effacer les données du navigateur, ou changer d'ordinateur, et tout est perdu. Faites
            une copie, dans un fichier que vous gardez, ou en ligne pour retrouver votre wiki depuis un autre appareil.
        {/snippet}
    </PageHeader>

    {#if feedback}
        <Alert color="primary" class="mt-6 rounded-xl text-sm" role="status">{feedback}</Alert>
    {/if}

    <div class="mt-8">
        <LocalContent />
    </div>

    <FileBackup />

    <RemoteBackup />

    <section class="border-alert-500/30 mt-6 rounded-2xl border p-6">
        <h2 class="font-serif text-xl font-semibold tracking-tight">Tout effacer</h2>

        <p class="text-muted mt-2 text-sm leading-relaxed">
            Supprime toutes vos pages de cet appareil, d'un coup et sans retour possible. Faites une copie avant, sauf
            si vous voulez vraiment repartir de zéro.
        </p>

        <Button
            color="red"
            class="mt-5 {ACTION_BUTTON}"
            disabled={!wiki.hasStoredContent}
            onclick={() => ( resetOpen = true )}
        >
            Effacer tout mon wiki
        </Button>
    </section>
</div>

<ConfirmDialog
    bind:open={resetOpen}
    title="Effacer tout votre wiki ?"
    message="Toutes vos pages seront supprimées de cet appareil. Ce qui n'a pas été copié ailleurs sera perdu."
    confirmLabel="Effacer"
    danger
    onconfirm={() =>
    {
        wiki.resetLocal();
        feedback = "Votre wiki a été effacé de cet appareil.";
    }}
/>
