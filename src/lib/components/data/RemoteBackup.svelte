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
    import Alert from "flowbite-svelte/Alert.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { ACTION_BUTTON, ACTION_ROW } from "$lib/config/forms";
    import { remote } from "$lib/state/remote.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { RemoteFailure } from "$lib/types";
    import { formatDateTime } from "$lib/utilities/date";
    import { counted } from "$lib/utilities/plural";
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
        network: "Le serveur ne répond pas. Vérifiez l'adresse, et qu'il est bien en ligne.",
        refused: "Le mot de passe a été refusé.",
        missing: "Ce serveur ne contient encore aucune sauvegarde.",
        unsupported: "Cette adresse ne mène pas à un serveur de sauvegarde. Vérifiez la auprès de qui l'a installé.",
        conflict: "La sauvegarde en ligne a changé depuis votre dernière lecture, sans doute depuis un autre appareil.",
        unreadable: "La réponse du serveur est incompréhensible. Il ne s'agit peut être pas d'un serveur de sauvegarde.",
        server: "Le serveur a rencontré une erreur de son côté. Réessayez plus tard."
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
                    `Connexion réussie. La sauvegarde en ligne contient ${ counted( count, "fiche" ) }.`
            };

            return;
        }

        // A service holding nothing yet answers 404. That proves it is reachable and
        // that the secret was accepted, so for a connection test it is a success.
        feedback
            = remote.failure === "missing"
                ? { kind: "success", text: "Connexion réussie. Ce serveur ne contient encore aucune sauvegarde." }
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
                `Wiki restauré : ${ counted( counts.entries, "fiche" ) }, ${ counted( counts.categories, "catégorie" ) } `
                + `et ${ counted( counts.live, "entrée" ) } du fil.`
        };
    };
</script>

<section class="surface mt-6 p-6">
    <h2 class="font-serif text-xl font-semibold tracking-tight">Sauvegarde en ligne</h2>

    <p class="text-muted mt-2 text-sm leading-relaxed">
        Facultatif, et pour la plupart des usages inutile : le wiki fonctionne très bien avec le seul fichier de
        sauvegarde ci dessus. Renseigner un serveur vous permet de retrouver vos pages sur un autre appareil sans passer
        de fichier à la main. Tant que ce champ reste vide, rien ne quitte cet appareil. Il vous faut un serveur à vous,
        que quelqu'un doit avoir installé pour l'occasion.
    </p>

    {#if feedback}
        <Alert
            color={feedback.kind === "success" ? "primary" : "red"}
            class="mt-5 rounded-xl text-sm"
            role="status"
        >
            {feedback.text}
        </Alert>
    {/if}

    {#if remote.storageError}
        <Alert color="red" class="mt-5 rounded-xl text-sm" role="alert">
            {remote.storageError} Le serveur reste utilisable, mais il sera oublié en quittant cette page.
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
            <Label for="remote-base-url" class="field-label">Adresse du serveur</Label>

            <Input
                id="remote-base-url"
                bind:value={baseUrl}
                type="url"
                class="font-mono text-xs"
                aria-describedby="remote-base-url-hint"
                placeholder="https://exemple.fr/mon-wiki"
                autocomplete="off"
            />

            <Helper id="remote-base-url-hint" class="mt-1.5 text-xs leading-relaxed">
                L'adresse que vous a donnée la personne qui a installé le serveur, telle quelle.
            </Helper>
        </div>

        <div>
            <Label for="remote-secret" class="field-label">Mot de passe, facultatif</Label>

            <Input
                id="remote-secret"
                bind:value={secret}
                type="password"
                class="font-mono text-xs"
                aria-describedby="remote-secret-hint"
                placeholder="Laissez vide si le serveur n'en demande pas"
                autocomplete="off"
            />

            <Helper id="remote-secret-hint" class="mt-1.5 text-xs leading-relaxed">
                Il est conservé tel quel sur cet appareil, et ne chiffre rien : il empêche seulement un inconnu
                d'écrire sur votre serveur. N'y mettez pas un mot de passe qui vous sert ailleurs.
            </Helper>
        </div>

        <div class={ACTION_ROW}>
            <Button type="submit" color="primary" disabled={!canConnect || remote.busy} loading={remote.busy}>
                {remote.busy ? "Connexion..." : "Tester la connexion"}
            </Button>

            {#if dirty && canConnect}
                <span class="text-signal-500 text-xs">Adresse non enregistrée, le test l'enregistrera</span>
            {/if}
        </div>
    </form>

    {#if remote.configured}
        <div class="border-paper-200 dark:border-ink-800 mt-6 border-t pt-6">
            {#if syncState === "synced"}
                <Alert color="primary" class="rounded-xl text-sm">
                    Sauvegarde en ligne à jour : elle contient exactement vos pages actuelles.
                </Alert>
            {:else if syncState === "stale"}
                <Alert color="yellow" class="rounded-xl text-sm">
                    Vous avez écrit depuis la dernière synchronisation. Envoyez pour mettre la sauvegarde à jour, ou
                    restaurez pour abandonner ce que vous avez écrit depuis.
                </Alert>
            {:else}
                <p class="text-muted text-sm">
                    Vous n'avez encore jamais synchronisé cet appareil avec ce serveur.
                </p>
            {/if}

            <div class="mt-5 {ACTION_ROW}">
                <Button color="primary" disabled={remote.busy} onclick={() => ( sendOpen = true )}>
                    Envoyer mes pages
                </Button>

                <Button color="alternative" disabled={remote.busy} onclick={() => ( restoreOpen = true )}>
                    Restaurer depuis le serveur
                </Button>

                {#if conflicted}
                    <Button color="red" disabled={remote.busy} onclick={() => ( overwriteOpen = true )}>
                        Écraser quand même
                    </Button>
                {/if}
            </div>

            <p class="text-muted mt-4 text-sm leading-relaxed">
                Les deux sens remplacent tout : envoyer écrase la sauvegarde du serveur avec vos pages, restaurer
                écrase vos pages avec la sauvegarde.
                {remote.conditional
                    ? "Ce serveur suivant ses révisions, un envoi est refusé si la sauvegarde a changé depuis votre "
                    + "dernière lecture."
                    : "Ce serveur ne suivant pas ses révisions, le dernier envoi écrase le précédent sans avertir."}
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
                        Envoyer automatiquement quand la connexion revient

                        <span id="remote-auto-push-hint" class="text-muted mt-1 block text-xs leading-relaxed">
                            {#if neverSynced}
                                À activer après une première synchronisation faite à la main : sans cela, le premier
                                envoi automatique écraserait une sauvegarde que vous n'avez jamais vue.
                            {:else}
                                Vos modifications partent seules quelques secondes après la dernière frappe, et sont
                                mises en attente tant que vous êtes hors ligne. Un envoi refusé parce que la
                                sauvegarde en ligne a changé ne sera jamais forcé : il vous est signalé et vous
                                tranchez ici.
                            {/if}
                        </span>
                    </span>
                </Checkbox>
            </div>

            <dl class="text-muted mt-6 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-[auto_1fr]">
                <dt class="tracking-wide uppercase">Dernier envoi</dt>
                <dd>
                    {#if remote.config.lastPushedAt}
                        <time datetime={remote.config.lastPushedAt}>{formatDateTime( remote.config.lastPushedAt )}</time>
                    {:else}
                        jamais
                    {/if}
                </dd>

                <dt class="tracking-wide uppercase">Dernière lecture</dt>
                <dd>
                    {#if remote.config.lastPulledAt}
                        <time datetime={remote.config.lastPulledAt}>{formatDateTime( remote.config.lastPulledAt )}</time>
                    {:else}
                        jamais
                    {/if}
                </dd>
            </dl>

            <Button
                color="alternative"
                class="hover:text-alert-500 mt-5 border-0 {ACTION_BUTTON}"
                onclick={() => ( forgetOpen = true )}
            >
                Oublier ce serveur
            </Button>
        </div>
    {/if}
</section>

<ConfirmDialog
    bind:open={sendOpen}
    title="Envoyer mes pages ?"
    message={wiki.hasStoredContent
        ? "Vos pages vont remplacer entièrement la sauvegarde du serveur."
        : "Votre wiki est vide. L'envoi va donc remplacer la sauvegarde du serveur par un wiki vide."}
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
    message={"Vos pages vont être remplacées par celles de la sauvegarde. "
      + "Ce que vous n'avez pas envoyé sera perdu."}
    confirmLabel="Restaurer"
    onconfirm={() => void restore()}
/>

<ConfirmDialog
    bind:open={forgetOpen}
    title="Oublier ce serveur ?"
    message="L'adresse et le mot de passe seront oubliés. Vos pages, elles, ne bougent pas."
    confirmLabel="Oublier"
    onconfirm={() =>
    {
        remote.forget();
        baseUrl = "";
        secret = "";
        feedback = { kind: "success", text: "Serveur oublié. Votre wiki continue de fonctionner sur cet appareil." };
    }}
/>
