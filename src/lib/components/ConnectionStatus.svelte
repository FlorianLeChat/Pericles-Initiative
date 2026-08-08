<script lang="ts">
    /**
     * Reports the state of the network, and publishes to the service once it is back.
     *
     * Two jobs, because they are the same sentence to the reader: an installed
     * site that works with no connection has to say so, and the one thing an
     * author wants to know afterwards is whether what they wrote offline made it
     * out. Mounted by the root layout, so a page written from anywhere is covered.
     *
     * Like `RemoteBackup.svelte`, this owns the wiring between the two stores
     * rather than coupling them: the wiki hands over its content and its change
     * marker, the service moves the bytes, and neither knows the other exists.
     *
     * Nothing here fires unless the reader configured a service, synchronised it
     * once by hand, and turned automatic publishing on. Without that, the
     * component is a network indicator and nothing else.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import Icon from "$lib/components/Icon.svelte";
    import { remote } from "$lib/state/remote.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { RemoteFailure } from "$lib/types";

    const CLOUD_OFF = "M3 3l18 18M6.3 8.1A5.25 5.25 0 0 0 6.75 18.5h9.4M8.5 5.4a6 6 0 0 1 9.4 4.4 4.5 4.5 0 0 1 2 8.2";
    const CLOUD_UP = "M7 18.5a4.75 4.75 0 0 1-.7-9.45 6 6 0 0 1 11.6 1.55 4.25 4.25 0 0 1-.4 8.4M12 20v-8m0 0-2.5 2.5"
      + "M12 12l2.5 2.5";
    const WARNING = "M12 9v4.5m0 3.25v.1M10.3 4.2 2.9 17.5A1.9 1.9 0 0 0 4.6 20.4h14.8a1.9 1.9 0 0 0 1.7-2.9L13.7 4.2"
      + "a1.9 1.9 0 0 0-3.4 0Z";

    /**
     * How long the content has to stop changing before it is sent.
     *
     * An automatic send moves the whole dataset, so firing one per keystroke
     * would push several megabytes for a corrected typo. Every edit restarts this
     * timer, which is also what makes a reconnection wait for the writing to
     * settle rather than racing it.
     */
    const IDLE_DELAY = 5_000;

    /**
     * Delays between attempts, in milliseconds, and how many there are.
     *
     * `navigator.onLine` reports a network, not a working route to the service:
     * a captive portal, a tunnel coming up or a server still booting all answer
     * the first attempt with a failure. Retrying three times over a minute covers
     * those, and stopping there avoids hammering an endpoint that is simply gone.
     */
    const RETRY_DELAYS = [ 5_000, 15_000, 45_000 ] as const;

    /** Failures worth another attempt. Anything else needs a human, not a retry. */
    const RETRYABLE: ReadonlySet<RemoteFailure> = new Set<RemoteFailure>( [ "network", "server" ] );

    /** What the reader is told when automatic publishing gave up. */
    const FAILURE_MESSAGE: Readonly<Record<RemoteFailure, string>> = {
        network: "Publication automatique impossible : serveur injoignable.",
        refused: "Publication automatique refusée : secret rejeté par le serveur.",
        missing: "Publication automatique impossible : aucune sauvegarde sur le serveur.",
        unsupported: "Publication automatique impossible : le serveur n'accepte rien à cette adresse.",
        conflict: "La sauvegarde en ligne a changé ailleurs. À vous de choisir quoi garder.",
        unreadable: "Publication automatique impossible : réponse du serveur inexploitable.",
        server: "Publication automatique impossible : le serveur a répondu par une erreur."
    };

    let online = $state( true );
    let attempts = $state( 0 );
    let failure = $state<RemoteFailure | null>( null );

    /** Change marker the warning was last dismissed on, so a new edit shows it again. */
    let dismissedChange = $state<string | null>( null );

    // The connection is only in `localStorage`, so it exists once mounted. Reading
    // it during rendering would put an endpoint into the prerendered HTML.
    $effect( () =>
    {
        remote.loadConfig();
    } );

    /**
     * True once every condition for publishing on our own is met.
     *
     * The first transfer stays manual on purpose. A browser that has never
     * synchronised knows neither what the service holds nor its revision, so an
     * unattended send would overwrite a backup nobody here has ever read.
     */
    const ready = $derived( remote.loaded && wiki.overlayLoaded );
    const armed = $derived( ready && remote.configured && remote.config.autoPush && remote.config.syncedChange !== null );

    /** True when this browser holds content the service does not have yet. */
    const pending = $derived( armed && remote.config.syncedChange !== wiki.changedAt );

    /** True while the reader has waved the warning away and nothing has changed since. */
    const dismissed = $derived( dismissedChange !== null && dismissedChange === wiki.changedAt );

    /** True once the failure is one no amount of retrying will fix. */
    const blocked = $derived( failure !== null && !RETRYABLE.has( failure ) );

    /** True when attempts are exhausted, so the send waits for the next change. */
    const exhausted = $derived( attempts >= RETRY_DELAYS.length );

    /**
     * Sends the whole content, exactly as the manual button does.
     *
     * Conditional on purpose: an unattended write is the last thing that should
     * silently overwrite a snapshot someone else changed, so a `412` stops the
     * loop and hands the decision back to the reader on the data page.
     *
     * @author Claude
     */
    const publish = async (): Promise<void> =>
    {
        // Captured before the request, so an edit made while it flies is counted
        // as pending rather than marked as sent.
        const sent = wiki.changedAt;
        const stored = await remote.push( wiki.exportJson() );

        if ( stored )
        {
            remote.markSynced( sent );
            attempts = 0;
            failure = null;

            return;
        }

        attempts += 1;
        failure = remote.failure;
    };

    // Losing the network is what refills the budget, rather than getting it back:
    // whatever failed before the connection dropped says nothing about the one
    // that will come back, and nothing is attempted while offline anyway. Written
    // this way round because being offline is a state, whereas «being online» is
    // true after every failure too, and resetting there would retry for ever.
    $effect( () =>
    {
        if ( !online )
        {
            attempts = 0;
            failure = null;
        }
    } );

    // A new edit is a new attempt: the send that failed carried content that no
    // longer exists, so its exhausted budget has nothing left to say.
    $effect( () =>
    {
        void wiki.changedAt;

        attempts = 0;
        failure = null;
    } );

    // Reading `pending` here is what makes every edit restart the countdown: the
    // effect re-runs, its cleanup drops the pending timer, and a new one starts.
    // Reading `attempts` is what turns a failure into the next attempt.
    $effect( () =>
    {
        const idle = !pending || !online || remote.busy || blocked || exhausted;

        if ( idle )
        {
            return;
        }

        const delay = attempts === 0 ? IDLE_DELAY : RETRY_DELAYS[ attempts - 1 ];
        const timer = setTimeout( () => void publish(), delay );

        return () =>
        {
            clearTimeout( timer );
        };
    } );

    /** What the pill says, or null when there is nothing worth saying. */
    const pill = $derived.by( (): "offline" | "failed" | "sending" | "waiting" | null =>
    {
        if ( !online )
        {
            return "offline";
        }

        if ( ( blocked || exhausted ) && !dismissed )
        {
            return "failed";
        }

        if ( !pending )
        {
            return null;
        }

        return remote.busy ? "sending" : "waiting";
    } );
</script>

<svelte:window bind:online />

{#if pill}
    <div
        class="surface fixed bottom-4 left-4 z-40 flex max-w-xs items-center gap-2 px-3 py-2 text-xs shadow-lg"
        role="status"
        aria-live="polite"
    >
        {#if pill === "offline"}
            <Icon path={CLOUD_OFF} class="text-muted h-4 w-4 shrink-0" />

            <span>
                Hors ligne. {pending ? "Vos modifications partiront au retour du réseau." : "Le wiki reste modifiable."}
            </span>
        {:else if pill === "failed"}
            <Icon path={WARNING} class="text-alert-500 h-4 w-4 shrink-0" />

            <span>
                {failure ? FAILURE_MESSAGE[ failure ] : ""}
                <a class="underline" href={resolve( "/data" )}>Ouvrir les sauvegardes</a>
            </span>

            <button
                type="button"
                class="text-muted hover:text-ink-800 dark:hover:text-paper-200 ml-1 shrink-0"
                aria-label="Masquer l'avertissement"
                onclick={() => ( dismissedChange = wiki.changedAt )}
            >
                ✕
            </button>
        {:else}
            <Icon path={CLOUD_UP} class="text-accent-600 dark:text-accent-300 h-4 w-4 shrink-0" />

            <span>{pill === "sending" ? "Publication en cours..." : "Publication automatique imminente"}</span>
        {/if}
    </div>
{/if}
