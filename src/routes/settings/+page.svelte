<script lang="ts">
    /**
     * Settings page shell: title and header. The identity form itself lives in
     * `SettingsForm`, mounted only once the overlay has been read, see there.
     *
     * @author Claude
     */
    import PageHeader from "$lib/components/PageHeader.svelte";
    import SettingsForm from "$lib/components/SettingsForm.svelte";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
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
    {:else}
        <p class="text-muted mt-8 text-sm">{m.settings_loading()}</p>
    {/if}
</div>
