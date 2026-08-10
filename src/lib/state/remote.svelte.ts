/**
 * State of the optional remote snapshot service.
 *
 * The service is a backup target, never a source of content. `WikiStore` remains
 * the only thing the site reads from, so this store deliberately knows nothing
 * about it: it moves opaque JSON in and out, and the component that owns the
 * panel wires it to `exportJson` and `importJson`. Coupling two state modules to
 * each other would be the easy way to make the overlay depend on the network.
 *
 * Nothing here runs on its own. No request is ever fired by a page loading, and
 * the `pericles:remote` key does not exist until the reader configures an
 * endpoint. Working from `localStorage` alone stays a first class mode.
 *
 * @author Claude
 */

import { browser } from "$app/environment";
import type { RemoteConfig, RemoteFailure, RemoteSnapshot, RemoteStatus } from "$lib/types";
import { emptyRemoteConfig,
    isUsableBaseUrl,
    normalizeRemoteConfig,
    readRemoteSnapshot,
    RemoteError,
    writeRemoteSnapshot } from "$lib/utilities/remote";

/** `localStorage` key holding the connection to the service. */
const REMOTE_KEY = "pericles:remote";

class RemoteStore
{
    /** Connection to the service, unconfigured until the reader fills the form. */
    config = $state<RemoteConfig>( emptyRemoteConfig() );

    /** True once the connection has been read from `localStorage`. */
    loaded = $state( false );

    /** Where the last operation stands. */
    status = $state<RemoteStatus>( "idle" );

    /** Cause of the last failure, kept for the component to phrase in French. */
    failure = $state<RemoteFailure | null>( null );

    /** Set when the browser refused to store the connection, and shown by the panel. */
    storageError = $state<string | null>( null );

    /** True when an endpoint is configured. False means the site runs on the overlay alone. */
    configured = $derived( isUsableBaseUrl( this.config.baseUrl ) );

    /** True while a request is in flight, so the panel can disable its buttons. */
    busy = $derived( this.status === "loading" );

    /** True when the service reported a revision, so writes can be conditional. */
    conditional = $derived( this.config.revision !== null );

    /**
     * Reads the connection from `localStorage`.
     *
     * Called from an effect once the panel is mounted, never during rendering,
     * so the prerendered HTML of the data page never carries an endpoint or a
     * secret.
     *
     * @author Claude
     */
    loadConfig(): void
    {
        if ( !browser || this.loaded )
        {
            return;
        }

        try
        {
            const stored = localStorage.getItem( REMOTE_KEY );
            if ( stored )
            {
                this.config = normalizeRemoteConfig( JSON.parse( stored ) );
            }
        }
        catch ( error )
        {
            this.storageError = `Configuration du serveur illisible : ${ String( error ) }`;
        }
        finally
        {
            this.loaded = true;
        }
    }

    /**
     * Writes the connection back to `localStorage`.
     *
     * @author Claude
     */
    private persist(): void
    {
        if ( !browser )
        {
            return;
        }

        try
        {
            localStorage.setItem( REMOTE_KEY, JSON.stringify( this.config ) );
        }
        catch ( error )
        {
            this.storageError = `Impossible d'enregistrer la configuration du serveur : ${ String( error ) }`;
        }
    }

    /**
     * Updates the connection.
     *
     * Changing the endpoint clears the known revision: a revision identifies a
     * snapshot on one service, and replaying it against another would either be
     * refused or, worse, match something unrelated. The synchronisation marker
     * goes with it, for the same reason: another service holds another snapshot,
     * so nothing is known to match it yet.
     *
     * @param patch Fields to change.
     * @author Claude
     */
    save( patch: Partial<RemoteConfig> ): void
    {
        const movedEndpoint = patch.baseUrl !== undefined && patch.baseUrl.trim() !== this.config.baseUrl;

        this.config = {
            ...this.config,
            ...patch,
            baseUrl: patch.baseUrl === undefined ? this.config.baseUrl : patch.baseUrl.trim(),
            ...( movedEndpoint ? { revision: null, syncedChange: null } : {} )
        };

        this.status = "idle";
        this.failure = null;
        this.persist();
    }

    /**
     * Records that the local content is known to match the remote snapshot.
     *
     * The marker is opaque here on purpose: this store never reads the wiki, so
     * the panel is the one that knows the value identifies a state of the overlay.
     * Called after a successful send, and after a restore has been installed, the
     * two moments where both sides genuinely hold the same thing.
     *
     * @param marker Value identifying the local content, or null to forget the synchronisation.
     * @author Claude
     */
    markSynced( marker: string | null ): void
    {
        this.config = { ...this.config, syncedChange: marker };
        this.persist();
    }

    /**
     * Forgets the service entirely, going back to working from the overlay alone.
     *
     * @author Claude
     */
    forget(): void
    {
        this.config = emptyRemoteConfig();
        this.status = "idle";
        this.failure = null;

        if ( !browser )
        {
            return;
        }

        try
        {
            localStorage.removeItem( REMOTE_KEY );
            this.storageError = null;
        }
        catch ( error )
        {
            this.storageError = String( error );
        }
    }

    /**
     * Records a failure and returns nothing, so callers can `return this.#fail( error )`.
     *
     * An unexpected exception is reported as a server failure rather than
     * swallowed: the reader has to know the operation did not happen.
     *
     * @param error Whatever was thrown.
     * @author Claude
     */
    #fail( error: unknown ): void
    {
        this.status = "error";
        this.failure = error instanceof RemoteError ? error.kind : "server";
    }

    /**
     * Reads the snapshot stored by the service.
     *
     * Nothing is written to the wiki here. The caller decides what to do with the
     * snapshot, which is what keeps the import modes and their confirmation in
     * the component.
     *
     * @returns The snapshot, or null when the request failed, in which case `failure` says why.
     * @author Claude
     */
    async pull(): Promise<RemoteSnapshot | null>
    {
        this.status = "loading";
        this.failure = null;

        try
        {
            const snapshot = await readRemoteSnapshot( this.config );

            this.config = {
                ...this.config,
                revision: snapshot.revision ?? this.config.revision,
                lastPulledAt: new Date().toISOString()
            };
            this.status = "success";
            this.persist();

            return snapshot;
        }
        catch ( error )
        {
            this.#fail( error );

            return null;
        }
    }

    /**
     * Replaces the snapshot stored by the service.
     *
     * @param json Serialised dataset, as returned by `WikiStore.exportJson`.
     * @param conditional Whether a concurrent change should be reported as a conflict instead of
     *        being overwritten. Pass false only after the reader chose to overwrite.
     * @returns True when the snapshot was stored.
     * @author Claude
     */
    async push( json: string, conditional = true ): Promise<boolean>
    {
        this.status = "loading";
        this.failure = null;

        try
        {
            const revision = await writeRemoteSnapshot( this.config, json, conditional );

            this.config = {
                ...this.config,
                revision,
                lastPushedAt: new Date().toISOString()
            };
            this.status = "success";
            this.persist();

            return true;
        }
        catch ( error )
        {
            this.#fail( error );

            return false;
        }
    }
}

export const remote = new RemoteStore();
