<script lang="ts">
    /**
     * Data management: what this browser holds, the ways of backing it up, and the
     * demonstration wiki that can fill it instead.
     *
     * The page only assembles the panels. Each one owns its own state and its own
     * feedback, since a file backup and an online backup fail for unrelated
     * reasons and must never speak for each other.
     *
     * A browser holding pages opens on the backups, the job this page exists for,
     * and only then says what it stores, in one folded line. A browser holding
     * nothing opens on that empty inventory and the demonstration, the one step
     * it can take, ahead of a restore, and shows no reset of content it does not
     * have. After a replacement, the way back to the wiki it set aside comes
     * before everything else.
     *
     * A device set to read only keeps the download and the restore, the way a
     * player's device receives the wiki, but offers neither the demonstration nor
     * the erasing of the content: a player at the table has no use for either,
     * and should not be one tap away from emptying the game master's world.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import Alert from "flowbite-svelte/Alert.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import { sound } from "#lib/state/sound.svelte.ts";
    import { reading } from "#lib/state/reading.svelte.ts";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import ToolsNav from "#lib/components/layout/ToolsNav.svelte";
    import ResetPanel from "#lib/components/data/ResetPanel.svelte";
    import BackupPanel from "#lib/components/data/BackupPanel.svelte";
    import DemoContent from "#lib/components/data/DemoContent.svelte";
    import LocalContent from "#lib/components/data/LocalContent.svelte";
    import PreviousWiki from "#lib/components/data/PreviousWiki.svelte";

    let feedback = $state<string | null>( null );
</script>

<PageMeta title={m.data_title( { universe: wiki.meta.universe } )} />

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <PageHeader title={m.data_heading()} rule={false}>
        {#snippet description()}
            {m.data_description()}
        {/snippet}
    </PageHeader>

    <ToolsNav />

    <div class="max-w-4xl">
        {#if feedback}
            <Alert color="primary" class="mt-6 rounded-xl text-sm" role="status">{feedback}</Alert>
        {/if}

        <PreviousWiki />

        {#if wiki.hasStoredContent}
            <BackupPanel />

            <div class="mt-6">
                <LocalContent />
            </div>

            {#if !reading.enabled}
                <DemoContent />
            {/if}
        {:else}
            <div class="mt-8">
                <LocalContent />
            </div>

            {#if !reading.enabled}
                <DemoContent />
            {/if}

            <BackupPanel />
        {/if}

        {#if wiki.hasStoredContent && !reading.enabled}
            <ResetPanel
                heading={m.data_clear_heading()}
                description={m.data_clear_description()}
                action={m.data_clear_button()}
                confirmTitle={m.data_reset_dialog_title()}
                confirmMessage={m.data_reset_dialog_message()}
                confirmLabel={m.data_reset_confirm_label()}
                replacesWiki
                onconfirm={() =>
                {
                    wiki.resetContent();
                    sound.cue( "close", { emphasis: "strong" } );
                    feedback = m.data_reset_feedback();
                }}
            >
                {#snippet spares()}
                    {m.data_clear_spares_intro()}
                    <a href={resolve( "/settings" )} class="wiki-link">{m.common_settings_link()}</a>.
                {/snippet}
            </ResetPanel>
        {/if}
    </div>
</div>
