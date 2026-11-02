<script lang="ts">
    /**
     * Offers to update the online backup after every change made in this browser.
     *
     * Mounted by the root layout, beside the network indicator. It stays silent
     * unless a service is configured, this browser has synchronised with it at
     * least once, and automatic publishing is off: with it on, the network
     * indicator already says a send is on its way. A browser that never
     * synchronised does not know what the service holds, and offering a one
     * click send there would overwrite a backup nobody here has ever read.
     *
     * Waved away, the reminder comes back with the next change, not before.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import Toast from "flowbite-svelte/Toast.svelte";
    import { sync } from "#lib/state/sync.svelte.ts";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { remote } from "#lib/state/remote.svelte.ts";
    import { motionDuration } from "#lib/config/motion.ts";
    import CloudUpload from "@lucide/svelte/icons/cloud-upload";
    import { REMOTE_FAILURE_MESSAGE } from "#lib/config/remote.ts";

    let online = $state( true );
    let failure = $state<string | null>( null );

    /** Change marker the reminder was last waved away on, so the next change brings it back. */
    let dismissedChange = $state<string | null>( null );

    // A failure belongs to the content that was being sent: a new change is a new
    // offer, and the old reason has nothing left to say about it.
    $effect( () =>
    {
        void wiki.changedAt;

        failure = null;
    } );

    const ready = $derived( remote.loaded && wiki.overlayLoaded && remote.configured );
    const manual = $derived( ready && !remote.config.autoPush && sync.localState === "stale" );

    /**
     * Whether the reminder is on screen.
     *
     * Hidden while the arrival offer is up: that one already names both sides, and
     * a send offered next to it would answer a question the reader has not settled.
     */
    const visible = $derived(
        manual && online && !sync.prompting && dismissedChange !== wiki.changedAt
    );

    /**
     * Sends the content as it stands, refusing to overwrite a concurrent change.
     *
     * @author Claude
     */
    const send = async (): Promise<void> =>
    {
        failure = null;

        const stored = await sync.send();

        if ( !stored && remote.failure )
        {
            failure = REMOTE_FAILURE_MESSAGE[ remote.config.kind ][ remote.failure ]();
        }
    };
</script>

<svelte:window bind:online />

{#if visible}
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
            <CloudUpload class="text-accent-600 dark:text-accent-400 mt-0.5 h-4 w-4 shrink-0" />

            <div class="min-w-0">
                <p class="leading-relaxed">{m.backup_reminder_message()}</p>

                {#if failure}
                    <p class="text-alert-600 dark:text-alert-500 mt-2 text-xs leading-relaxed">
                        {failure}
                        <a class="underline" href={resolve( "/data" )}>{m.connection_status_open_backups()}</a>
                    </p>
                {/if}

                <div class="mt-3 flex flex-wrap gap-2">
                    <Button
                        size="xs"
                        color="primary"
                        disabled={remote.busy}
                        loading={remote.busy}
                        onclick={() => void send()}
                    >
                        {remote.busy ? m.connection_status_sending() : m.backup_reminder_send()}
                    </Button>

                    <Button size="xs" color="alternative" onclick={() => ( dismissedChange = wiki.changedAt )}>
                        {m.backup_reminder_later()}
                    </Button>
                </div>
            </div>
        </div>
    </Toast>
{/if}
