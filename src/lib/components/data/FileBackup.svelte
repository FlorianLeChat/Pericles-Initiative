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
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import { pluralize } from "$lib/utilities/plural";

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

        feedback = { kind: "success", text: m.file_backup_download_success() };
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
            feedback = { kind: "success", text: m.file_backup_copy_success() };
        }
        catch
        {
            feedback = {
                kind: "error",
                text: m.file_backup_copy_error()
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
            text: m.file_backup_file_ready( { name: file.name } )
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

            const entries = pluralize( counts.entries, { one: m.common_count_fiche_one, other: m.common_count_fiche_other } );
            const categories = pluralize(
                counts.categories,
                { one: m.common_count_categorie_one, other: m.common_count_categorie_other }
            );
            const live = pluralize( counts.live, { one: m.common_count_entree_one, other: m.common_count_entree_other } );

            feedback = {
                kind: "success",
                text: m.file_backup_restored_summary( { entries, categories, live } )
            };
        }
        catch
        {
            feedback = {
                kind: "error",
                text: m.file_backup_import_error()
            };
        }
    };
</script>

<section class="surface mt-6 p-6">
    <h2 class="font-serif text-xl font-semibold tracking-tight">{m.file_backup_heading()}</h2>

    <p class="text-muted mt-2 text-sm leading-relaxed">
        {m.file_backup_intro()}
    </p>

    {#if feedback}
        <Alert color={feedback.kind === "success" ? "primary" : "red"} class="mt-5 rounded-xl text-sm" role="status">
            {feedback.text}
        </Alert>
    {/if}

    <div class="mt-6">
        <h3 class="font-semibold">{m.file_backup_download_heading()}</h3>

        <p class="text-muted mt-1.5 text-sm leading-relaxed">
            {m.file_backup_download_description()}
        </p>

        <div class="mt-4 {ACTION_ROW}">
            <Button color="primary" onclick={download}>{m.file_backup_download_button()}</Button>

            <Button color="alternative" onclick={() => void copy()}>{m.file_backup_copy_button()}</Button>
        </div>
    </div>

    <div class="border-paper-200 dark:border-ink-800 mt-6 border-t pt-6">
        <h3 class="font-semibold">{m.file_backup_restore_heading()}</h3>

        <p class="text-muted mt-1.5 text-sm leading-relaxed">
            {m.file_backup_restore_description()}
        </p>

        <div class="mt-4 space-y-4">
            <div>
                <Label for="import-file" class="field-label">{m.file_backup_file_label()}</Label>

                <Fileupload
                    id="import-file"
                    accept="application/json,.json"
                    onchange={( event: Event ) => void onFile( event )}
                />
            </div>

            <div>
                <Label for="import-text" class="field-label">{m.file_backup_paste_label()}</Label>

                <Textarea
                    id="import-text"
                    bind:value={importText}
                    rows={5}
                    class="w-full resize-y font-mono text-xs"
                    placeholder={m.file_backup_paste_placeholder()}
                />
            </div>

            <Button
                color="primary"
                class={ACTION_BUTTON}
                disabled={importText.trim().length === 0}
                onclick={() => ( importOpen = true )}
            >
                {m.file_backup_restore_button()}
            </Button>
        </div>
    </div>
</section>

<ConfirmDialog
    bind:open={importOpen}
    title={m.file_backup_replace_title()}
    message={m.file_backup_replace_message()}
    confirmLabel={m.common_restore()}
    onconfirm={runImport}
/>
