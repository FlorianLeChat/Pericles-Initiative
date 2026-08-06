<script lang="ts">
    /**
     * Data management: what changed locally, how to publish it, how to get it back.
     *
     * @author Claude
     */
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import { formatDateTime } from "$lib/utilities/date";

    /** Above this size the browser is close to refusing to store the overlay. */
    const STORAGE_WARNING = 3_500_000;

    let importText = $state( "" );
    let importMode = $state<"fusionner" | "remplacer">( "fusionner" );
    let feedback = $state<{ kind: "ok" | "error"; text: string } | null>( null );
    let importOpen = $state( false );
    let resetOpen = $state( false );

    const changedEntries = $derived( Object.values( wiki.overlay.entries ) );
    const changedCategories = $derived( Object.values( wiki.overlay.categories ) );
    const changedLive = $derived( Object.values( wiki.overlay.live ) );

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
        bytes < 1024 ? `${ bytes } o` : bytes < 1_048_576 ? `${ ( bytes / 1024 ).toFixed( 1 ) } ko` : `${ ( bytes / 1_048_576 ).toFixed( 2 ) } Mo`;

    /**
     * Tells whether a page comes from the published dataset or was created locally.
     *
     * @param id Page identifier.
     * @returns True when the page exists in the published JSON.
     * @author Claude
     */
    const isPublished = ( id: string ): boolean => wiki.seed.entries.some( ( entry ) => entry.id === id );

    /**
     * Downloads the current state as `wiki.json`.
     *
     * @author Claude
     */
    const download = (): void =>
    {
        const blob = new Blob( [ wiki.exportJson() ], { type: "application/json" } );
        const url = URL.createObjectURL( blob );
        const link = document.createElement( "a" );

        link.href = url;
        link.download = "wiki.json";
        link.click();
        URL.revokeObjectURL( url );

        feedback = { kind: "ok", text: "Export téléchargé. Remplacez static/data/wiki.json puis committez." };
    };

    /**
     * Copies the current state to the clipboard.
     *
     * @author Claude
     */
    const copy = async (): Promise<void> =>
    {
        try
        {
            await navigator.clipboard.writeText( wiki.exportJson() );
            feedback = { kind: "ok", text: "JSON copié dans le presse papier." };
        }
        catch ( error )
        {
            feedback = { kind: "error", text: `Copie refusée par le navigateur : ${ String( error ) }` };
        }
    };

    /**
     * Reads a chosen file into the import area.
     *
     * @param event Change event of the file input.
     * @author Claude
     */
    const onFile = async ( event: Event ): Promise<void> =>
    {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[ 0 ];

        if ( !file )
        {
            return;
        }

        importText = await file.text();
        feedback = {
            kind: "ok",
            text: `${ file.name } chargé. Choisissez le mode, puis lancez l'import.`
        };
    };

    /**
     * Applies the pending import.
     *
     * @author Claude
     */
    const runImport = (): void =>
    {
        try
        {
            const counts = wiki.importJson( importText, importMode );
            importText = "";
            feedback = {
                kind: "ok",
                text:
                    `Import réussi : ${ counts.entries } ${ counts.entries === 1 ? "fiche" : "fiches" }, `
                    + `${ counts.categories } ${ counts.categories === 1 ? "catégorie" : "catégories" }, `
                    + `${ counts.live } ${ counts.live === 1 ? "entrée" : "entrées" } de direct.`
            };
        }
        catch ( error )
        {
            feedback = { kind: "error", text: `JSON illisible : ${ String( error ) }` };
        }
    };
</script>

<svelte:head>
    <title>Données · {wiki.meta.universe}</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <header class="max-w-2xl">
        <h1 class="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Données</h1>
        <p class="text-ink-400 mt-3 leading-relaxed">
            Le site lit son contenu dans <code class="font-mono text-xs">static/data/wiki.json</code>. Vos
            modifications restent dans ce navigateur jusqu'à ce que vous les exportiez.
        </p>
    </header>

    {#if feedback}
        <p
            class="mt-6 rounded-xl px-4 py-3 text-sm {feedback.kind === "ok"
                ? "bg-accent-100 text-accent-900 dark:bg-accent-900/50 dark:text-accent-100"
                : "bg-alert-500/15 text-alert-600 dark:text-red-300"}"
            role="status"
        >
            {feedback.text}
        </p>
    {/if}

    <section class="surface mt-8 p-6">
        <div class="flex flex-wrap items-baseline justify-between gap-3">
            <h2 class="font-serif text-xl font-semibold tracking-tight">Modifications locales</h2>
            <p class="text-ink-400 text-xs">
                {formatSize( overlaySize )} utilisés dans le stockage du navigateur
            </p>
        </div>

        {#if !wiki.hasLocalChanges}
            <p class="text-ink-400 mt-4 text-sm">
                Aucune modification locale. Le site affiche exactement le JSON publié, version {wiki.meta
                    .version}, mis à jour le {formatDateTime( wiki.meta.updatedAt )}.
            </p>
        {:else}
            <p class="mt-4 text-sm">
                <strong>{wiki.localChangeCount}</strong>
                {wiki.localChangeCount === 1 ? "élément modifié" : "éléments modifiés"} en attente d'export.
            </p>

            {#if overlaySize > STORAGE_WARNING}
                <p class="bg-signal-500/15 text-signal-500 mt-4 rounded-xl px-4 py-3 text-sm">
                    Le stockage local approche de sa limite. Exportez le JSON et réinitialisez pour repartir
                    d'une base propre.
                </p>
            {/if}

            <div class="mt-5 space-y-5 text-sm">
                {#if changedEntries.length > 0}
                    <div>
                        <p class="text-ink-400 mb-2 text-xs tracking-wide uppercase">Fiches</p>
                        <ul class="space-y-1.5">
                            {#each changedEntries as entry ( entry.id )}
                                <li class="flex flex-wrap items-center gap-2">
                                    <span
                                        class="rounded-full px-2 py-0.5 text-xs {isPublished( entry.id )
                                            ? "bg-paper-200 text-ink-600 dark:bg-ink-800 dark:text-paper-300"
                                            : "bg-accent-100 text-accent-700 dark:bg-accent-900/60 dark:text-accent-200"}"
                                    >
                                        {isPublished( entry.id ) ? "modifiée" : "créée"}
                                    </span>
                                    <a href="/wiki/{entry.slug}" class="wiki-link">{entry.title}</a>
                                    {#if entry.status === "brouillon"}
                                        <span class="text-ink-400 text-xs">brouillon</span>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                {#if deletedEntries.length > 0}
                    <div>
                        <p class="text-ink-400 mb-2 text-xs tracking-wide uppercase">Fiches supprimées</p>
                        <ul class="space-y-1.5">
                            {#each deletedEntries as item ( item.id )}
                                <li class="flex items-center gap-2">
                                    <span class="bg-alert-500/15 text-alert-600 rounded-full px-2 py-0.5 text-xs dark:text-red-300">
                                        supprimée
                                    </span>
                                    <span class="line-through">{item.title}</span>
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                {#if changedCategories.length > 0}
                    <div>
                        <p class="text-ink-400 mb-2 text-xs tracking-wide uppercase">Catégories</p>
                        <ul class="flex flex-wrap gap-1.5">
                            {#each changedCategories as category ( category.slug )}
                                <li class="bg-paper-200 dark:bg-ink-800 rounded-full px-2.5 py-1 text-xs">
                                    {category.name}
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                {#if changedLive.length > 0}
                    <div>
                        <p class="text-ink-400 mb-2 text-xs tracking-wide uppercase">Fil en direct</p>
                        <p class="text-ink-500 dark:text-paper-300/80">
                            {changedLive.length}
                            {changedLive.length === 1 ? "entrée" : "entrées"} en attente.
                        </p>
                    </div>
                {/if}

                {#if wiki.overlay.meta}
                    <div>
                        <p class="text-ink-400 mb-2 text-xs tracking-wide uppercase">Identité du wiki</p>
                        <p class="text-ink-500 dark:text-paper-300/80">
                            Nom, signature, description, logo ou fiches à la une modifiés depuis
                            <a href="/parametres" class="wiki-link">les paramètres</a>.
                        </p>
                    </div>
                {/if}
            </div>
        {/if}
    </section>

    <section class="surface mt-6 p-6">
        <h2 class="font-serif text-xl font-semibold tracking-tight">Exporter</h2>
        <p class="text-ink-400 mt-2 text-sm leading-relaxed">
            L'export contient tout le contenu affiché actuellement, publié et local confondus. C'est le
            fichier à committer.
        </p>

        <div class="mt-5 flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" onclick={download}>Télécharger wiki.json</button>
            <button type="button" class="btn btn-outline" onclick={() => void copy()}>
                Copier dans le presse papier
            </button>
        </div>

        <ol class="text-ink-400 mt-6 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
            <li>Télécharger le fichier.</li>
            <li>
                Remplacer <code class="font-mono text-xs">static/data/wiki.json</code> par celui ci.
            </li>
            <li>Committer, puis relancer le build.</li>
            <li>Réinitialiser les modifications locales, devenues redondantes.</li>
        </ol>
    </section>

    <section class="surface mt-6 p-6">
        <h2 class="font-serif text-xl font-semibold tracking-tight">Importer</h2>
        <p class="text-ink-400 mt-2 text-sm leading-relaxed">
            Reprendre un export, ou récupérer le travail fait sur un autre appareil.
        </p>

        <div class="mt-5 space-y-4">
            <div>
                <label class="field-label" for="import-file">Fichier JSON</label>
                <input
                    id="import-file"
                    type="file"
                    accept="application/json,.json"
                    class="field"
                    onchange={( event ) => void onFile( event )}
                />
            </div>

            <div>
                <label class="field-label" for="import-text">Ou coller le JSON</label>
                <textarea
                    id="import-text"
                    bind:value={importText}
                    rows="5"
                    class="field resize-y font-mono text-xs"
                    placeholder="&#123; &quot;meta&quot;: ..., &quot;entries&quot;: [...] &#125;"
                ></textarea>
            </div>

            <fieldset>
                <legend class="field-label">Mode</legend>
                <div class="space-y-2 text-sm">
                    <label class="flex cursor-pointer items-start gap-2">
                        <input
                            type="radio"
                            class="accent-accent-600 mt-1"
                            checked={importMode === "fusionner"}
                            onchange={() => ( importMode = "fusionner" )}
                        />
                        <span>
                            <strong>Fusionner.</strong>
                            <span class="text-ink-400">
                                Le contenu importé s'ajoute et remplace les éléments de même identifiant.
                            </span>
                        </span>
                    </label>
                    <label class="flex cursor-pointer items-start gap-2">
                        <input
                            type="radio"
                            class="accent-accent-600 mt-1"
                            checked={importMode === "remplacer"}
                            onchange={() => ( importMode = "remplacer" )}
                        />
                        <span>
                            <strong>Remplacer.</strong>
                            <span class="text-ink-400">
                                Le site affiche exactement le contenu importé, le reste est masqué.
                            </span>
                        </span>
                    </label>
                </div>
            </fieldset>

            <button
                type="button"
                class="btn btn-primary"
                disabled={importText.trim().length === 0}
                onclick={() => ( importOpen = true )}
            >
                Importer
            </button>
        </div>
    </section>

    <section class="border-alert-500/30 mt-6 rounded-2xl border p-6">
        <h2 class="font-serif text-xl font-semibold tracking-tight">Réinitialiser</h2>
        <p class="text-ink-400 mt-2 text-sm leading-relaxed">
            Efface toutes les modifications locales et revient au JSON publié. Irréversible : exportez avant.
        </p>
        <button
            type="button"
            class="btn btn-danger mt-5"
            disabled={!wiki.hasLocalChanges}
            onclick={() => ( resetOpen = true )}
        >
            Effacer les modifications locales
        </button>
    </section>
</div>

<ConfirmDialog
    bind:open={importOpen}
    title="Importer ce JSON ?"
    message={importMode === "remplacer"
        ? "En mode remplacer, tout le contenu absent de l'import sera masqué sur le site."
        : "Le contenu importé va s'ajouter à l'existant et écraser les éléments de même identifiant."}
    confirmLabel="Importer"
    onconfirm={runImport}
/>

<ConfirmDialog
    bind:open={resetOpen}
    title="Effacer les modifications locales ?"
    message="Tout ce qui n'a pas été exporté sera perdu."
    confirmLabel="Effacer"
    danger
    onconfirm={() =>
    {
        wiki.resetLocal();
        feedback = { kind: "ok", text: "Modifications locales effacées." };
    }}
/>
