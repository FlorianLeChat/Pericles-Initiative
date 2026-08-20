<script lang="ts">
    /**
     * Settings page shell: title, header, identity form and the reset undoing it.
     *
     * The form itself lives in `SettingsForm`, mounted only once the overlay has
     * been read, see there. The reset waits on the very same condition, and for a
     * harder reason: `resetMeta` writes the overlay back, so run before
     * `localStorage` had been read it would persist the empty one over every page
     * this browser holds.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import ResetPanel from "$lib/components/data/ResetPanel.svelte";
    import SettingsForm from "$lib/components/settings/SettingsForm.svelte";
    import * as m from "$lib/locales/messages.js";
    import { localStorageKey } from "$lib/locales/runtime";
    import { wiki } from "$lib/state/wiki.svelte";

    /**
     * Puts every setting this page offers back to its default.
     *
     * The language is one of them, and it lives outside the overlay: forgetting
     * the stored choice hands the decision back to the strategy behind it, the
     * language the browser itself asks for. Nothing gates this button, since a
     * locale that was never chosen and one chosen to be the preferred one read
     * exactly the same from here.
     *
     * Reloading afterwards for the reason `DemoContent` already does, plus one:
     * the form snapshots the identity when it mounts, and a language only changes
     * on a document load.
     *
     * @author Claude
     */
    const reset = (): void =>
    {
        wiki.resetMeta();

        try
        {
            localStorage.removeItem( localStorageKey );
        }
        catch
        {
            /* storage unavailable, the language was never remembered anyway */
        }

        window.location.reload();
    };
</script>

<svelte:head>
    <title>{m.settings_title( { universe: wiki.meta.universe } )}</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <PageHeader title={m.settings_heading()}>
        {#snippet description()}
            {m.settings_description()}
        {/snippet}
    </PageHeader>

    {#if wiki.overlayLoaded}
        <SettingsForm />

        <ResetPanel
            heading={m.settings_reset_heading()}
            description={m.settings_reset_description()}
            action={m.settings_reset_button()}
            confirmTitle={m.settings_reset_confirm_title()}
            confirmMessage={m.settings_reset_confirm_message()}
            confirmLabel={m.settings_reset_confirm_label()}
            onconfirm={reset}
        >
            {#snippet spares()}
                {m.settings_reset_spares_intro()}
                <a href={resolve( "/data" )} class="wiki-link">{m.common_backups_link()}</a>.
            {/snippet}
        </ResetPanel>
    {:else}
        <p class="text-muted mt-8 text-sm">{m.settings_loading()}</p>
    {/if}
</div>
