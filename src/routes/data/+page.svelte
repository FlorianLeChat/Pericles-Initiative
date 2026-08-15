<script lang="ts">
    /**
     * Data management: what this browser holds, and the two ways of backing it up.
     *
     * The page only assembles the panels. Each one owns its own state and its own
     * feedback, since a file backup and an online backup fail for unrelated
     * reasons and must never speak for each other.
     *
     * @author Claude
     */
    import Alert from "flowbite-svelte/Alert.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import FileBackup from "$lib/components/data/FileBackup.svelte";
    import LocalContent from "$lib/components/data/LocalContent.svelte";
    import RemoteBackup from "$lib/components/data/RemoteBackup.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { ACTION_BUTTON } from "$lib/config/forms";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";

    let resetOpen = $state( false );
    let feedback = $state<string | null>( null );
</script>

<svelte:head>
    <title>{m.data_title( { universe: wiki.meta.universe } )}</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <PageHeader title={m.data_heading()}>
        {#snippet description()}
            {m.data_description()}
        {/snippet}
    </PageHeader>

    {#if feedback}
        <Alert color="primary" class="mt-6 rounded-xl text-sm" role="status">{feedback}</Alert>
    {/if}

    <div class="mt-8">
        <LocalContent />
    </div>

    <FileBackup />

    <RemoteBackup />

    <section class="border-alert-500/30 mt-6 rounded-2xl border p-6">
        <h2 class="font-serif text-xl font-semibold tracking-tight">{m.data_clear_heading()}</h2>

        <p class="text-muted mt-2 text-sm leading-relaxed">
            {m.data_clear_description()}
        </p>

        <Button
            color="red"
            class="mt-5 {ACTION_BUTTON}"
            disabled={!wiki.hasStoredContent}
            onclick={() => ( resetOpen = true )}
        >
            {m.data_clear_button()}
        </Button>
    </section>
</div>

<ConfirmDialog
    bind:open={resetOpen}
    title={m.data_reset_dialog_title()}
    message={m.data_reset_dialog_message()}
    confirmLabel={m.data_reset_confirm_label()}
    danger
    onconfirm={() =>
    {
        wiki.resetLocal();
        feedback = m.data_reset_feedback();
    }}
/>
