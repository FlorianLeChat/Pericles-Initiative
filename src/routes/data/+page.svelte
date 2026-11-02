<script lang="ts">
    /**
     * Data management: what this browser holds, the ways of backing it up, and the
     * demonstration wiki that can fill it instead.
     *
     * The page only assembles the panels. Each one owns its own state and its own
     * feedback, since a file backup and an online backup fail for unrelated
     * reasons and must never speak for each other.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import Alert from "flowbite-svelte/Alert.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import ToolsNav from "#lib/components/layout/ToolsNav.svelte";
    import ResetPanel from "#lib/components/data/ResetPanel.svelte";
    import BackupPanel from "#lib/components/data/BackupPanel.svelte";
    import DemoContent from "#lib/components/data/DemoContent.svelte";
    import LocalContent from "#lib/components/data/LocalContent.svelte";

    let feedback = $state<string | null>( null );
</script>

<PageMeta title={m.data_title( { universe: wiki.meta.universe } )} />

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <PageHeader title={m.data_heading()}>
        {#snippet description()}
            {m.data_description()}
        {/snippet}
    </PageHeader>

    <ToolsNav />

    {#if feedback}
        <Alert color="primary" class="mt-6 rounded-xl text-sm" role="status">{feedback}</Alert>
    {/if}

    <div class="mt-8">
        <LocalContent />
    </div>

    <BackupPanel />

    <DemoContent />

    <ResetPanel
        heading={m.data_clear_heading()}
        description={m.data_clear_description()}
        action={m.data_clear_button()}
        disabled={!wiki.hasStoredContent}
        confirmTitle={m.data_reset_dialog_title()}
        confirmMessage={m.data_reset_dialog_message()}
        confirmLabel={m.data_reset_confirm_label()}
        onconfirm={() =>
        {
            wiki.resetContent();
            feedback = m.data_reset_feedback();
        }}
    >
        {#snippet spares()}
            {m.data_clear_spares_intro()}
            <a href={resolve( "/settings" )} class="wiki-link">{m.common_settings_link()}</a>.
        {/snippet}
    </ResetPanel>
</div>
