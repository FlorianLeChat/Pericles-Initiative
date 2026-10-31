/**
 * Synchronisation between the wiki of this browser and the optional backup service.
 *
 * `WikiStore` and `RemoteStore` deliberately know nothing of each other: the
 * overlay must never depend on the network, and the service moves bytes it does
 * not understand. This module is the one place that knows both, and the data
 * page, the network indicator and the reminders of the layout all go through it
 * rather than wiring the two stores by hand, each in its own way.
 *
 * Two markers describe a synchronisation, one per side, kept in the remote
 * connection: `syncedChange` is the `changedAt` of the overlay at that moment,
 * `syncedRemote` the marker of the snapshot. Comparing the overlay against the
 * first tells whether this browser moved since, comparing a fresh read of the
 * service against the second tells whether someone else did.
 *
 * @author Claude
 */

import { remote } from "$lib/state/remote.svelte";
import { wiki } from "$lib/state/wiki.svelte";
import type { RemoteSnapshot } from "$lib/types";

/** Where the backup stands against the content of this browser, as far as this browser knows. */
type LocalSyncState = "unknown" | "synced" | "stale";

/**
 * What a read of the service found, when it is worth telling the reader.
 *
 * `newer` means the snapshot is more recent and this browser has nothing the
 * snapshot lacks, `older` that this browser is the more recent of the two,
 * `diverged` that both moved since they last matched.
 */
export type RemoteVerdict = "newer" | "older" | "diverged";

/**
 * How long a read of the service stays fresh, in milliseconds.
 *
 * Every read moves the whole dataset, so checking on each page change would
 * download it at every click. Once a minute keeps a change made elsewhere from
 * going unnoticed for long, at a cost nobody feels.
 */
const RECHECK_INTERVAL = 60_000;

/**
 * Identifies a snapshot, for comparison with the one last synchronised.
 *
 * The stamp written by the sending browser comes first. The `ETag` covers a
 * snapshot sent before that stamp existed, and still changes on every write.
 *
 * @param snapshot Snapshot read from the service.
 * @returns Its marker, or null when nothing identifies it.
 */
const markerOf = ( snapshot: RemoteSnapshot ): string | null => snapshot.changedAt ?? snapshot.revision;

/**
 * Reads a timestamp, tolerating whatever a server or an old export wrote.
 *
 * @param value ISO timestamp, or anything else.
 * @returns Milliseconds since the epoch, or null when the value is not a date.
 */
const timeOf = ( value: string | null ): number | null =>
{
    const time = value === null ? Number.NaN : Date.parse( value );

    return Number.isNaN( time ) ? null : time;
};

class SyncStore
{
    /** What the last read of the service found, null when there is nothing to report. */
    verdict = $state<RemoteVerdict | null>( null );

    /** When the content of the snapshot behind `verdict` last changed. */
    remoteChangedAt = $state<string | null>( null );

    /**
     * True once the reader waved the verdict away.
     *
     * Only cleared by a synchronisation, and never by a page change: the reader
     * was told once, and is told again only once the backup has been up to date
     * and stopped being so.
     */
    dismissed = $state( false );

    /** True once the arrival on the site has been handled, configured service or not. */
    #arrived = false;

    /** When the service was last read, in milliseconds, so page changes do not hammer it. */
    #checkedAt = 0;

    /** True while a read is in flight, so two checks never race each other. */
    #checking = false;

    /**
     * Where the backup stands against the content of this browser.
     *
     * Compared by marker rather than by date: a wall clock comparison would call a
     * restore stale, since installing the snapshot is itself a local write, and it
     * happens after the read that brought it in.
     */
    localState = $derived.by( (): LocalSyncState =>
    {
        if ( remote.config.syncedChange === null )
        {
            return "unknown";
        }

        return remote.config.syncedChange === wiki.changedAt ? "synced" : "stale";
    } );

    /** True when the reader should currently see what the last read found. */
    prompting = $derived( this.verdict !== null && !this.dismissed );

    /**
     * Forgets any verdict, after both sides were made to match.
     *
     * Clearing `dismissed` here is what lets a later divergence be reported again.
     *
     * @author Claude
     */
    #settle(): void
    {
        this.verdict = null;
        this.remoteChangedAt = null;
        this.dismissed = false;
    }

    /**
     * Sends the whole content of this browser to the service.
     *
     * @param conditional Whether a concurrent change should be reported as a conflict instead of
     *        being overwritten. Pass false only after the reader chose to overwrite.
     * @returns True when the snapshot was stored, otherwise `remote.failure` says why.
     * @author Claude
     */
    async send( conditional = true ): Promise<boolean>
    {
        // Read before the request, not after: what leaves this browser is the content
        // as it stands now, and an edit made while the request flies is not in it.
        // The stamp sent is the snapshot's marker from now on, as the export carries it.
        const sent = wiki.changedAt;
        const stored = await remote.push( wiki.exportJson(), conditional );

        if ( stored )
        {
            remote.markSynced( sent, sent );
            this.#settle();
        }

        return stored;
    }

    /**
     * Replaces the whole content of this browser with the snapshot of the service.
     *
     * @returns Counts of restored items, or null when the read failed, in which case
     *          `remote.failure` says why.
     * @author Claude
     */
    async restore(): Promise<{ entries: number; categories: number; live: number } | null>
    {
        const snapshot = await remote.pull();

        if ( !snapshot )
        {
            return null;
        }

        const counts = wiki.importDataset( snapshot.dataset );

        // Marked after the import, since installing the snapshot is itself a write:
        // the local marker to remember is the one that write just produced.
        remote.markSynced( wiki.changedAt, markerOf( snapshot ) );
        this.#settle();

        return counts;
    }

    /**
     * Hides the current verdict until the backup has been up to date again.
     *
     * @author Claude
     */
    dismiss(): void
    {
        this.dismissed = true;
    }

    /**
     * Reads the service and works out whether the reader should hear about it.
     *
     * A failed read says nothing: being offline or misconfigured is reported by
     * the network indicator and the data page, and an arrival on the site is no
     * moment to raise an error nobody asked about.
     *
     * @author Claude
     */
    async check(): Promise<void>
    {
        if ( !remote.configured || this.#checking )
        {
            return;
        }

        this.#checking = true;
        this.#checkedAt = Date.now();

        try
        {
            const snapshot = await remote.peek();

            if ( snapshot )
            {
                this.#judge( snapshot );
            }
        }
        finally
        {
            this.#checking = false;
        }
    }

    /**
     * Handles the arrival on the site, once both stores have been read from `localStorage`.
     *
     * Only the first call does anything. A service configured later, from the
     * data page, is not checked on the spot: the reader is already looking at
     * the panel that says where the backup stands.
     *
     * @author Claude
     */
    arrive(): void
    {
        if ( this.#arrived )
        {
            return;
        }

        this.#arrived = true;
        void this.check();
    }

    /**
     * Checks the service again, unless it was read less than a minute ago.
     *
     * Called on every page change and whenever the tab comes back into view.
     *
     * @author Claude
     */
    recheck(): void
    {
        const fresh = Date.now() - this.#checkedAt < RECHECK_INTERVAL;

        if ( this.#arrived && !fresh )
        {
            void this.check();
        }
    }

    /**
     * Turns a snapshot into a verdict.
     *
     * When both sides have matched before, the markers settle it without any
     * clock: the snapshot either is the one last synchronised or it is not. A
     * browser that never synchronised with this service has nothing but dates
     * to go on, so the more recent content is the one put forward.
     *
     * @param snapshot Snapshot just read from the service.
     * @author Claude
     */
    #judge( snapshot: RemoteSnapshot ): void
    {
        const marker = markerOf( snapshot );
        const known = remote.config.syncedRemote;
        const localMoved = this.localState !== "synced";

        this.remoteChangedAt = snapshot.changedAt;

        if ( known !== null )
        {
            const remoteMoved = marker !== null && marker !== known;

            if ( remoteMoved )
            {
                this.verdict = localMoved ? "diverged" : "newer";
            }
            else if ( localMoved )
            {
                // The backup did not move while this browser did: that is the reminder's
                // business, which offers to send after every change.
                this.verdict = null;
            }
            else
            {
                this.#settle();
            }

            return;
        }

        const remoteTime = timeOf( snapshot.changedAt );
        const localTime = wiki.hasStoredContent ? timeOf( wiki.changedAt ) : null;

        if ( remoteTime === null )
        {
            return;
        }

        if ( remoteTime === localTime )
        {
            // Same content stamp on both sides: this browser sent that very snapshot,
            // or restored it before the second marker existed.
            remote.markSynced( wiki.changedAt, marker );
            this.#settle();

            return;
        }

        this.verdict = localTime === null || remoteTime > localTime ? "newer" : "older";
    }
}

export const sync = new SyncStore();
