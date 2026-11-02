<script lang="ts">
    /**
     * Backup and restore against the optional remote snapshot service.
     *
     * Sending and restoring go through `SyncStore`, the one module that wires
     * `WikiStore` to the service. Neither store knows about the other, which is
     * what keeps the overlay independent from the network. This panel only adds
     * the form, the confirmations and the sentences reporting each outcome.
     *
     * Everything here is optional. With no endpoint configured, the panel explains
     * that the wiki works from this browser alone and fires no request at all.
     * The contract is described in `README.md`.
     *
     * The destination row above the form announces S3 compatible storage, the
     * second kind of destination planned, without implementing it: its tile is
     * disabled and the snapshot server stays the one choice, so nothing reads
     * the row yet and no state stands behind it.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import Alert from "flowbite-svelte/Alert.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Radio from "flowbite-svelte/Radio.svelte";
    import { sync } from "#lib/state/sync.svelte.ts";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import { remote } from "#lib/state/remote.svelte.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import { formatDateTime } from "#lib/utilities/date.ts";
    import { isUsableBaseUrl } from "#lib/utilities/remote.ts";
    import { REMOTE_FAILURE_MESSAGE } from "#lib/config/remote.ts";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import { ACTION_BUTTON, ACTION_ROW, RADIO_OVERLAY } from "#lib/config/forms.ts";

    /** Shape shared by the two destination tiles, the radio stretched over each. */
    const DESTINATION_TILE = `relative flex flex-col items-start gap-0.5 rounded-xl border p-3 text-sm transition
                              has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
                              has-[:focus-visible]:outline-accent-500`;

    let baseUrl = $state( "" );
    let secret = $state( "" );
    let feedback = $state<{ kind: "success" | "error"; text: string } | null>( null );
    let seeded = $state( false );

    let restoreOpen = $state( false );
    let sendOpen = $state( false );
    let overwriteOpen = $state( false );
    let forgetOpen = $state( false );

    // The connection is read from `localStorage`, so it only exists once mounted:
    // the data page is prerendered, and neither the endpoint nor the secret may
    // ever reach its static HTML. Seeding the form is therefore an effect rather
    // than a derived value, and the guard makes it happen exactly once.
    $effect( () =>
    {
        remote.loadConfig();

        if ( remote.loaded && !seeded )
        {
            baseUrl = remote.config.baseUrl;
            secret = remote.config.secret;
            seeded = true;
        }
    } );

    const canConnect = $derived( isUsableBaseUrl( baseUrl ) );
    const dirty = $derived( baseUrl.trim() !== remote.config.baseUrl || secret !== remote.config.secret );
    const failureText = $derived( remote.failure ? REMOTE_FAILURE_MESSAGE[ remote.failure ]() : "" );
    const conflicted = $derived( remote.failure === "conflict" );
    const syncState = $derived( sync.localState );

    /** True while no transfer has ever happened, which is what automatic publishing waits for. */
    const neverSynced = $derived( syncState === "unknown" );

    /**
     * Persists what is on screen before acting.
     *
     * The buttons always operate on the values the reader can see, so a url typed
     * and used straight away behaves as expected without a separate save step.
     *
     * @author Claude
     */
    const commit = (): void =>
    {
        if ( dirty )
        {
            remote.save( { baseUrl, secret } );
        }
    };

    /**
     * Reads the remote snapshot and reports what it holds, without touching the wiki.
     *
     * @author Claude
     */
    const test = async (): Promise<void> =>
    {
        commit();
        feedback = null;

        const snapshot = await remote.pull();

        if ( snapshot )
        {
            const count = pluralize(
                snapshot.dataset.entries.length,
                { one: m.common_count_fiche_one, other: m.common_count_fiche_other }
            );

            feedback = {
                kind: "success",
                text: m.remote_backup_test_success( { count } )
            };

            return;
        }

        // A service holding nothing yet answers 404. That proves it is reachable and
        // that the secret was accepted, so for a connection test it is a success.
        feedback
            = remote.failure === "missing"
                ? { kind: "success", text: m.remote_backup_test_empty() }
                : { kind: "error", text: failureText };
    };

    /**
     * Sends the current content to the service.
     *
     * @param conditional Whether a concurrent change should be reported rather than overwritten.
     * @author Claude
     */
    const send = async ( conditional: boolean ): Promise<void> =>
    {
        commit();
        feedback = null;

        const stored = await sync.send( conditional );

        feedback = stored
            ? { kind: "success", text: m.remote_backup_send_success() }
            : { kind: "error", text: failureText };
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
            feedback = { kind: "error", text: failureText };

            return;
        }

        const entries = pluralize( counts.entries, { one: m.common_count_fiche_one, other: m.common_count_fiche_other } );
        const categories = pluralize(
            counts.categories,
            { one: m.common_count_categorie_one, other: m.common_count_categorie_other }
        );
        const live = pluralize( counts.live, { one: m.common_count_entree_one, other: m.common_count_entree_other } );

        feedback = {
            kind: "success",
            text: m.remote_backup_restored_summary( { entries, categories, live } )
        };
    };
</script>

<section class="surface mt-6 p-6" aria-labelledby="remote-backup-heading">
    <h2 id="remote-backup-heading" class="section-heading">{m.remote_backup_heading()}</h2>

    <p class="text-muted mt-1.5 text-sm">{m.remote_backup_intro()}</p>

    <details class="mt-2 text-sm">
        <summary class="text-accent-700 dark:text-accent-300 w-fit cursor-pointer py-1 font-medium">
            {m.common_learn_more()}
        </summary>

        <p class="text-ink-600 dark:text-paper-300 mt-1 leading-relaxed">{m.remote_backup_more()}</p>
    </details>

    {#if feedback}
        <Alert color={feedback.kind === "success" ? "primary" : "red"} class="mt-5 rounded-xl text-sm" role="status">
            {feedback.text}
        </Alert>
    {/if}

    {#if remote.storageError}
        <Alert color="red" class="mt-5 rounded-xl text-sm" role="alert">
            {remote.storageError} {m.remote_backup_storage_error_suffix()}
        </Alert>
    {/if}

    <form
        class="mt-5 space-y-4"
        onsubmit={( event ) =>
        {
            event.preventDefault();
            void test();
        }}
    >
        <fieldset>
            <legend class="field-label">{m.remote_backup_destination_legend()}</legend>

            <div class="grid gap-2 sm:grid-cols-2">
                <Radio
                    name="remote-destination"
                    value="server"
                    group="server"
                    class={RADIO_OVERLAY}
                    classes={{
                        label: `${ DESTINATION_TILE } border-ink-800 dark:border-paper-200 cursor-pointer`
                    }}
                >
                    <span class="text-ink-900 dark:text-paper-100 font-medium">
                        {m.remote_backup_destination_server()}
                    </span>

                    <span class="text-muted text-xs leading-relaxed">{m.remote_backup_destination_server_hint()}</span>
                </Radio>

                <Radio
                    name="remote-destination"
                    value="s3"
                    group="server"
                    disabled
                    class="{RADIO_OVERLAY} cursor-not-allowed"
                    classes={{
                        label: `${ DESTINATION_TILE } border-paper-300 dark:border-ink-600 border-dashed`
                    }}
                >
                    <span class="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <span class="text-ink-600 dark:text-paper-300 font-medium">
                            {m.remote_backup_destination_s3()}
                        </span>

                        <span
                            class="bg-paper-100 text-ink-600 dark:bg-ink-800 dark:text-paper-300 rounded-full px-2 py-0.5
                                   text-xs font-medium"
                        >
                            {m.remote_backup_destination_soon()}
                        </span>
                    </span>

                    <span class="text-muted text-xs leading-relaxed">{m.remote_backup_destination_s3_hint()}</span>
                </Radio>
            </div>
        </fieldset>

        <div>
            <Label for="remote-base-url" class="field-label">{m.remote_backup_url_label()}</Label>

            <Input
                id="remote-base-url"
                bind:value={baseUrl}
                type="url"
                class="font-mono text-xs"
                aria-describedby="remote-base-url-hint"
                placeholder={m.remote_backup_url_placeholder()}
                autocomplete="off"
            />

            <Helper id="remote-base-url-hint" class="mt-1.5 text-xs leading-relaxed">
                {m.remote_backup_url_hint()}
            </Helper>
        </div>

        <div>
            <Label for="remote-secret" class="field-label">{m.remote_backup_secret_label()}</Label>

            <Input
                id="remote-secret"
                bind:value={secret}
                type="password"
                class="font-mono text-xs"
                aria-describedby="remote-secret-hint"
                placeholder={m.remote_backup_secret_placeholder()}
                autocomplete="off"
            />

            <Helper id="remote-secret-hint" class="mt-1.5 text-xs leading-relaxed">
                {m.remote_backup_secret_hint()}
            </Helper>
        </div>

        <div class={ACTION_ROW}>
            <Button type="submit" color="primary" disabled={!canConnect || remote.busy} loading={remote.busy}>
                {remote.busy ? m.remote_backup_connecting() : m.remote_backup_test_button()}
            </Button>

            {#if dirty && canConnect}
                <span class="text-signal-700 text-xs">{m.remote_backup_unsaved_url()}</span>
            {/if}
        </div>
    </form>

    {#if remote.configured}
        <div class="border-paper-200 dark:border-ink-800 mt-6 border-t pt-6">
            {#if syncState === "synced"}
                <Alert color="primary" class="rounded-xl text-sm">
                    {m.remote_backup_sync_synced()}
                </Alert>
            {:else if syncState === "stale"}
                <Alert color="yellow" class="rounded-xl text-sm">
                    {m.remote_backup_sync_stale()}
                </Alert>
            {:else}
                <p class="text-muted text-sm">{m.remote_backup_sync_unknown()}</p>
            {/if}

            <div class="mt-5 {ACTION_ROW}">
                <Button color="primary" disabled={remote.busy} onclick={() => ( sendOpen = true )}>
                    {m.remote_backup_send_button()}
                </Button>

                <Button color="alternative" disabled={remote.busy} onclick={() => ( restoreOpen = true )}>
                    {m.remote_backup_restore_button()}
                </Button>

                {#if conflicted}
                    <Button color="red" disabled={remote.busy} onclick={() => ( overwriteOpen = true )}>
                        {m.remote_backup_overwrite_button()}
                    </Button>
                {/if}
            </div>

            <p class="text-muted mt-4 text-sm leading-relaxed">
                {m.remote_backup_directions_note()}
                {remote.conditional ? m.remote_backup_conditional_note() : m.remote_backup_unconditional_note()}
            </p>

            <div class="border-paper-200 dark:border-ink-800 mt-6 border-t pt-6">
                <Checkbox
                    classes={{ div: "flex items-start text-sm" }}
                    class="mt-0.5 shrink-0"
                    checked={remote.config.autoPush}
                    disabled={neverSynced}
                    aria-describedby="remote-auto-push-hint"
                    onchange={( event: Event ) =>
                        remote.save( { autoPush: ( event.currentTarget as HTMLInputElement ).checked } )}
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

            <dl class="text-muted mt-6 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-[auto_1fr]">
                <dt class="text-ink-700 dark:text-paper-200 font-medium">{m.remote_backup_last_push_label()}</dt>
                <dd>
                    {#if remote.config.lastPushedAt}
                        <time datetime={remote.config.lastPushedAt}>{formatDateTime( remote.config.lastPushedAt )}</time>
                    {:else}
                        {m.remote_backup_never()}
                    {/if}
                </dd>

                <dt class="text-ink-700 dark:text-paper-200 font-medium">{m.remote_backup_last_pull_label()}</dt>
                <dd>
                    {#if remote.config.lastPulledAt}
                        <time datetime={remote.config.lastPulledAt}>{formatDateTime( remote.config.lastPulledAt )}</time>
                    {:else}
                        {m.remote_backup_never()}
                    {/if}
                </dd>
            </dl>

            <Button
                color="red"
                outline
                class="mt-5 {ACTION_BUTTON}"
                onclick={() => ( forgetOpen = true )}
            >
                {m.remote_backup_forget_button()}
            </Button>
        </div>
    {/if}
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
    confirmLabel={m.common_restore()}
    onconfirm={() => void restore()}
/>

<ConfirmDialog
    bind:open={forgetOpen}
    title={m.remote_backup_forget_confirm_title()}
    message={m.remote_backup_forget_confirm_message()}
    confirmLabel={m.remote_backup_forget_confirm_label()}
    onconfirm={() =>
    {
        remote.forget();
        baseUrl = "";
        secret = "";
        feedback = { kind: "success", text: m.remote_backup_forgotten() };
    }}
/>
