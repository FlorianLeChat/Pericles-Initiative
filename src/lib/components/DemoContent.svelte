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
     * everything exactly as a restore does and needs the same confirmation. It also
     * switches the interface to English, the language the fiction is written in.
     *
     * Rendered inside the identity form of `SettingsForm`, which is why its trigger
     * spells out `type="button"`: a button inside a `<form>` submits it by default,
     * and here that would save the identity the reader is about to have replaced.
     *
     * @author Claude
     */
    import Alert from "flowbite-svelte/Alert.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { ACTION_BUTTON } from "$lib/config/forms";
    import * as m from "$lib/locales/messages.js";
    import { setLocale } from "$lib/locales/runtime";
    import { wiki } from "$lib/state/wiki.svelte";
    import { normalizeDataset } from "$lib/utilities/dataset";

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
            const { demoDataset } = await import( "$lib/demo" );

            wiki.importDataset( normalizeDataset( demoDataset() ) );

            // The fiction is written in English, so the interface follows it rather
            // than framing an English encyclopedia in French labels. Told not to
            // reload, because `setLocale` only does so when the locale actually
            // changes and the reload below is needed in both cases.
            await setLocale( "en", { reload: false } );

            // The identity form of this page reads `meta` once, when it mounts, so it
            // would go on showing the previous name and write it back over the import
            // on its next save. Reloading is what the language switch of that same
            // form already does, and it puts every panel of the site on the new
            // content at once.
            window.location.reload();
        }
        catch
        {
            failed = true;
            loading = false;
        }
    };
</script>

<section class="surface space-y-3 p-6" aria-labelledby="demo-heading">
    <h2 id="demo-heading" class="font-serif text-xl font-semibold tracking-tight">{m.demo_heading()}</h2>

    <p class="text-muted text-sm leading-relaxed">{m.demo_description()}</p>

    {#if failed}
        <Alert color="red" class="rounded-xl text-sm" role="status">{m.demo_error()}</Alert>
    {/if}

    <Button
        type="button"
        color="alternative"
        class={ACTION_BUTTON}
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
