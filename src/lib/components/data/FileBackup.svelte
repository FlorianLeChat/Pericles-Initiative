<script lang="ts">
    /**
     * File backup: writing the wiki to a `wiki.json`, and reading one back.
     *
     * Export and import are two directions of the same thing, so they share one
     * panel, told apart from the online backup by the medium: a file on this
     * device, no server involved, no request fired.
     *
     * A restore replaces everything and keeps no undo, since a second copy of the
     * wiki would share the storage quota with the first. So the file is read and
     * normalised before anything is asked: the confirmation shows what this
     * device holds against what the file holds, and offers to download the
     * current version first, from inside the dialog.
     *
     * @author Claude
     */
    import type { Dataset } from "#lib/types.ts";
    import * as m from "#lib/locales/messages.js";
    import Alert from "flowbite-svelte/Alert.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { pluralize } from "#lib/utilities/plural.ts";
    import Textarea from "flowbite-svelte/Textarea.svelte";
    import Fileupload from "flowbite-svelte/Fileupload.svelte";
    import { normalizeDataset } from "#lib/utilities/dataset.ts";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import { ACTION_BUTTON, ACTION_ROW } from "#lib/config/forms.ts";

    /**
     * Top level keys every export writes. A JSON object carrying none of them is
     * some other file, and normalising it would quietly restore an empty wiki.
     */
    const BACKUP_KEYS = [ "meta", "entries", "categories", "live" ];

    let importText = $state( "" );
    let feedback = $state<{ kind: "success" | "error"; text: string } | null>( null );
    let importOpen = $state( false );
    let pending = $state<Dataset | null>( null );
    let downloadedFirst = $state( false );

    /**
     * Phrases how much a wiki holds, each noun agreeing with its own count.
     *
     * @param counts Pages, categories and feed items.
     * @returns One sentence fragment, such as «3 fiches, 1 catégorie et 0 entrée du fil».
     * @author Claude
     */
    const summarize = ( counts: { entries: number; categories: number; live: number } ): string =>
    {
        const entries = pluralize( counts.entries, { one: m.common_count_fiche_one, other: m.common_count_fiche_other } );
        const categories = pluralize(
            counts.categories,
            { one: m.common_count_categorie_one, other: m.common_count_categorie_other }
        );
        const live = pluralize( counts.live, { one: m.common_count_entree_one, other: m.common_count_entree_other } );

        return m.file_backup_compare_counts( { entries, categories, live } );
    };

    /**
     * Counts what a wiki holds, be it the store or a backup read from a file.
     *
     * @param content Pages, categories and feed items.
     * @returns How many of each.
     * @author Claude
     */
    const countsOf = (
        content: Pick<Dataset, "entries" | "categories" | "live">
    ): { entries: number; categories: number; live: number } => ( {
        entries: content.entries.length,
        categories: content.categories.length,
        live: content.live.length
    } );

    const currentSummary = $derived( summarize( countsOf( wiki ) ) );
    const pendingSummary = $derived( pending ? summarize( countsOf( pending ) ) : "" );
    const otherUniverse = $derived( pending !== null && pending.meta.universe !== wiki.meta.universe );

    /**
     * Parses JSON without throwing.
     *
     * @param text Raw text.
     * @returns The parsed value wrapped, so that a literal `null` stays apart from a failure.
     * @author Claude
     */
    const parseJson = ( text: string ): { value: unknown } | null =>
    {
        try
        {
            return { value: JSON.parse( text ) as unknown };
        }
        catch
        {
            return null;
        }
    };

    /**
     * Reads a pasted or chosen backup without installing it.
     *
     * @param text Raw content of the backup.
     * @returns The normalised dataset, or null when the text is not a backup.
     * @author Claude
     */
    const readBackup = ( text: string ): Dataset | null =>
    {
        const parsed = parseJson( text )?.value;
        const isObject = typeof parsed === "object" && parsed !== null && !Array.isArray( parsed );

        if ( !isObject )
        {
            return null;
        }

        const looksLikeBackup = BACKUP_KEYS.some( ( key ) => key in parsed );

        return looksLikeBackup ? normalizeDataset( parsed ) : null;
    };

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
            feedback = { kind: "error", text: m.file_backup_copy_error() };
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

        try
        {
            importText = await file.text();
            feedback = { kind: "success", text: m.file_backup_file_ready( { name: file.name } ) };
        }
        catch
        {
            feedback = { kind: "error", text: m.file_backup_import_error() };
        }
    };

    /**
     * Reads the pending backup, then either asks for confirmation or says why it cannot be used.
     *
     * @author Claude
     */
    const prepareImport = (): void =>
    {
        const dataset = readBackup( importText );

        if ( !dataset )
        {
            feedback = { kind: "error", text: m.file_backup_import_error() };

            return;
        }

        feedback = null;
        pending = dataset;
        downloadedFirst = false;
        importOpen = true;
    };

    /**
     * Downloads the current version from inside the confirmation, which stays open.
     *
     * @author Claude
     */
    const downloadFirst = (): void =>
    {
        download();
        downloadedFirst = true;
    };

    /**
     * Installs the backup the reader has just compared and confirmed.
     *
     * @author Claude
     */
    const runImport = (): void =>
    {
        if ( !pending )
        {
            return;
        }

        const counts = wiki.importDataset( pending );

        pending = null;
        importText = "";
        feedback = { kind: "success", text: m.file_backup_restored_summary( { summary: summarize( counts ) } ) };
    };
</script>

<section class="surface mt-6 p-6" aria-labelledby="file-backup-heading">
    <h2 id="file-backup-heading" class="section-heading">{m.file_backup_heading()}</h2>

    <p class="text-muted mt-1.5 text-sm">{m.file_backup_intro()}</p>

    {#if feedback}
        <Alert
            color={feedback.kind === "success" ? "primary" : "red"}
            class="mt-5 rounded-xl text-sm"
            role={feedback.kind === "success" ? "status" : "alert"}
        >
            {feedback.text}
        </Alert>
    {/if}

    <div class="mt-6">
        <h3 class="font-semibold">{m.file_backup_download_heading()}</h3>

        <p class="text-muted mt-1 text-sm">{m.file_backup_download_description()}</p>

        <div class="mt-4 {ACTION_ROW}">
            <Button color="primary" onclick={download}>{m.file_backup_download_button()}</Button>

            <Button color="alternative" onclick={() => void copy()}>{m.file_backup_copy_button()}</Button>
        </div>
    </div>

    <div class="border-paper-200 dark:border-ink-800 mt-6 border-t pt-6">
        <h3 class="font-semibold">{m.file_backup_restore_heading()}</h3>

        <p class="text-muted mt-1 text-sm">{m.file_backup_restore_description()}</p>

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
                onclick={prepareImport}
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
    confirmLabel={m.file_backup_replace_confirm()}
    danger
    onconfirm={runImport}
>
    <dl
        class="border-paper-200 dark:border-ink-800 divide-paper-200 dark:divide-ink-800 mt-4 divide-y rounded-lg
               border"
    >
        <div class="px-3 py-2.5">
            <dt class="text-ink-900 dark:text-paper-100 font-medium">{m.file_backup_compare_current()}</dt>
            <dd>{currentSummary}</dd>
        </div>

        <div class="px-3 py-2.5">
            <dt class="text-ink-900 dark:text-paper-100 font-medium">{m.file_backup_compare_file()}</dt>
            <dd>{pendingSummary}</dd>

            {#if pending && otherUniverse}
                <dd class="mt-1">
                    {m.file_backup_compare_universe( { file: pending.meta.universe, current: wiki.meta.universe } )}
                </dd>
            {/if}
        </div>
    </dl>

    <div class="mt-4 flex flex-col items-start gap-2">
        <Button color="alternative" size="sm" onclick={downloadFirst}>{m.file_backup_download_first()}</Button>

        <p class="text-xs" role="status">
            {#if downloadedFirst}
                {m.file_backup_download_first_done()}
            {/if}
        </p>
    </div>
</ConfirmDialog>
