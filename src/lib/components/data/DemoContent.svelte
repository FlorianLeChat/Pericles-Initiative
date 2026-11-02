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
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import Alert from "flowbite-svelte/Alert.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { setLocale } from "#lib/locales/runtime.js";
    import { normalizeDataset } from "#lib/utilities/dataset.ts";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import { ACTION_BUTTON, DANGER_OUTLINE } from "#lib/config/forms.ts";

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

            // A language only changes on a document load, and the identity form of
            // the settings reads `meta` once, when it mounts: reloading puts every
            // panel of the site on the new content and the new language at once.
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

    <p class="text-muted text-sm leading-relaxed">{m.demo_description()}</p>

    <p class="text-ink-600 dark:text-paper-300 text-sm leading-relaxed">{m.demo_note()}</p>

    {#if failed}
        <Alert color="red" class="rounded-xl text-sm" role="status">{m.demo_error()}</Alert>
    {/if}

    <Button
        color="alternative"
        class="mt-2 {ACTION_BUTTON} {DANGER_OUTLINE}"
        disabled={loading}
        onclick={() => ( confirmOpen = true )}
    >
        {loading ? m.demo_button_loading() : m.demo_button()}
    </Button>
</section>

<ConfirmDialog
    bind:open={confirmOpen}
    title={m.demo_confirm_title()}
    message={m.demo_confirm_message()}
    confirmLabel={m.demo_confirm_label()}
    danger
    onconfirm={() => void load()}
/>
