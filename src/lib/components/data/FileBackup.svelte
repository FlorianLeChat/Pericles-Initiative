<script lang="ts">
    /**
     * File backup: writing the wiki to a `wiki.json`, and reading one back.
     *
     * Export and import are two directions of the same thing, so they share one
     * body, the one `BackupPanel` shows under its file tile: a file on this
     * device, no server involved, no request fired.
     *
     * A restore replaces everything; the store sets the wiki it replaces aside
     * when it fits, and the confirmation says whether it will. So the file is read and
     * normalised before anything is asked: the confirmation shows what this
     * device holds against what the file holds, and offers to download the
     * current version first, from inside the dialog.
     *
     * The file is chosen through a button of the site rather than the browser's
     * own file field, which writes «Choose File» and «No file chosen» in the
     * language of the browser, not the page's. The real field stays, hidden, and
     * keeps the label; the name of the chosen file shows beside the button and
     * describes it.
     *
     * The download is the primary action of the page while the browser holds
     * pages, and steps back to the alternative style when it holds none, leaving
     * the place to the demonstration; with nothing stored at all, not even an
     * identity, there is nothing to write, and the download leaves with its copy
     * rather than standing disabled beside a copy that still answered. The restore stays an
     * alternative button in every case: it replaces the wiki, and its confirmation
     * says so in red, so it is never the step the page invites first.
     *
     * Each half speaks under its own buttons: the download and the copy under
     * theirs, the reading of a file and the restore under the restore button. One
     * message above the download used to answer a failed restore about nine
     * hundred pixels above the button pressed, on a phone.
     *
     * The paste area is a mono field, but its placeholder is a sentence and keeps
     * the sans.
     *
     * @author Claude
     */
    import type { Dataset } from "#lib/types.ts";
    import * as m from "#lib/locales/messages.js";
    import Alert from "flowbite-svelte/Alert.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Upload from "@lucide/svelte/icons/upload";
    import Button from "flowbite-svelte/Button.svelte";
    import DownloadFirst from "./DownloadFirst.svelte";
    import { sound } from "#lib/state/sound.svelte.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import Textarea from "flowbite-svelte/Textarea.svelte";
    import { downloadBackup } from "#lib/utilities/download.ts";
    import { normalizeDataset } from "#lib/utilities/dataset.ts";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import { ACTION_BUTTON, ACTION_ROW, FIELD, TOUCH_HEIGHT } from "#lib/config/forms.ts";

    /**
     * Top level keys every export writes. A JSON object carrying none of them is
     * some other file, and normalising it would quietly restore an empty wiki.
     */
    const BACKUP_KEYS = [ "meta", "entries", "categories", "live" ];

    let importText = $state( "" );
    let fileField: HTMLInputElement | undefined = $state();

    /** Name of the file last chosen, empty until one is. */
    let fileName = $state( "" );
    let feedback = $state<{ kind: "success" | "error"; text: string; area: "download" | "restore" } | null>( null );
    let importOpen = $state( false );
    let pending = $state<Dataset | null>( null );

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
        const categories = pluralize( counts.categories, {
            one: m.common_count_categorie_one,
            other: m.common_count_categorie_other
        } );
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
        downloadBackup( wiki.exportJson() );
        sound.cue( "ready" );

        feedback = { kind: "success", text: m.file_backup_download_success(), area: "download" };
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
            sound.cue( "success", { emphasis: "subtle" } );
            feedback = { kind: "success", text: m.file_backup_copy_success(), area: "download" };
        }
        catch
        {
            sound.cue( "error" );
            feedback = { kind: "error", text: m.file_backup_copy_error(), area: "download" };
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

        fileName = file.name;

        try
        {
            importText = await file.text();
            feedback = { kind: "success", text: m.file_backup_file_ready( { name: file.name } ), area: "restore" };
        }
        catch
        {
            sound.cue( "error" );
            feedback = { kind: "error", text: m.file_backup_import_error(), area: "restore" };
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
            sound.cue( "error" );
            feedback = { kind: "error", text: m.file_backup_import_error(), area: "restore" };

            return;
        }

        feedback = null;
        pending = dataset;
        importOpen = true;
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

        sound.cue( "success" );

        pending = null;
        importText = "";
        feedback = {
            kind: "success",
            text: m.file_backup_restored_summary( { summary: summarize( counts ) } ),
            area: "restore"
        };
    };
</script>

{#snippet message( area: "download" | "restore" )}
    {#if feedback?.area === area}
        <Alert
            color={feedback.kind === "success" ? "primary" : "red"}
            class="mt-4 rounded-xl text-sm"
            role={feedback.kind === "success" ? "status" : "alert"}
        >
            {feedback.text}
        </Alert>
    {/if}
{/snippet}

<div>

    {#if wiki.hasStoredItems}
        <div class="border-paper-200 dark:border-ink-700 mb-6 border-b pb-6">
            <h3 class="font-semibold">{m.file_backup_download_heading()}</h3>

            <p class="text-muted mt-1 max-w-help text-sm">{m.file_backup_download_description()}</p>

            <div class="mt-4 {ACTION_ROW}">
                <Button color={wiki.hasStoredContent ? "primary" : "alternative"} onclick={download}>
                    {m.file_backup_download_button()}
                </Button>

                <Button color="alternative" onclick={() => void copy()}>{m.file_backup_copy_button()}</Button>
            </div>

            {@render message( "download" )}
        </div>
    {/if}

    <div>
        <h3 class="font-semibold">{m.file_backup_restore_heading()}</h3>

        <p class="text-muted mt-1 max-w-help text-sm">{m.file_backup_restore_description()}</p>

        <div class="mt-4 space-y-4">
            <div>
                <Label for="import-file" class="field-label">{m.file_backup_file_label()}</Label>

                <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Button
                        color="alternative"
                        size="sm"
                        class="gap-2 rounded-full {TOUCH_HEIGHT}"
                        aria-describedby="import-file-name"
                        onclick={() => fileField?.click()}
                    >
                        <Upload class="h-4 w-4" />
                        {m.file_backup_choose_button()}
                    </Button>

                    <span id="import-file-name" class="text-muted min-w-0 truncate text-sm">
                        {fileName || m.file_backup_no_file()}
                    </span>
                </div>

                <input
                    bind:this={fileField}
                    id="import-file"
                    type="file"
                    accept="application/json,.json"
                    class="hidden"
                    onchange={( event: Event ) => void onFile( event )}
                />
            </div>

            <div>
                <Label for="import-text" class="field-label">{m.file_backup_paste_label()}</Label>

                <Textarea
                    id="import-text"
                    bind:value={importText}
                    rows={5}
                    class="{FIELD} w-full resize-y font-mono text-xs placeholder:font-sans"
                    placeholder={m.file_backup_paste_placeholder()}
                />
            </div>

            <Button
                color="alternative"
                class={ACTION_BUTTON}
                disabled={importText.trim().length === 0}
                onclick={prepareImport}
            >
                {m.file_backup_restore_button()}
            </Button>

            {@render message( "restore" )}
        </div>
    </div>
</div>

<ConfirmDialog
    bind:open={importOpen}
    title={m.file_backup_replace_title()}
    message={m.file_backup_replace_message()}
    confirmLabel={m.file_backup_replace_confirm()}
    danger={wiki.hasStoredContent}
    onconfirm={runImport}
>
    <dl
        class="border-paper-200 dark:border-ink-700 divide-paper-200 dark:divide-ink-700 mt-4 divide-y rounded-lg
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

    {#if importOpen}
        <DownloadFirst />
    {/if}
</ConfirmDialog>
