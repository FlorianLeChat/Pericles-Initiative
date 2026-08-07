<script lang="ts">
    /**
     * Live feed.
     *
     * The published JSON is polled while the page is open, so replacing
     * `wiki.json` on the server is enough to update every reader without a
     * rebuild. Local publications appear immediately, before any export.
     *
     * @author Claude
     */
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import LiveComposer from "$lib/components/live/LiveComposer.svelte";
    import LiveItem from "$lib/components/live/LiveItem.svelte";
    import { SEVERITIES } from "$lib/config/severities";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { LiveEntry, LiveSeverity } from "$lib/types";
    import { formatLongDate, formatTime, relativeTime } from "$lib/utilities/date";

    /** How often the published feed is polled, in milliseconds. */
    const POLL_INTERVAL = 60_000;

    let severity = $state<LiveSeverity | "toutes">( "toutes" );
    let tag = $state( "toutes" );
    let composerOpen = $state( false );
    let editing = $state<LiveEntry | null>( null );
    let pendingDeletion = $state<LiveEntry | null>( null );
    let deleteOpen = $state( false );

    const filtered = $derived(
        wiki.live.filter( ( item ) =>
        {
            if ( severity !== "toutes" && item.severity !== severity )
            {
                return false;
            }
            return tag === "toutes" || item.tags.includes( tag );
        } )
    );

    const pinned = $derived( filtered.filter( ( item ) => item.pinned ) );

    /** Remaining items, grouped by day, most recent day first. */
    const days = $derived.by( () =>
    {
        const groups: Record<string, LiveEntry[]> = {};

        for ( const item of filtered.filter( ( candidate ) => !candidate.pinned ) )
        {
            const day = item.publishedAt.slice( 0, 10 );
            groups[ day ] = [ ...( groups[ day ] ?? [] ), item ];
        }

        return Object.entries( groups )
            .sort( ( [ a ], [ b ] ) => b.localeCompare( a ) )
            .map( ( [ day, items ] ) => ( {
                day,
                items: items.sort( ( a, b ) => b.publishedAt.localeCompare( a.publishedAt ) )
            } ) );
    } );

    const latest = $derived( wiki.live[ 0 ] );

    // Keep the feed in sync with the published file while the page is open.
    $effect( () =>
    {
        const interval = setInterval( () => void wiki.refresh(), POLL_INTERVAL );
        return () => clearInterval( interval );
    } );

    /**
     * Loads an item into the composer.
     *
     * @param item Item to edit.
     * @author Claude
     */
    const startEdit = ( item: LiveEntry ): void =>
    {
        editing = item;
        composerOpen = true;
    };
</script>

<svelte:head>
    <title>En direct · {wiki.meta.universe}</title>

    <meta name="description" content="Fil des événements en cours dans {wiki.meta.universe}." />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-2xl">
            <p class="text-alert-500 flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase">
                <span class="bg-alert-500 h-2 w-2 animate-pulse rounded-full" aria-hidden="true"></span>
                En direct
            </p>

            <h1 class="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Le fil</h1>

            <p class="text-ink-400 mt-3 leading-relaxed">
                {wiki.live.length} entrées.
                {#if latest}
                    La dernière remonte à {relativeTime( latest.publishedAt )}.
                {/if}
            </p>
        </div>

        <div class="flex flex-col items-end gap-2">
            <button
                type="button"
                class="btn btn-primary"
                onclick={() =>
                {
                    editing = null;
                    composerOpen = !composerOpen;
                }}
            >
                {composerOpen && !editing ? "Fermer le composeur" : "Publier une entrée"}
            </button>

            <p class="text-ink-400 text-xs">
                {#if wiki.syncedAt}
                    Fil actualisé à {formatTime( wiki.syncedAt )}
                {:else}
                    Actualisation automatique toutes les minutes
                {/if}
            </p>
        </div>
    </header>

    <div class="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer le fil">
                <button
                    type="button"
                    class="rounded-full px-3 py-1.5 text-xs font-medium transition {severity === "toutes"
                        ? "bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900"
                        : "bg-paper-200 text-ink-600 dark:bg-ink-800 dark:text-paper-300"}"
                    onclick={() => ( severity = "toutes" )}
                >
                    Toutes gravités
                </button>

                {#each SEVERITIES as config ( config.id )}
                    <button
                        type="button"
                        class="rounded-full px-3 py-1.5 text-xs font-medium transition {severity === config.id
                            ? "bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900"
                            : "bg-paper-200 text-ink-600 dark:bg-ink-800 dark:text-paper-300"}"
                        onclick={() => ( severity = config.id )}
                        aria-label="N'afficher que la gravité {config.label}"
                        aria-pressed={severity === config.id}
                    >
                        {config.label}
                    </button>
                {/each}

                {#if wiki.liveTags.length > 0}
                    <select bind:value={tag} class="field w-auto py-1.5 text-xs" aria-label="Filtrer par étiquette">
                        <option value="toutes">Toutes étiquettes</option>

                        {#each wiki.liveTags as item ( item )}
                            <option value={item}>{item}</option>
                        {/each}
                    </select>
                {/if}
            </div>

            {#if filtered.length === 0}
                <div class="mt-8">
                    <EmptyState
                        title="Rien à cette gravité"
                        description="Aucune entrée du fil ne correspond à ce filtre."
                    >
                        <button
                            type="button"
                            class="btn btn-outline"
                            onclick={() =>
                            {
                                severity = "toutes";
                                tag = "toutes";
                            }}
                        >
                            Tout afficher
                        </button>
                    </EmptyState>
                </div>
            {:else}
                {#if pinned.length > 0}
                    <section class="mt-8">
                        <h2 class="text-ink-400 mb-4 text-xs tracking-[0.15em] uppercase">Épinglées</h2>

                        <div class="border-paper-200 dark:border-ink-800 space-y-8 border-l">
                            {#each pinned as item ( item.id )}
                                <LiveItem
                                    {item}
                                    onedit={startEdit}
                                    ondelete={( target ) =>
                                    {
                                        pendingDeletion = target;
                                        deleteOpen = true;
                                    }}
                                />
                            {/each}
                        </div>
                    </section>
                {/if}

                {#each days as group ( group.day )}
                    <section class="mt-10">
                        <h2 class="text-ink-400 mb-4 text-xs tracking-[0.15em] uppercase">
                            {formatLongDate( group.day )}
                        </h2>

                        <div class="border-paper-200 dark:border-ink-800 space-y-8 border-l">
                            {#each group.items as item ( item.id )}
                                <LiveItem
                                    {item}
                                    onedit={startEdit}
                                    ondelete={( target ) =>
                                    {
                                        pendingDeletion = target;
                                        deleteOpen = true;
                                    }}
                                />
                            {/each}
                        </div>
                    </section>
                {/each}
            {/if}
        </div>

        <aside class="space-y-5">
            {#if composerOpen}
                {#key editing?.id ?? "nouvelle"}
                    <LiveComposer
                        editing={editing ?? undefined}
                        onsaved={() => ( editing = null )}
                        oncancel={() => ( editing = null )}
                    />
                {/key}
            {:else}
                <div class="surface p-5">
                    <p class="text-ink-400 text-xs tracking-wide uppercase">Comment ça marche</p>

                    <p class="text-ink-500 dark:text-paper-300/80 mt-3 text-sm leading-relaxed">
                        Une entrée du fil est courte et horodatée. Quand un événement mérite mieux, reliez la à une
                        fiche : le lien « Lire la fiche complète » apparaît sous l'entrée.
                    </p>

                    <p class="text-ink-400 mt-3 text-sm leading-relaxed">
                        Une entrée en gravité « Alerte » affiche un bandeau sur tout le site pendant vingt quatre
                        heures.
                    </p>
                </div>
            {/if}

            <div class="surface p-5">
                <p class="text-ink-400 text-xs tracking-wide uppercase">Actualisation</p>

                <p class="text-ink-500 dark:text-paper-300/80 mt-3 text-sm leading-relaxed">
                    Le fil relit <code class="font-mono text-xs">/data/wiki.json</code> chaque minute. Remplacer ce fichier
                    sur le serveur suffit à mettre à jour les lecteurs, sans rebuild.
                </p>

                <button
                    type="button"
                    class="btn btn-outline mt-4 w-full py-1.5 text-xs"
                    onclick={() => void wiki.refresh()}
                >
                    Actualiser maintenant
                </button>
            </div>
        </aside>
    </div>
</div>

<ConfirmDialog
    bind:open={deleteOpen}
    title="Supprimer cette entrée ?"
    message="Elle disparaît du fil. Si elle vient du JSON publié, la suppression reste locale jusqu'au prochain export."
    confirmLabel="Supprimer"
    danger
    onconfirm={() =>
    {
        if ( pendingDeletion )
        {
            wiki.deleteLiveEntry( pendingDeletion.id );
            pendingDeletion = null;
        }
    }}
/>
