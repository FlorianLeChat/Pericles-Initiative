<script lang="ts">
    /**
     * Backup and restore against an optional destination: a server of the reader's, or an S3 compatible bucket.
     *
     * The panel holds the fields as a draft, and stores them only when the reader
     * tests or transfers, so a destination typed and used straight away needs no
     * separate save step. The fields of each destination sit beside what that
     * destination has to accept, built from those very fields: the contract
     * stops being a paragraph of the README and becomes the urls and documents
     * the reader actually needs. Transfers live in `RemoteSync`, and go through
     * `SyncStore`, the one module that wires `WikiStore` to the service.
     *
     * Everything here is optional. With no destination configured, nothing fires
     * a request until the reader tests one. Which destination is on screen is
     * chosen by the tiles of `BackupPanel`, alongside the file.
     *
     * @author Claude
     */
    import RemoteSync from "./RemoteSync.svelte";
    import S3Settings from "./S3Settings.svelte";
    import * as m from "#lib/locales/messages.js";
    import ApiSettings from "./ApiSettings.svelte";
    import Alert from "flowbite-svelte/Alert.svelte";
    import { ACTION_ROW } from "#lib/config/forms.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { remote } from "#lib/state/remote.svelte.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { REMOTE_FAILURE_MESSAGE } from "#lib/config/remote.ts";
    import type { RemoteConfig, RemoteKind, S3Config } from "#lib/types.ts";
    import { emptyS3Config, isUsableRemoteConfig, normalizeRemoteConfig } from "#lib/utilities/remote.ts";

    interface Props {
        /** The online destination whose fields are on screen. */
        kind: RemoteKind;
    }

    let { kind }: Props = $props();

    let baseUrl = $state( "" );
    let secret = $state( "" );
    let s3 = $state<S3Config>( emptyS3Config() );
    let origin = $state( "" );
    let report = $state<{ kind: "success" | "error"; text: string; destination: RemoteKind } | null>( null );
    let seeded = $state( false );

    const feedback = $derived( report?.destination === kind ? report : null );

    // The connection is read from `localStorage`, so it only exists once mounted:
    // the data page is prerendered, and no endpoint or key may ever reach its
    // static HTML. Seeding the form is therefore an effect rather than a derived
    // value, and the guard makes it happen exactly once. The origin waits for the
    // same moment, since the prerendering host is not the one the site is served from.
    $effect( () =>
    {
        remote.loadConfig();

        if ( remote.loaded && !seeded )
        {
            baseUrl = remote.config.baseUrl;
            secret = remote.config.secret;
            s3 = { ...remote.config.s3 };
            origin = window.location.origin;
            seeded = true;
        }
    } );

    /** The fields on screen, as they would be stored. */
    const draft = $derived( normalizeRemoteConfig( { ...remote.config, kind, baseUrl, secret, s3 } ) );

    /**
     * Reduces a connection to where it leads and with which key, leaving out the history of its transfers.
     *
     * @param config Connection as stored or as typed.
     * @returns A string equal for two connections reaching the same place the same way.
     * @author Claude
     */
    const connectionOf = ( config: RemoteConfig ): string =>
        JSON.stringify( [ config.kind, config.baseUrl, config.secret, config.s3 ] );

    const canConnect = $derived( isUsableRemoteConfig( draft ) );

    const showingStored = $derived( kind === remote.config.kind );
    const dirty = $derived( connectionOf( draft ) !== connectionOf( remote.config ) );

    /**
     * Persists what is on screen before acting, and clears the last report.
     *
     * The buttons always operate on the values the reader can see, so a
     * destination typed and used straight away behaves as expected.
     *
     * @author Claude
     */
    const commit = (): void =>
    {
        report = null;

        if ( dirty )
        {
            remote.save( { kind, baseUrl, secret, s3: { ...s3 } } );
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

        const snapshot = await remote.pull();

        if ( snapshot )
        {
            const count = pluralize( snapshot.dataset.entries.length, {
                one: m.common_count_fiche_one,
                other: m.common_count_fiche_other
            } );

            report = { kind: "success", text: m.remote_backup_test_success( { count } ), destination: kind };

            return;
        }

        // A destination holding nothing yet answers 404. That proves it is reachable
        // and that the secret or the key was accepted, so for a test it is a success.
        if ( remote.failure === "missing" )
        {
            const text = remote.config.kind === "s3" ? m.remote_backup_s3_test_empty() : m.remote_backup_test_empty();

            report = { kind: "success", text, destination: kind };
        }
        else if ( remote.failure )
        {
            report = {
                kind: "error",
                text: REMOTE_FAILURE_MESSAGE[ remote.config.kind ][ remote.failure ](),
                destination: kind
            };
        }
    };

    /**
     * Empties the fields once the connection has been forgotten, and says so where the fields are.
     *
     * @param text Sentence confirming what was forgotten.
     * @author Claude
     */
    const clear = ( text: string ): void =>
    {
        report = { kind: "success", text, destination: kind };
        baseUrl = "";
        secret = "";
        s3 = emptyS3Config();
    };
</script>

<div>
    <p class="text-muted max-w-help text-sm">{m.remote_backup_intro()}</p>

    <details class="mt-2 text-sm">
        <summary class="text-accent-700 dark:text-accent-300 w-fit cursor-pointer py-2.5 font-medium sm:py-1">
            {m.common_learn_more()}
        </summary>

        <p class="text-ink-600 dark:text-paper-300 mt-1 max-w-help leading-relaxed">{m.remote_backup_more()}</p>
    </details>

    {#if remote.storageError}
        <Alert color="red" class="mt-5 rounded-xl text-sm" role="alert">
            {remote.storageError}
            {m.remote_backup_storage_error_suffix()}
        </Alert>
    {/if}

    <form
        class="mt-5 space-y-6"
        onsubmit={( event ) =>
        {
            event.preventDefault();
            void test();
        }}
    >
        {#snippet actions()}
            <div class="pt-2">
                <div class={ACTION_ROW}>
                    <Button type="submit" color="primary" disabled={!canConnect || remote.busy} loading={remote.busy}>
                        {remote.busy ? m.remote_backup_connecting() : m.remote_backup_test_button()}
                    </Button>

                    {#if dirty && canConnect}
                        <span class="text-signal-700 text-xs">{m.remote_backup_unsaved()}</span>
                    {/if}
                </div>

                <!-- Mounted empty, so the outcome is announced when it arrives rather than missed. -->
                <div role="status">
                    {#if feedback}
                        <Alert
                            color={feedback.kind === "success" ? "primary" : "red"}
                            class="mt-4 rounded-xl text-sm"
                            role="none"
                        >
                            {feedback.text}
                        </Alert>
                    {/if}
                </div>
            </div>
        {/snippet}

        {#if kind === "s3"}
            <S3Settings bind:config={s3} {origin} {actions} />
        {:else}
            <ApiSettings bind:baseUrl bind:secret {origin} {actions} />
        {/if}
    </form>

    {#if remote.configured && showingStored}
        <RemoteSync
            ready={canConnect}
            {commit}
            onforget={clear}
        />
    {/if}
</div>
