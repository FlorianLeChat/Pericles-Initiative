<script lang="ts">
    /**
     * Inventory of what this browser stores.
     *
     * Deliberately not phrased as pending changes: with an empty seed the overlay
     * is the whole content of the wiki, and no backup ever empties it. So this
     * panel answers «what does this browser hold, and how much room does it take»,
     * while «is my backup up to date» belongs to the two backup panels.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import { wiki } from "$lib/state/wiki.svelte";
    import { formatDateTime } from "$lib/utilities/date";
    import { plural } from "$lib/utilities/plural";

    /** Above this size the browser is close to refusing to store the overlay. */
    const STORAGE_WARNING = 3_500_000;

    const storedEntries = $derived( Object.values( wiki.overlay.entries ) );
    const storedCategories = $derived( Object.values( wiki.overlay.categories ) );
    const storedLive = $derived( Object.values( wiki.overlay.live ) );

    // Only ever populated once a backend feeds a seed: deleting a page that exists
    // in this browser alone simply drops it, there is nothing to remember.
    const deletedEntries = $derived(
        wiki.overlay.deleted.entries.map( ( id ) => ( {
            id,
            title: wiki.seed.entries.find( ( entry ) => entry.id === id )?.title ?? id
        } ) )
    );

    const overlaySize = $derived( new TextEncoder().encode( JSON.stringify( wiki.overlay ) ).length );

    /**
     * Formats a byte count for display.
     *
     * @param bytes Size in bytes.
     * @returns A short human readable size.
     * @author Claude
     */
    const formatSize = ( bytes: number ): string =>
        bytes < 1024
            ? `${ bytes } o`
            : bytes < 1_048_576
                ? `${ ( bytes / 1024 ).toFixed( 1 ) } ko`
                : `${ ( bytes / 1_048_576 ).toFixed( 2 ) } Mo`;
</script>

<section class="surface p-6">
    <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h2 class="font-serif text-xl font-semibold tracking-tight">Ce qui est enregistré ici</h2>

        <p class="text-muted text-xs">
            {formatSize( overlaySize )} utilisés sur cet appareil
        </p>
    </div>

    {#if !wiki.hasStoredContent}
        <p class="text-muted mt-4 text-sm leading-relaxed">
            Rien n'est encore enregistré sur cet appareil.
            <a href={resolve( "/new" )} class="wiki-link">Créez une fiche</a>
            pour commencer, ou restaurez une sauvegarde plus bas.
        </p>
    {:else}
        <p class="mt-4 text-sm">
            <strong>{wiki.storedItemCount}</strong>
            {plural( wiki.storedItemCount, "élément enregistré", "éléments enregistrés" )} sur cet appareil.
        </p>

        {#if wiki.changedAt}
            <p class="text-muted mt-1.5 text-sm">
                Dernière modification le <time datetime={wiki.changedAt}>{formatDateTime( wiki.changedAt )}</time>.
            </p>
        {/if}

        {#if overlaySize > STORAGE_WARNING}
            <p class="bg-signal-500/15 text-signal-500 mt-4 rounded-xl px-4 py-3 text-sm">
                La place disponible sur cet appareil est presque épuisée. Faites une copie de votre wiki, puis effacez
                le pour repartir léger.
            </p>
        {/if}

        <div class="mt-5 space-y-5 text-sm">
            {#if storedEntries.length > 0}
                <div>
                    <p class="text-muted mb-2 text-xs tracking-wide uppercase">Fiches</p>

                    <ul class="space-y-1.5">
                        {#each storedEntries as entry ( entry.id )}
                            <li class="flex flex-wrap items-center gap-2">
                                <a href={resolve( `/wiki/${ entry.slug }` )} class="wiki-link">{entry.title}</a>

                                {#if entry.status === "brouillon"}
                                    <span class="text-muted text-xs">brouillon</span>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}

            {#if deletedEntries.length > 0}
                <div>
                    <p class="text-muted mb-2 text-xs tracking-wide uppercase">Fiches supprimées</p>

                    <ul class="space-y-1.5">
                        {#each deletedEntries as item ( item.id )}
                            <li class="flex items-center gap-2">
                                <span
                                    class="bg-alert-500/15 text-alert-600 rounded-full px-2 py-0.5 text-xs dark:text-red-300"
                                >
                                    supprimée
                                </span>

                                <span class="line-through">{item.title}</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}

            {#if storedCategories.length > 0}
                <div>
                    <p class="text-muted mb-2 text-xs tracking-wide uppercase">Catégories</p>

                    <ul class="flex flex-wrap gap-1.5">
                        {#each storedCategories as category ( category.slug )}
                            <li class="bg-paper-200 dark:bg-ink-800 rounded-full px-2.5 py-1 text-xs">
                                {category.name}
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}

            {#if storedLive.length > 0}
                <div>
                    <p class="text-muted mb-2 text-xs tracking-wide uppercase">Fil en direct</p>

                    <p class="text-ink-500 dark:text-paper-300/80">
                        {storedLive.length}
                        {plural( storedLive.length, "entrée enregistrée", "entrées enregistrées" )}.
                    </p>
                </div>
            {/if}

            {#if wiki.overlay.meta}
                <div>
                    <p class="text-muted mb-2 text-xs tracking-wide uppercase">Identité du wiki</p>

                    <p class="text-ink-500 dark:text-paper-300/80">
                        Nom, signature, description, logo ou fiches à la une définis depuis
                        <a href={resolve( "/settings" )} class="wiki-link">les paramètres</a>.
                    </p>
                </div>
            {/if}
        </div>
    {/if}
</section>
