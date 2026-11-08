<script lang="ts">
    /**
     * Where the online backup stands, and the transfers in both directions.
     *
     * Shown once a destination is configured, whichever it is: a server and a
     * bucket hold the same snapshot and answer the same way, so sending,
     * restoring, the conflict and the automatic publishing read the same for
     * both. Only the sentences naming the destination itself differ.
     *
     * Each outcome is reported under the buttons that produced it, where the
     * reader is looking, rather than at the top of a panel a phone has scrolled past.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import Alert from "flowbite-svelte/Alert.svelte";
    import { sync } from "#lib/state/sync.svelte.ts";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import { ACTION_ROW } from "#lib/config/forms.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import DownloadFirst from "./DownloadFirst.svelte";
    import { remote } from "#lib/state/remote.svelte.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import { formatDateTime } from "#lib/utilities/date.ts";
    import CircleAlert from "@lucide/svelte/icons/circle-alert";
    import CircleCheck from "@lucide/svelte/icons/circle-check";
    import { REMOTE_FAILURE_MESSAGE } from "#lib/config/remote.ts";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";

    interface Props {
        /** False while the fields on screen lead nowhere, which disables the transfers. */
        ready: boolean;
        /** Stores the fields on screen, so a transfer goes where the reader sees. */
        commit: () => void;
        /** Called once the connection has been forgotten, with the sentence saying so. */
        onforget: ( text: string ) => void;
    }

    let { ready, commit, onforget }: Props = $props();

    const headingId = $props.id();

    let feedback = $state<{ kind: "success" | "error"; text: string } | null>( null );

    let restoreOpen = $state( false );
    let sendOpen = $state( false );
    let overwriteOpen = $state( false );
    let forgetOpen = $state( false );

    const conflicted = $derived( remote.failure === "conflict" );
    const syncState = $derived( sync.localState );
    const bucket = $derived( remote.config.kind === "s3" );

    /** True while no transfer has ever happened, which is what automatic publishing waits for. */
    const neverSynced = $derived( syncState === "unknown" );

    /**
     * True once a read or a write has answered without an `ETag`.
     *
     * Before any transfer nothing is known about versions, and claiming the
     * destination keeps none would alarm the reader over a bucket that does.
     */
    const versionless = $derived(
        !remote.conditional && ( remote.config.lastPulledAt !== null || remote.config.lastPushedAt !== null )
    );

    const pushedAt = $derived( remote.config.lastPushedAt );
    const pulledAt = $derived( remote.config.lastPulledAt );

    /**
     * Stores the reader's choice of automatic sending.
     *
     * @param event Change of the checkbox.
     * @author Claude
     */
    const toggleAutoPush = ( event: Event ): void =>
    {
        remote.save( { autoPush: ( event.currentTarget as HTMLInputElement ).checked } );
    };

    /**
     * Phrases the last failure for the destination that answered.
     *
     * @returns The sentence, or an empty one when nothing failed.
     * @author Claude
     */
    const failureText = (): string =>
        remote.failure ? REMOTE_FAILURE_MESSAGE[ remote.config.kind ][ remote.failure ]() : "";

    /**
     * Sends the current content to the destination.
     *
     * @param conditional Whether a concurrent change should be reported rather than overwritten.
     * @author Claude
     */
    const send = async ( conditional: boolean ): Promise<void> =>
    {
        commit();
        feedback = null;

        const stored = await sync.send( conditional );

        if ( stored )
        {
            feedback = { kind: "success", text: m.remote_backup_send_success() };
        }
        else
        {
            feedback = { kind: "error", text: failureText() };
        }
    };

    /**
     * Restores the remote snapshot into this browser.
     *
     * @author Claude
     */
    const restore = async (): Promise<void> =>
    {
        commit();
        feedback = null;

        const counts = await sync.restore();

        if ( !counts )
        {
            feedback = { kind: "error", text: failureText() };

            return;
        }

        const entries = pluralize( counts.entries, {
            one: m.common_count_fiche_one,
            other: m.common_count_fiche_other
        } );
        const categories = pluralize( counts.categories, {
            one: m.common_count_categorie_one,
            other: m.common_count_categorie_other
        } );
        const live = pluralize( counts.live, { one: m.common_count_entree_one, other: m.common_count_entree_other } );

        feedback = { kind: "success", text: m.remote_backup_restored_summary( { entries, categories, live } ) };
    };
</script>

<section class="border-paper-200 dark:border-ink-700 mt-8 border-t pt-6" aria-labelledby={headingId}>
    <h3 id={headingId} class="text-ink-900 dark:text-paper-100 text-base font-semibold">
        {m.remote_backup_sync_heading()}
    </h3>

    <p class="mt-2 flex max-w-help items-start gap-2 text-sm leading-relaxed">
        {#if syncState === "synced"}
            <CircleCheck class="text-ink-500 dark:text-paper-400 mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span class="text-ink-700 dark:text-paper-200">{m.remote_backup_sync_synced()}</span>
        {:else if syncState === "stale"}
            <CircleAlert class="text-signal-500 mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span class="text-signal-700">{m.remote_backup_sync_stale()}</span>
        {:else}
            <span class="text-ink-700 dark:text-paper-200">{m.remote_backup_sync_unknown()}</span>
        {/if}
    </p>

    <div class="mt-4 {ACTION_ROW}">
        <Button color="primary" disabled={remote.busy || !ready} onclick={() => ( sendOpen = true )}>
            {m.remote_backup_send_button()}
        </Button>

        <Button color="alternative" disabled={remote.busy || !ready} onclick={() => ( restoreOpen = true )}>
            {m.remote_backup_restore_button()}
        </Button>

        {#if conflicted}
            <Button color="red" disabled={remote.busy || !ready} onclick={() => ( overwriteOpen = true )}>
                {m.remote_backup_overwrite_button()}
            </Button>
        {/if}
    </div>

    <div role="status">
        {#if feedback}
            <Alert color={feedback.kind === "success" ? "primary" : "red"} class="mt-4 rounded-xl text-sm" role="none">
                {feedback.text}
            </Alert>
        {/if}
    </div>

    <p class="text-muted mt-3 max-w-help text-xs leading-relaxed">
        {m.remote_backup_directions_note()}
        {#if remote.conditional}
            {m.remote_backup_conditional_note()}
        {:else if versionless}
            {m.remote_backup_unconditional_note()}
        {/if}
    </p>

    <div class="border-paper-200 dark:border-ink-700 mt-6 border-t pt-5">
        <Checkbox
            classes={{ div: "flex items-start text-sm" }}
            class="mt-0.5 shrink-0"
            checked={remote.config.autoPush}
            disabled={neverSynced}
            aria-describedby="remote-auto-push-hint"
            onchange={toggleAutoPush}
        >
            <span class="block">
                {m.remote_backup_autopush_label()}

                <span id="remote-auto-push-hint" class="text-muted mt-1 block text-xs leading-relaxed">
                    {#if neverSynced}
                        {m.remote_backup_autopush_hint_never_synced()}
                    {:else}
                        {m.remote_backup_autopush_hint_synced()}
                    {/if}
                </span>
            </span>
        </Checkbox>
    </div>

    <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <dl class="text-muted flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <div class="flex gap-1.5">
                <dt>{m.remote_backup_last_push_label()}</dt>
                <dd class="text-ink-700 dark:text-paper-200">
                    {#if pushedAt}
                        <time datetime={pushedAt}>{formatDateTime( pushedAt )}</time>
                    {:else}
                        {m.remote_backup_never()}
                    {/if}
                </dd>
            </div>

            <div class="flex gap-1.5">
                <dt>{m.remote_backup_last_pull_label()}</dt>
                <dd class="text-ink-700 dark:text-paper-200">
                    {#if pulledAt}
                        <time datetime={pulledAt}>{formatDateTime( pulledAt )}</time>
                    {:else}
                        {m.remote_backup_never()}
                    {/if}
                </dd>
            </div>
        </dl>

        <button
            type="button"
            class="text-alert-500 focus-visible:outline-accent-500 min-h-11 w-fit text-sm font-medium underline-offset-4
                   hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-0"
            onclick={() => ( forgetOpen = true )}
        >
            {bucket ? m.remote_backup_s3_forget_button() : m.remote_backup_forget_button()}
        </button>
    </div>
</section>

<ConfirmDialog
    bind:open={sendOpen}
    title={m.remote_backup_send_confirm_title()}
    message={wiki.hasStoredContent
        ? m.remote_backup_send_confirm_message()
        : m.remote_backup_send_confirm_message_empty()}
    confirmLabel={m.remote_backup_send_confirm_label()}
    danger={!wiki.hasStoredContent}
    onconfirm={() => void send( true )}
/>

<ConfirmDialog
    bind:open={overwriteOpen}
    title={m.remote_backup_overwrite_confirm_title()}
    message={m.remote_backup_overwrite_confirm_message()}
    confirmLabel={m.remote_backup_overwrite_confirm_label()}
    danger
    onconfirm={() => void send( false )}
/>

<ConfirmDialog
    bind:open={restoreOpen}
    title={m.remote_backup_restore_confirm_title()}
    message={m.remote_backup_restore_confirm_message()}
    confirmLabel={m.remote_backup_restore_confirm_label()}
    onconfirm={() => void restore()}
>
    {#if restoreOpen && wiki.hasStoredContent}
        <DownloadFirst />
    {/if}
</ConfirmDialog>

<ConfirmDialog
    bind:open={forgetOpen}
    title={bucket ? m.remote_backup_s3_forget_confirm_title() : m.remote_backup_forget_confirm_title()}
    message={bucket ? m.remote_backup_s3_forget_confirm_message() : m.remote_backup_forget_confirm_message()}
    confirmLabel={m.remote_backup_forget_confirm_label()}
    onconfirm={() =>
    {
        const forgotten = bucket ? m.remote_backup_s3_forgotten() : m.remote_backup_forgotten();

        remote.forget();
        onforget( forgotten );
    }}
/>
