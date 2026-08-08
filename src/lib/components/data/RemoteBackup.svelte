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
     * The contract is specified in `REMOTE-API.md`.
     *
     * @author Claude
     */
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { remote } from "$lib/state/remote.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { RemoteFailure } from "$lib/types";
    import { formatDateTime } from "$lib/utilities/date";
    import { isUsableBaseUrl } from "$lib/utilities/remote";

    /**
     * What the reader is told for each documented failure.
     *
     * The transport only reports a machine readable cause, so the sentences live
     * here, in the component that displays them, as the project has no message
     * catalogue for its single language.
     */
    const FAILURE_MESSAGE: Readonly<Record<RemoteFailure, string>> = {
        network: "Serveur injoignable. Vérifiez l'adresse, et que le serveur autorise bien ce site (CORS).",
        refused: "Secret refusé par le serveur.",
        missing: "Aucune sauvegarde sur ce serveur pour le moment.",
        unsupported:
            "Le serveur ne propose rien à cette adresse. Vérifiez qu'il accepte bien un PUT sur /dataset, et que "
            + "l'adresse saisie ne contient pas déjà « /dataset ».",
        conflict: "La sauvegarde distante a changé depuis votre dernière lecture.",
        unreadable: "Le serveur n'a pas renvoyé de JSON exploitable.",
        server: "Le serveur a répondu par une erreur."
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
            const count = snapshot.dataset.entries.length;

            feedback = {
                kind: "success",
                text:
                    `Serveur joignable. La sauvegarde distante contient ${ count } `
                    + `${ count === 1 ? "fiche" : "fiches" }.`
            };

            return;
        }

        // A service holding nothing yet answers 404. That proves it is reachable and
        // that the secret was accepted, so for a connection test it is a success.
        feedback
            = remote.failure === "missing"
                ? { kind: "success", text: "Serveur joignable, aucune sauvegarde enregistrée pour le moment." }
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
            ? { kind: "success", text: "Sauvegarde en ligne mise à jour." }
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

        feedback = {
            kind: "success",
            text:
                `Restauration réussie : ${ counts.entries } ${ counts.entries === 1 ? "fiche" : "fiches" }, `
                + `${ counts.categories } ${ counts.categories === 1 ? "catégorie" : "catégories" }, `
                + `${ counts.live } ${ counts.live === 1 ? "entrée" : "entrées" } de direct.`
        };
    };
</script>

<section class="surface mt-6 p-6">
    <h2 class="font-serif text-xl font-semibold tracking-tight">Sauvegarde en ligne</h2>

    <p class="text-muted mt-2 text-sm leading-relaxed">
        Facultatif, et indépendant de la sauvegarde en local. Le wiki fonctionne très bien sans : tant qu'aucune adresse
        n'est renseignée, aucune requête n'est envoyée et tout reste dans ce navigateur. En renseigner une permet
        d'envoyer le contenu vers un service JSON que vous hébergez, et de le récupérer depuis un autre appareil. La
        mise en place d'un tel service est décrite dans <code class="font-mono text-xs">REMOTE-API.md</code>.
    </p>

    {#if feedback}
        <p
            class="mt-5 rounded-xl px-4 py-3 text-sm {feedback.kind === "success"
                ? "bg-accent-100 text-accent-900 dark:bg-accent-900/50 dark:text-accent-100"
                : "bg-alert-500/15 text-alert-600 dark:text-red-300"}"
            role="status"
        >
            {feedback.text}
        </p>
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
            <label class="field-label" for="remote-base-url">Adresse du service</label>

            <input
                id="remote-base-url"
                bind:value={baseUrl}
                type="url"
                class="field font-mono text-xs"
                placeholder="https://node-red.exemple.fr/pericles"
                autocomplete="off"
            />

            <p class="text-muted mt-1.5 text-xs leading-relaxed">
                Sans le segment final : le client appelle <code class="font-mono">/dataset</code> sous cette adresse.
            </p>
        </div>

        <div>
            <label class="field-label" for="remote-secret">Secret, facultatif</label>

            <input
                id="remote-secret"
                bind:value={secret}
                type="password"
                class="field font-mono text-xs"
                placeholder="Laissez vide si le service n'en demande pas"
                autocomplete="off"
            />

            <p class="text-muted mt-1.5 text-xs leading-relaxed">
                Envoyé dans l'entête <code class="font-mono">X-Pericles-Secret</code>. Conservé en clair dans ce
                navigateur : ce n'est pas une protection, seulement un garde fou pour un service déjà privé.
            </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
            <button type="submit" class="btn btn-primary" disabled={!canConnect || remote.busy}>
                {remote.busy ? "Connexion..." : "Tester la connexion"}
            </button>

            {#if dirty && canConnect}
                <span class="text-signal-500 text-xs">Adresse non enregistrée, tester l'enregistre</span>
            {/if}
        </div>
    </form>

    {#if remote.configured}
        <div class="border-paper-200 dark:border-ink-800 mt-6 border-t pt-6">
            {#if syncState === "synced"}
                <p
                    class="bg-accent-100 text-accent-900 dark:bg-accent-900/50 dark:text-accent-100 rounded-xl px-4
                           py-3 text-sm"
                >
                    Sauvegarde en ligne à jour : elle contient exactement ce que contient ce navigateur.
                </p>
            {:else if syncState === "stale"}
                <p class="bg-signal-500/15 text-signal-500 rounded-xl px-4 py-3 text-sm">
                    Ce navigateur a changé depuis la dernière synchronisation. Envoyez la sauvegarde pour la remettre à
                    jour, ou restaurez pour abandonner ces modifications.
                </p>
            {:else}
                <p class="text-muted text-sm">
                    Ce navigateur n'a encore jamais été synchronisé avec ce serveur.
                </p>
            {/if}

            <div class="mt-5 flex flex-wrap gap-2">
                <button
                    type="button"
                    class="btn btn-primary"
                    disabled={remote.busy}
                    onclick={() => ( sendOpen = true )}
                >
                    Envoyer la sauvegarde
                </button>

                <button
                    type="button"
                    class="btn btn-outline"
                    disabled={remote.busy}
                    onclick={() => ( restoreOpen = true )}
                >
                    Restaurer depuis le serveur
                </button>

                {#if conflicted}
                    <button
                        type="button"
                        class="btn btn-danger"
                        disabled={remote.busy}
                        onclick={() => ( overwriteOpen = true )}
                    >
                        Écraser quand même
                    </button>
                {/if}
            </div>

            <p class="text-muted mt-4 text-sm leading-relaxed">
                Les deux sens sont complets : envoyer remplace la sauvegarde du serveur par le contenu de ce navigateur,
                restaurer remplace le contenu de ce navigateur par la sauvegarde.
                {remote.conditional
                    ? "Ce serveur suivant ses révisions, un envoi est refusé si la sauvegarde a changé depuis votre "
                    + "dernière lecture."
                    : "Ce serveur ne suivant pas ses révisions, le dernier envoi écrase le précédent sans avertir."}
            </p>

            <div class="border-paper-200 dark:border-ink-800 mt-6 border-t pt-6">
                <label class="flex items-start gap-3 text-sm">
                    <input
                        type="checkbox"
                        class="accent-accent-600 mt-0.5 h-4 w-4 shrink-0"
                        checked={remote.config.autoPush}
                        disabled={neverSynced}
                        onchange={( event ) => remote.save( { autoPush: event.currentTarget.checked } )}
                    />

                    <span>
                        Publier automatiquement au retour du réseau

                        <span class="text-muted mt-1 block text-xs leading-relaxed">
                            {#if neverSynced}
                                Disponible après une première synchronisation faite à la main : tant que ce navigateur
                                n'a jamais lu ce serveur, un envoi automatique écraserait une sauvegarde que personne
                                n'a vue.
                            {:else}
                                Vos modifications partent seules quelques secondes après la dernière frappe, et sont
                                mises en attente tant que vous êtes hors ligne. Un envoi refusé parce que la sauvegarde
                                distante a changé ne sera jamais forcé : il vous est signalé et vous tranchez ici.
                            {/if}
                        </span>
                    </span>
                </label>
            </div>

            <dl class="text-muted mt-6 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-[auto_1fr]">
                <dt class="tracking-wide uppercase">Dernier envoi</dt>
                <dd>{remote.config.lastPushedAt ? formatDateTime( remote.config.lastPushedAt ) : "jamais"}</dd>

                <dt class="tracking-wide uppercase">Dernière lecture</dt>
                <dd>{remote.config.lastPulledAt ? formatDateTime( remote.config.lastPulledAt ) : "jamais"}</dd>
            </dl>

            <button
                type="button"
                class="btn btn-ghost hover:text-alert-500 mt-5"
                onclick={() => ( forgetOpen = true )}
            >
                Oublier ce serveur
            </button>
        </div>
    {/if}
</section>

<ConfirmDialog
    bind:open={sendOpen}
    title="Envoyer la sauvegarde ?"
    message={wiki.hasStoredContent
        ? "Le contenu de ce navigateur va remplacer entièrement la sauvegarde du serveur."
        : "Ce navigateur ne contient aucun contenu. L'envoi va donc remplacer la sauvegarde du serveur "
          + "par un wiki vide."}
    confirmLabel="Envoyer"
    danger={!wiki.hasStoredContent}
    onconfirm={() => void send( true )}
/>

<ConfirmDialog
    bind:open={overwriteOpen}
    title="Écraser la sauvegarde distante ?"
    message="Les modifications faites sur le serveur depuis votre dernière lecture seront perdues définitivement."
    confirmLabel="Écraser"
    danger
    onconfirm={() => void send( false )}
/>

<ConfirmDialog
    bind:open={restoreOpen}
    title="Restaurer depuis le serveur ?"
    message={"Le contenu de ce navigateur va être remplacé par la sauvegarde du serveur. "
      + "Ce qui n'a pas été envoyé sera perdu."}
    confirmLabel="Restaurer"
    onconfirm={() => void restore()}
/>

<ConfirmDialog
    bind:open={forgetOpen}
    title="Oublier ce serveur ?"
    message="L'adresse et le secret seront effacés de ce navigateur. Le contenu local, lui, ne bouge pas."
    confirmLabel="Oublier"
    onconfirm={() =>
    {
        remote.forget();
        baseUrl = "";
        secret = "";
        feedback = { kind: "success", text: "Serveur oublié. Le wiki continue de fonctionner dans ce navigateur." };
    }}
/>
