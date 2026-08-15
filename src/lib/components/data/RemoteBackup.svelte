<script lang="ts">
    /**
     * Backup and restore against the optional remote snapshot service.
     *
     * This component owns the wiring between the two stores: it hands
     * `WikiStore.exportJson()` to the service, and hands what the service returns
     * back to `WikiStore.importDataset()`. Neither store knows about the other,
     * which is what keeps the overlay independent from the network. Telling an up
     * to date backup from a stale one is part of that wiring: the marker compared
     * here means something to the wiki and nothing to the service.
     *
     * Everything here is optional. With no endpoint configured, the panel explains
     * that the wiki works from this browser alone and fires no request at all.
     * The contract is described in `README.md`.
     *
     * @author Claude
     */
    import Alert from "flowbite-svelte/Alert.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { ACTION_BUTTON, ACTION_ROW } from "$lib/config/forms";
    import * as m from "$lib/locales/messages.js";
    import { remote } from "$lib/state/remote.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { RemoteFailure } from "$lib/types";
    import { formatDateTime } from "$lib/utilities/date";
    import { pluralize } from "$lib/utilities/plural";
    import { isUsableBaseUrl } from "$lib/utilities/remote";

    /**
     * What the reader is told for each documented failure.
     *
     * The transport only reports a machine readable cause, so the sentences live
     * here, in the component that displays them, as the project has no message
     * catalogue for its single language.
     *
     * Each one says what happened and what to try, and none of them names a
     * protocol. Whoever set this server up can read the cause off the sentence,
     * and whoever did not is not helped by the word CORS.
     */
    const FAILURE_MESSAGE: Readonly<Record<RemoteFailure, string>> = {
        network: m.remote_backup_failure_network(),
        refused: m.remote_backup_failure_refused(),
        missing: m.remote_backup_failure_missing(),
        unsupported: m.remote_backup_failure_unsupported(),
        conflict: m.remote_backup_failure_conflict(),
        unreadable: m.remote_backup_failure_unreadable(),
        server: m.remote_backup_failure_server()
    };

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
    const failureText = $derived( remote.failure ? FAILURE_MESSAGE[ remote.failure ] : "" );
    const conflicted = $derived( remote.failure === "conflict" );

    /**
     * Where the online backup stands against the content of this browser.
     *
     * Compared by marker rather than by date: a wall clock comparison would call a
     * restore stale, since installing the snapshot is itself a local write, and it
     * happens after the read that brought it in.
     */
    const syncState = $derived.by( (): "unknown" | "synced" | "stale" =>
    {
        if ( remote.config.syncedChange === null )
        {
            return "unknown";
        }

        return remote.config.syncedChange === wiki.changedAt ? "synced" : "stale";
    } );

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

        // Read before the request, not after: what leaves this browser is the content
        // as it stands now, and an edit made while the request flies is not in it.
        const sent = wiki.changedAt;
        const stored = await remote.push( wiki.exportJson(), conditional );

        if ( stored )
        {
            remote.markSynced( sent );
        }

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

        const snapshot = await remote.pull();

        if ( !snapshot )
        {
            feedback = { kind: "error", text: failureText };

            return;
        }

        const counts = wiki.importDataset( snapshot.dataset );

        // Marked after the import, since installing the snapshot is itself a write:
        // the marker to remember is the one that write just produced.
        remote.markSynced( wiki.changedAt );

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

<section class="surface mt-6 p-6">
    <h2 class="font-serif text-xl font-semibold tracking-tight">{m.remote_backup_heading()}</h2>

    <p class="text-muted mt-2 text-sm leading-relaxed">
        {m.remote_backup_intro()}
    </p>

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
                <span class="text-signal-500 text-xs">{m.remote_backup_unsaved_url()}</span>
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
                <dt class="tracking-wide uppercase">{m.remote_backup_last_push_label()}</dt>
                <dd>
                    {#if remote.config.lastPushedAt}
                        <time datetime={remote.config.lastPushedAt}>{formatDateTime( remote.config.lastPushedAt )}</time>
                    {:else}
                        {m.remote_backup_never()}
                    {/if}
                </dd>

                <dt class="tracking-wide uppercase">{m.remote_backup_last_pull_label()}</dt>
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
