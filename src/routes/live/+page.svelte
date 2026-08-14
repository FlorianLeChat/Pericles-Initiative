<script lang="ts">
    /**
     * Live feed.
     *
     * Publications appear immediately: they are written straight to the
     * `localStorage` overlay, the sole source of content for now.
     *
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import Radio from "flowbite-svelte/Radio.svelte";
    import Select from "flowbite-svelte/Select.svelte";
    import { cubicOut } from "svelte/easing";
    import { fly } from "svelte/transition";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import LiveComposer from "$lib/components/live/LiveComposer.svelte";
    import LiveFeedGroup from "$lib/components/live/LiveFeedGroup.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { filterPill, RADIO_OVERLAY } from "$lib/config/forms";
    import { SEVERITIES } from "$lib/config/severities";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { LiveEntry, LiveSeverity } from "$lib/types";
    import { formatLongDate, relativeTime } from "$lib/utilities/date";

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
    <PageHeader title="Le fil">
        {#snippet eyebrow()}
            <p class="text-alert-500 flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase">
                <span class="bg-alert-500 h-2 w-2 animate-pulse rounded-full" aria-hidden="true"></span>
                En direct
            </p>
        {/snippet}

        {#snippet description()}
            {wiki.live.length} entrées.
            {#if latest}
                La dernière remonte à <time datetime={latest.publishedAt}>{relativeTime( latest.publishedAt )}</time>.
            {/if}
        {/snippet}

        {#snippet action()}
            <Button
                color="primary"
                aria-expanded={composerOpen}
                onclick={() =>
                {
                    editing = null;
                    composerOpen = !composerOpen;
                }}
            >
                {composerOpen && !editing ? "Fermer le composeur" : "Publier une entrée"}
            </Button>
        {/snippet}
    </PageHeader>

    <div class="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
                <fieldset class="contents">
                    <legend class="sr-only">Filtrer par gravité</legend>

                    <Radio
                        name="filtre-gravite"
                        value="toutes"
                        bind:group={severity}
                        class={RADIO_OVERLAY}
                        classes={{ label: filterPill( severity === "toutes" ) }}
                    >
                        Toutes gravités
                    </Radio>

                    {#each SEVERITIES as config ( config.id )}
                        <Radio
                            name="filtre-gravite"
                            value={config.id}
                            bind:group={severity}
                            class={RADIO_OVERLAY}
                            classes={{ label: filterPill( severity === config.id ) }}
                        >
                            {config.label}
                        </Radio>
                    {/each}
                </fieldset>

                {#if wiki.liveTags.length > 0}
                    <Select bind:value={tag} size="sm" placeholder="" class="w-auto" aria-label="Filtrer par étiquette">
                        <option value="toutes">Toutes étiquettes</option>

                        {#each wiki.liveTags as item ( item )}
                            <option value={item}>{item}</option>
                        {/each}
                    </Select>
                {/if}
            </div>

            {#if filtered.length === 0}
                <div class="mt-8">
                    <EmptyState
                        title="Rien à cette gravité"
                        description="Aucune entrée du fil ne correspond à ce filtre."
                    >
                        <Button
                            color="alternative"
                            onclick={() =>
                            {
                                severity = "toutes";
                                tag = "toutes";
                            }}
                        >
                            Tout afficher
                        </Button>
                    </EmptyState>
                </div>
            {:else}
                {#if pinned.length > 0}
                    <LiveFeedGroup
                        heading="Épinglées"
                        items={pinned}
                        onedit={startEdit}
                        ondelete={( target ) =>
                        {
                            pendingDeletion = target;
                            deleteOpen = true;
                        }}
                    />
                {/if}

                {#each days as group ( group.day )}
                    <LiveFeedGroup
                        heading={formatLongDate( group.day )}
                        items={group.items}
                        onedit={startEdit}
                        ondelete={( target ) =>
                        {
                            pendingDeletion = target;
                            deleteOpen = true;
                        }}
                    />
                {/each}
            {/if}
        </div>

        <!--
            Below `lg` this column follows the feed, which for the composer means
            the button that opens it is at the top of the page and what it opens
            is under the whole feed, out of sight. Moving the column above the
            feed while it is open puts the form where the tap happened; closed, it
            holds explanations that belong after what they explain.
        -->
        <aside class="space-y-5 {composerOpen ? "max-lg:order-first" : ""}">
            {#if composerOpen}
                {#key editing?.id ?? "nouvelle"}
                    <div in:fly={{ y: -8, duration: 220, easing: cubicOut }}>
                        <LiveComposer
                            editing={editing ?? undefined}
                            onsaved={() => ( editing = null )}
                            oncancel={() => ( editing = null )}
                        />
                    </div>
                {/key}
            {:else}
                <div class="surface p-5">
                    <p class="text-muted text-xs tracking-wide uppercase">Comment ça marche</p>

                    <p class="text-ink-500 dark:text-paper-300/80 mt-3 text-sm leading-relaxed">
                        Une entrée du fil est courte et horodatée. Quand un événement mérite mieux, reliez la à une
                        fiche : le lien « Lire la fiche complète » apparaît sous l'entrée.
                    </p>

                    <p class="text-muted mt-3 text-sm leading-relaxed">
                        Une entrée en gravité « Alerte » affiche un bandeau sur tout le site pendant vingt quatre
                        heures.
                    </p>
                </div>
            {/if}

            <div class="surface p-5">
                <p class="text-muted text-xs tracking-wide uppercase">Stockage</p>

                <p class="text-ink-500 dark:text-paper-300/80 mt-3 text-sm leading-relaxed">
                    Chaque publication est écrite directement dans le stockage local de ce navigateur : elle apparaît
                    immédiatement ici, mais reste propre à cet appareil tant qu'elle n'a pas été exportée.
                </p>
            </div>
        </aside>
    </div>
</div>

<ConfirmDialog
    bind:open={deleteOpen}
    title="Supprimer cette entrée ?"
    message="L'entrée sera supprimée définitivement."
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
