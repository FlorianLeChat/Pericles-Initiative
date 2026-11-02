<script lang="ts">
    /**
     * Offers a more recent online backup when the site is reached.
     *
     * Mounted by the root layout, so the check happens whatever page the reader
     * lands on. The service is read once on arrival, then again on a page change
     * or when the tab comes back into view, at most once a minute: `SyncStore`
     * decides what is worth saying, and this only says it.
     *
     * The offer shows once. Waved away, it stays hidden across every page until
     * the backup has been up to date again and then stopped being so, which is
     * the only news worth interrupting the reader for a second time.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import { afterNavigate } from "$app/navigation";
    import Toast from "flowbite-svelte/Toast.svelte";
    import { sync } from "#lib/state/sync.svelte.ts";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { remote } from "#lib/state/remote.svelte.ts";
    import { motionDuration } from "#lib/config/motion.ts";
    import { formatDateTime } from "#lib/utilities/date.ts";
    import { REMOTE_FAILURE_MESSAGE } from "#lib/config/remote.ts";
    import CloudDownload from "@lucide/svelte/icons/cloud-download";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";

    let restoreOpen = $state( false );
    let sendOpen = $state( false );
    let failure = $state<string | null>( null );

    // Both stores live in `localStorage`, so the arrival can only be handled once
    // mounted, and only once both have been read: judging the snapshot against an
    // overlay not loaded yet would compare it with an empty wiki.
    $effect( () =>
    {
        remote.loadConfig();

        if ( remote.loaded && wiki.overlayLoaded )
        {
            sync.arrive();
        }
    } );

    afterNavigate( () =>
    {
        sync.recheck();
    } );

    /**
     * Checks the service again when the reader comes back to the tab.
     *
     * @author Claude
     */
    const onVisibilityChange = (): void =>
    {
        if ( document.visibilityState === "visible" )
        {
            sync.recheck();
        }
    };

    const remoteDate = $derived( formatDateTime( sync.remoteChangedAt ) );
    const localDate = $derived( formatDateTime( wiki.changedAt ) );

    const message = $derived.by( (): string =>
    {
        switch ( sync.verdict )
        {
            case "newer":
                return m.sync_prompt_newer( { date: remoteDate } );
            case "older":
                return m.sync_prompt_older( { local: localDate, remote: remoteDate } );
            case "diverged":
                return m.sync_prompt_diverged( { local: localDate, remote: remoteDate } );
            default:
                return "";
        }
    } );

    const canRestore = $derived( sync.verdict === "newer" || sync.verdict === "diverged" );
    const canSend = $derived( sync.verdict === "older" || sync.verdict === "diverged" );

    /**
     * Installs the snapshot of the service, read afresh rather than the one checked.
     *
     * @author Claude
     */
    const restore = async (): Promise<void> =>
    {
        failure = null;

        const counts = await sync.restore();

        if ( !counts && remote.failure )
        {
            failure = REMOTE_FAILURE_MESSAGE[ remote.failure ]();
        }
    };

    /**
     * Sends this browser's content over the snapshot, once the reader confirmed it.
     *
     * Unconditional on purpose: the reader has just been shown that the backup
     * differs, and chose to replace it, so a `412` would only refuse what was asked.
     *
     * @author Claude
     */
    const send = async (): Promise<void> =>
    {
        failure = null;

        const stored = await sync.send( false );

        if ( !stored && remote.failure )
        {
            failure = REMOTE_FAILURE_MESSAGE[ remote.failure ]();
        }
    };
</script>

<svelte:document onvisibilitychange={onVisibilityChange} />

{#if sync.prompting}
    <Toast
        dismissable={false}
        color="gray"
        params={{ duration: motionDuration() }}
        class="surface text-ink-800 dark:text-paper-200 pointer-events-auto max-w-sm rounded-2xl p-4 text-sm
               shadow-lg max-sm:w-full max-sm:max-w-none"
        role="status"
        aria-live="polite"
    >
        <div class="flex items-start gap-2.5">
            <CloudDownload class="text-accent-600 dark:text-accent-400 mt-0.5 h-4 w-4 shrink-0" />

            <div class="min-w-0">
                <p class="leading-relaxed">{message}</p>

                {#if failure}
                    <p class="text-alert-600 dark:text-alert-500 mt-2 text-xs leading-relaxed">{failure}</p>
                {/if}

                <div class="mt-3 flex flex-wrap gap-2">
                    {#if canRestore}
                        <Button
                            size="xs"
                            color="primary"
                            disabled={remote.busy}
                            onclick={() => ( restoreOpen = true )}
                        >
                            {m.sync_prompt_restore()}
                        </Button>
                    {/if}

                    {#if canSend}
                        <Button
                            size="xs"
                            color={canRestore ? "alternative" : "primary"}
                            disabled={remote.busy}
                            onclick={() => ( sendOpen = true )}
                        >
                            {m.sync_prompt_send()}
                        </Button>
                    {/if}

                    <Button size="xs" color="alternative" onclick={() => sync.dismiss()}>
                        {m.sync_prompt_ignore()}
                    </Button>
                </div>
            </div>
        </div>
    </Toast>
{/if}

<ConfirmDialog
    bind:open={restoreOpen}
    title={m.remote_backup_restore_confirm_title()}
    message={m.remote_backup_restore_confirm_message()}
    confirmLabel={m.common_restore()}
    onconfirm={() => void restore()}
/>

<ConfirmDialog
    bind:open={sendOpen}
    title={m.remote_backup_overwrite_confirm_title()}
    message={m.remote_backup_overwrite_confirm_message()}
    confirmLabel={m.remote_backup_overwrite_confirm_label()}
    danger
    onconfirm={() => void send()}
/>
