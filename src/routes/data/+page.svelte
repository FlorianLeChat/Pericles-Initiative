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
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import FileBackup from "$lib/components/data/FileBackup.svelte";
    import LocalContent from "$lib/components/data/LocalContent.svelte";
    import RemoteBackup from "$lib/components/data/RemoteBackup.svelte";
    import { wiki } from "$lib/state/wiki.svelte";

    let resetOpen = $state( false );
    let feedback = $state<string | null>( null );
</script>

<svelte:head>
    <title>Données · {wiki.meta.universe}</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <header class="max-w-2xl">
        <h1 class="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Données</h1>

        <p class="text-muted mt-3 leading-relaxed">
            Le site lit son contenu dans le stockage local de ce navigateur : c'est aujourd'hui la seule source de
            données, et vider ce stockage suffit à tout perdre. Deux sauvegardes existent pour éviter ça, et elles sont
            indépendantes : en local, dans un fichier conservé sur cet appareil, ou en ligne, sur un service que vous
            hébergez.
        </p>
    </header>

    {#if feedback}
        <p
            class="bg-accent-100 text-accent-900 dark:bg-accent-900/50 dark:text-accent-100 mt-6 rounded-xl px-4 py-3
                   text-sm"
            role="status"
        >
            {feedback}
        </p>
    {/if}

    <div class="mt-8">
        <LocalContent />
    </div>

    <FileBackup />

    <RemoteBackup />

    <section class="border-alert-500/30 mt-6 rounded-2xl border p-6">
        <h2 class="font-serif text-xl font-semibold tracking-tight">Réinitialiser</h2>

        <p class="text-muted mt-2 text-sm leading-relaxed">
            Efface tout le contenu enregistré dans ce navigateur. Irréversible : sauvegardez avant, dans un fichier ou
            en ligne.
        </p>

        <button
            type="button"
            class="btn btn-danger mt-5"
            disabled={!wiki.hasStoredContent}
            onclick={() => ( resetOpen = true )}
        >
            Effacer le contenu de ce navigateur
        </button>
    </section>
</div>

<ConfirmDialog
    bind:open={resetOpen}
    title="Effacer le contenu de ce navigateur ?"
    message="Tout ce qui n'a pas été sauvegardé, dans un fichier ou en ligne, sera perdu."
    confirmLabel="Effacer"
    danger
    onconfirm={() =>
    {
        wiki.resetLocal();
        feedback = "Contenu de ce navigateur effacé.";
    }}
/>
