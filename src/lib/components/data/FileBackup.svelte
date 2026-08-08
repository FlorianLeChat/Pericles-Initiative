<script lang="ts">
    /**
     * File backup: writing the wiki to a `wiki.json`, and reading one back.
     *
     * Export and import are two directions of the same thing, so they share one
     * panel, told apart from the online backup by the medium: a file on this
     * device, no server involved, no request fired.
     *
     * @author Claude
     */
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { wiki } from "$lib/state/wiki.svelte";

    let importText = $state( "" );
    let feedback = $state<{ kind: "success" | "error"; text: string } | null>( null );
    let importOpen = $state( false );

    /**
     * Downloads the current content as `wiki.json`.
     *
     * @author Claude
     */
    const download = (): void =>
    {
        const blob = new Blob( [ wiki.exportJson() ], { type: "application/json" } );
        const url = URL.createObjectURL( blob );
        const link = document.createElement( "a" );

        link.href = url;
        link.download = "wiki.json";
        link.click();
        URL.revokeObjectURL( url );

        feedback = { kind: "success", text: "Fichier téléchargé. Le contenu de ce navigateur, lui, ne bouge pas." };
    };

    /**
     * Copies the current content to the clipboard.
     *
     * @author Claude
     */
    const copy = async (): Promise<void> =>
    {
        try
        {
            await navigator.clipboard.writeText( wiki.exportJson() );
            feedback = { kind: "success", text: "JSON copié dans le presse papier." };
        }
        catch ( error )
        {
            feedback = { kind: "error", text: `Copie refusée par le navigateur : ${ String( error ) }` };
        }
    };

    /**
     * Reads a chosen file into the import area.
     *
     * @param event Change event of the file input.
     * @author Claude
     */
    const onFile = async ( event: Event ): Promise<void> =>
    {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[ 0 ];

        if ( !file )
        {
            return;
        }

        importText = await file.text();
        feedback = {
            kind: "success",
            text: `${ file.name } chargé. Lancez l'import pour remplacer le contenu de ce navigateur.`
        };
    };

    /**
     * Applies the pending import.
     *
     * @author Claude
     */
    const runImport = (): void =>
    {
        try
        {
            const counts = wiki.importJson( importText );
            importText = "";
            feedback = {
                kind: "success",
                text:
                    `Import réussi : ${ counts.entries } ${ counts.entries === 1 ? "fiche" : "fiches" }, `
                    + `${ counts.categories } ${ counts.categories === 1 ? "catégorie" : "catégories" }, `
                    + `${ counts.live } ${ counts.live === 1 ? "entrée" : "entrées" } de direct.`
            };
        }
        catch ( error )
        {
            feedback = { kind: "error", text: `JSON illisible : ${ String( error ) }` };
        }
    };
</script>

<section class="surface mt-6 p-6">
    <h2 class="font-serif text-xl font-semibold tracking-tight">Sauvegarde en local</h2>

    <p class="text-muted mt-2 text-sm leading-relaxed">
        Tout le contenu du wiki, écrit dans un fichier <code class="font-mono text-xs">wiki.json</code> sur cet
        appareil. Aucun serveur n'intervient, rien n'est envoyé nulle part. Conservez ce fichier comme sauvegarde, ou
        rechargez le ici, ou dans un autre navigateur, pour y retrouver le contenu.
    </p>

    {#if feedback}
        <p
            class="mt-5 rounded-xl px-4 py-3 text-sm {feedback.kind === "success"
                ? "bg-accent-100 text-accent-900 dark:bg-accent-900/50 dark:text-accent-100"
                : "bg-alert-500/15 text-alert-600 dark:text-red-300"}"
            role="status"
        >
            {feedback.text}
        </p>
    {/if}

    <div class="mt-6">
        <h3 class="font-semibold">Enregistrer dans un fichier</h3>

        <p class="text-muted mt-1.5 text-sm leading-relaxed">
            Le fichier contient tout ce que le site affiche actuellement, brouillons compris. L'enregistrer ne vide pas
            ce navigateur : le contenu reste ici, et une sauvegarde n'est qu'une copie.
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" onclick={download}>Télécharger wiki.json</button>

            <button type="button" class="btn btn-outline" onclick={() => void copy()}>
                Copier dans le presse papier
            </button>
        </div>
    </div>

    <div class="border-paper-200 dark:border-ink-800 mt-6 border-t pt-6">
        <h3 class="font-semibold">Charger un fichier</h3>

        <p class="text-muted mt-1.5 text-sm leading-relaxed">
            Reprendre une sauvegarde, ou récupérer le travail fait sur un autre appareil. Le chargement est complet : le
            site affichera exactement le contenu du fichier, et ce que contient ce navigateur sera remplacé.
            Enregistrez avant, si vous avez du travail en cours ici.
        </p>

        <div class="mt-4 space-y-4">
            <div>
                <label class="field-label" for="import-file">Fichier JSON</label>

                <input
                    id="import-file"
                    type="file"
                    accept="application/json,.json"
                    class="field"
                    onchange={( event ) => void onFile( event )}
                />
            </div>

            <div>
                <label class="field-label" for="import-text">Ou coller le JSON</label>

                <textarea
                    id="import-text"
                    bind:value={importText}
                    rows="5"
                    class="field resize-y font-mono text-xs"
                    placeholder="&#123; &quot;meta&quot;: ..., &quot;entries&quot;: [...] &#125;"
                ></textarea>
            </div>

            <button
                type="button"
                class="btn btn-primary"
                disabled={importText.trim().length === 0}
                onclick={() => ( importOpen = true )}
            >
                Charger ce contenu
            </button>
        </div>
    </div>
</section>

<ConfirmDialog
    bind:open={importOpen}
    title="Charger ce JSON ?"
    message={"Le contenu de ce navigateur va être remplacé par celui du fichier. "
      + "Tout ce qui n'a pas été sauvegardé sera perdu."}
    confirmLabel="Charger"
    onconfirm={runImport}
/>
