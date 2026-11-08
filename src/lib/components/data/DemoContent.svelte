<script lang="ts">
    /**
     * Panel filling this browser with the demonstration wiki.
     *
     * A first visitor arrives on an empty encyclopedia, since the only storage the
     * site has is the reader's own. This offers the other starting point: one
     * complete universe, enough to see what every listing, the chronology, the
     * dashboard and the feed look like with content in them.
     *
     * It is an import, not a seed. The dataset goes through `normalizeDataset` and
     * `importDataset`, the very path a restored backup takes, so it replaces
     * everything exactly as a restore does and needs the same confirmation. That
     * is also why it sits among the backups rather than among the settings: it is
     * a third way of filling this browser, beside the restore of a file. It also
     * switches the interface to English, the language the fiction is written in.
     *
     * Its button is the primary action of the page only while this browser holds
     * no page: there, the demonstration is the obvious next step. Once the wiki
     * holds pages of its own, the same press replaces them, so it steps back to a
     * secondary button and the confirmation offers to download them first.
     *
     * Its two paragraphs keep a 65ch measure: the card spans the column, and at
     * full width a line ran to some hundred and twenty five characters.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import Alert from "flowbite-svelte/Alert.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import DownloadFirst from "./DownloadFirst.svelte";
    import { setLocale } from "#lib/locales/runtime.js";
    import { ACTION_BUTTON } from "#lib/config/forms.ts";
    import { normalizeDataset } from "#lib/utilities/dataset.ts";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";

    let confirmOpen = $state( false );
    let loading = $state( false );
    let failed = $state( false );

    /**
     * Replaces the content of this browser with the demonstration wiki.
     *
     * @returns Resolves once the content is stored, or once the load has failed.
     * @author Claude
     */
    const load = async (): Promise<void> =>
    {
        loading = true;
        failed = false;

        try
        {
            // Imported here rather than at the top of the module so the fiction sits
            // in a chunk of its own: it weighs more than the panel offering it, and a
            // reader who never asks for it never downloads it.
            const { demoDataset } = await import( "#lib/demo.ts" );

            wiki.importDataset( normalizeDataset( demoDataset() ) );

            // The fiction is written in English, so the interface follows it rather
            // than framing an English encyclopedia in French labels. Told not to
            // reload, because `setLocale` only does so when the locale actually
            // changes and the reload below is needed in both cases.
            await setLocale( "en", { reload: false } );

            window.location.reload();
        }
        catch
        {
            failed = true;
            loading = false;
        }
    };
</script>

<section class="surface mt-6 space-y-3 p-6" aria-labelledby="demo-heading">
    <h2 id="demo-heading" class="section-heading">{m.demo_heading()}</h2>

    <p class="text-muted max-w-help text-sm leading-relaxed text-pretty">{m.demo_description()}</p>

    <p class="text-ink-600 dark:text-paper-300 max-w-help text-sm leading-relaxed text-pretty">{m.demo_note()}</p>

    {#if failed}
        <Alert color="red" class="rounded-xl text-sm" role="status">{m.demo_error()}</Alert>
    {/if}

    <Button
        color={wiki.hasStoredContent ? "alternative" : "primary"}
        class="mt-2 {ACTION_BUTTON}"
        disabled={loading}
        onclick={() => ( confirmOpen = true )}
    >
        {loading ? m.demo_button_loading() : m.demo_button()}
    </Button>
</section>

<ConfirmDialog
    bind:open={confirmOpen}
    title={m.demo_confirm_title()}
    message={wiki.hasStoredContent ? m.demo_confirm_message() : m.demo_confirm_message_empty()}
    confirmLabel={m.demo_confirm_label()}
    danger={wiki.hasStoredContent}
    onconfirm={() => void load()}
>
    {#if confirmOpen && wiki.hasStoredContent}
        <DownloadFirst />
    {/if}
</ConfirmDialog>
