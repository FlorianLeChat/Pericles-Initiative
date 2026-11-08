<script lang="ts">
    /**
     * Offers, from inside a confirmation about to replace or erase the wiki, to
     * download it first.
     *
     * Three confirmations end in the same loss, a restore, the demonstration and
     * the reset of the content, and each used to leave the copy to the reader's
     * memory, or to a sentence telling them to go and make one. The dialog stays
     * open after the download, and the line under the button says it happened.
     *
     * Under it, a confirmation that replaces the wiki says whether the wiki will
     * stay within reach from `/data` afterwards, set aside by the store, or
     * whether this browser has no room for that copy and the download is the
     * only way back. A browser holding no page has nothing to lose, and hears
     * neither.
     *
     * The confirmation keeps its `<dialog>` mounted while closed, so a caller
     * renders this inside an `{#if}` on its open state: a new confirmation then
     * starts without the line of the previous one.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { downloadBackup } from "#lib/utilities/download.ts";

    interface Props {
        /** True when the confirmation replaces the content, false for a reset of the settings alone. */
        replacesWiki?: boolean;
    }

    let { replacesWiki = true }: Props = $props();

    let downloaded = $state( false );

    /**
     * Downloads the current content, leaving the confirmation open.
     *
     * @author Claude
     */
    const download = (): void =>
    {
        downloadBackup( wiki.exportJson() );
        downloaded = true;
    };
</script>

{#if replacesWiki && wiki.hasStoredContent}
    <p class="text-muted mt-3 text-sm leading-relaxed">
        {wiki.canKeepPrevious ? m.download_first_previous_kept() : m.download_first_previous_unkept()}
    </p>
{/if}

<div class="mt-4 flex flex-col items-start gap-2">
    <Button color="alternative" size="sm" onclick={download}>{m.common_download_first()}</Button>

    <p class="text-xs" role="status">
        {#if downloaded}
            {m.common_download_first_done()}
        {/if}
    </p>
</div>
