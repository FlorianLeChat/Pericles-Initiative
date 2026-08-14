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
    import Alert from "flowbite-svelte/Alert.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import Fileupload from "flowbite-svelte/Fileupload.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Textarea from "flowbite-svelte/Textarea.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { ACTION_BUTTON, ACTION_ROW } from "$lib/config/forms";
    import { wiki } from "$lib/state/wiki.svelte";
    import { counted } from "$lib/utilities/plural";

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

        feedback = { kind: "success", text: "Sauvegarde téléchargée. Votre wiki n'a pas changé." };
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
            feedback = { kind: "success", text: "Sauvegarde copiée. Collez la où vous voulez la garder." };
        }
        catch
        {
            feedback = {
                kind: "error",
                text: "Votre navigateur a refusé la copie. Utilisez le téléchargement, il donne le même fichier."
            };
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
            text: `${ file.name } est prêt. Lancez la restauration pour remplacer vos pages par celles du fichier.`
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
                    `Sauvegarde restaurée : ${ counted( counts.entries, "fiche" ) }, `
                    + `${ counted( counts.categories, "catégorie" ) } et ${ counted( counts.live, "entrée" ) } du fil.`
            };
        }
        catch
        {
            feedback = {
                kind: "error",
                text: "Ce contenu n'est pas une sauvegarde valide. Votre wiki n'a pas été modifié."
            };
        }
    };
</script>

<section class="surface mt-6 p-6">
    <h2 class="font-serif text-xl font-semibold tracking-tight">Sauvegarder dans un fichier</h2>

    <p class="text-muted mt-2 text-sm leading-relaxed">
        Votre wiki entier dans un seul fichier, téléchargé sur cet appareil. Rien ne part sur internet. Gardez ce
        fichier de côté : il vous rendra vos pages, ici comme sur un autre ordinateur.
    </p>

    {#if feedback}
        <Alert color={feedback.kind === "success" ? "primary" : "red"} class="mt-5 rounded-xl text-sm" role="status">
            {feedback.text}
        </Alert>
    {/if}

    <div class="mt-6">
        <h3 class="font-semibold">Télécharger une copie</h3>

        <p class="text-muted mt-1.5 text-sm leading-relaxed">
            Le fichier reprend tout ce que vous voyez sur le site, brouillons compris. Le télécharger ne change rien à
            votre wiki : c'est une copie, pas un déplacement.
        </p>

        <div class="mt-4 {ACTION_ROW}">
            <Button color="primary" onclick={download}>Télécharger ma sauvegarde</Button>

            <Button color="alternative" onclick={() => void copy()}>Copier dans le presse papier</Button>
        </div>
    </div>

    <div class="border-paper-200 dark:border-ink-800 mt-6 border-t pt-6">
        <h3 class="font-semibold">Restaurer une copie</h3>

        <p class="text-muted mt-1.5 text-sm leading-relaxed">
            Pour reprendre une sauvegarde, ou récupérer le travail fait sur un autre appareil. Attention, le
            remplacement est total : le site affichera exactement ce que contient le fichier, et vos pages actuelles
            disparaîtront. Téléchargez une copie avant si vous avez du travail en cours.
        </p>

        <div class="mt-4 space-y-4">
            <div>
                <Label for="import-file" class="field-label">Votre fichier de sauvegarde</Label>

                <Fileupload
                    id="import-file"
                    accept="application/json,.json"
                    onchange={( event: Event ) => void onFile( event )}
                />
            </div>

            <div>
                <Label for="import-text" class="field-label">Ou coller le contenu d'une sauvegarde</Label>

                <Textarea
                    id="import-text"
                    bind:value={importText}
                    rows={5}
                    class="w-full resize-y font-mono text-xs"
                    placeholder="Collez ici le contenu d'un fichier de sauvegarde."
                />
            </div>

            <Button
                color="primary"
                class={ACTION_BUTTON}
                disabled={importText.trim().length === 0}
                onclick={() => ( importOpen = true )}
            >
                Restaurer cette sauvegarde
            </Button>
        </div>
    </div>
</section>

<ConfirmDialog
    bind:open={importOpen}
    title="Remplacer votre wiki ?"
    message={"Vos pages actuelles vont être remplacées par celles de la sauvegarde. "
      + "Ce qui n'a pas été copié ailleurs sera perdu."}
    confirmLabel="Restaurer"
    onconfirm={runImport}
/>
