<script lang="ts">
    /**
     * Identity of the wiki: name, tagline, description, logo, highlighted pages.
     *
     * These fields live in `meta`, so a change here is a local change like any
     * other and travels through the same export.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import { env } from "$env/dynamic/public";
    import { untrack } from "svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import FeaturedPagesEditor from "$lib/components/FeaturedPagesEditor.svelte";
    import { wiki } from "$lib/state/wiki.svelte";

    /** Repository the application is built from, not part of the fiction. */
    const REPOSITORY_URL = "https://github.com/FlorianLeChat/Pericles-Initiative";

    /** Seeded once: the form is a draft of the identity, applied on save. */
    const initial = untrack( () => ( {
        universe: wiki.meta.universe,
        tagline: wiki.meta.tagline,
        description: wiki.meta.description,
        logo: wiki.meta.logo,
        version: wiki.meta.version,
        featured: [ ...wiki.meta.featured ]
    } ) );

    let universe = $state( initial.universe );
    let tagline = $state( initial.tagline );
    let description = $state( initial.description );
    let logo = $state( initial.logo );
    let version = $state( initial.version );
    let featured = $state<string[]>( initial.featured );

    let resetOpen = $state( false );
    let saved = $state( false );

    const snapshot = (): string => JSON.stringify( { universe, tagline, description, logo, version, featured } );

    /** Last state written to the dataset, so saving clears the pending marker. */
    let baseline = $state( JSON.stringify( initial ) );

    const dirty = $derived( snapshot() !== baseline );
    const canSave = $derived( universe.trim().length > 0 );
    const hasLocalMeta = $derived( wiki.overlay.meta !== null );

    /**
     * Applies the form to the dataset.
     *
     * @author Claude
     */
    const save = (): void =>
    {
        if ( !canSave )
        {
            return;
        }

        wiki.saveMeta( {
            universe: universe.trim(),
            tagline: tagline.trim(),
            description: description.trim(),
            logo: logo.trim(),
            version: version.trim(),
            featured: [ ...featured ]
        } );

        baseline = snapshot();
        saved = true;
    };

    /**
     * Puts the form back on the default identity, before any local change.
     *
     * @author Claude
     */
    const reset = (): void =>
    {
        wiki.resetMeta();

        universe = wiki.seed.meta.universe;
        tagline = wiki.seed.meta.tagline;
        description = wiki.seed.meta.description;
        logo = wiki.seed.meta.logo;
        version = wiki.seed.meta.version;
        featured = [ ...wiki.seed.meta.featured ];
        baseline = snapshot();
        saved = false;
    };
</script>

<svelte:head>
    <title>Paramètres · {wiki.meta.universe}</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <header class="max-w-2xl">
        <h1 class="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Paramètres</h1>

        <p class="text-muted mt-3 leading-relaxed">
            L'identité du wiki. Ces champs alimentent l'entête, la page d'accueil et les métadonnées des pages. Ils
            s'exportent avec le reste du contenu.
        </p>
    </header>

    {#if saved && !dirty}
        <p
            class="bg-accent-100 text-accent-900 dark:bg-accent-900/50 dark:text-accent-100 mt-6 rounded-xl px-4 py-3 text-sm"
            role="status"
        >
            Identité enregistrée. Elle reste locale jusqu'à l'export du JSON depuis
            <a href={resolve( "/data" )} class="underline">la page Données</a>.
        </p>
    {/if}

    <form
        class="mt-8 space-y-6"
        onsubmit={( event ) =>
        {
            event.preventDefault();
            save();
        }}
    >
        <section class="surface space-y-4 p-6">
            <div>
                <label class="field-label" for="meta-universe">Nom de l'univers</label>

                <input
                    id="meta-universe"
                    bind:value={universe}
                    oninput={() => ( saved = false )}
                    type="text"
                    class="field font-serif text-lg"
                    required
                />
            </div>

            <div>
                <label class="field-label" for="meta-tagline">Signature</label>

                <input
                    id="meta-tagline"
                    bind:value={tagline}
                    oninput={() => ( saved = false )}
                    type="text"
                    class="field"
                    placeholder="Une phrase, affichée sous le titre de l'accueil"
                />
            </div>

            <div>
                <label class="field-label" for="meta-description">Description</label>

                <textarea
                    id="meta-description"
                    bind:value={description}
                    oninput={() => ( saved = false )}
                    rows="3"
                    class="field resize-y"
                    placeholder="Reprise dans les métadonnées des pages, pour le partage et le référencement."
                ></textarea>
            </div>

            <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <div>
                    <label class="field-label" for="meta-logo">Logo</label>

                    <input
                        id="meta-logo"
                        bind:value={logo}
                        oninput={() => ( saved = false )}
                        type="text"
                        class="field font-mono text-xs"
                        placeholder="/media/logo.svg"
                    />

                    <p class="text-muted mt-1.5 text-xs leading-relaxed">
                        Chemin sous <code class="font-mono">static/media/</code> ou URL absolue. Laissez vide pour garder
                        le monogramme.
                    </p>
                </div>

                <div>
                    <label class="field-label" for="meta-version">Version</label>

                    <input
                        id="meta-version"
                        bind:value={version}
                        oninput={() => ( saved = false )}
                        type="text"
                        class="field font-mono text-xs"
                    />
                </div>
            </div>

            <div>
                <p class="field-label">Aperçu de l'entête</p>

                <div class="border-paper-200 dark:border-ink-800 flex items-center gap-2.5 rounded-xl border p-3">
                    {#if logo.trim()}
                        <img src={logo} alt="" class="h-9 w-9 rounded-xl object-cover" />
                    {:else}
                        <span
                            class="bg-accent-600 grid h-9 w-9 place-items-center rounded-xl font-serif text-lg font-semibold text-white"
                            aria-hidden="true"
                        >
                            {universe.trim().charAt( 0 ).toUpperCase() || "Π"}
                        </span>
                    {/if}

                    <span>
                        <span class="block text-sm leading-tight font-semibold tracking-tight">
                            {universe.trim() || "Univers sans nom"}
                        </span>

                        <span class="text-muted block text-xs leading-tight">Encyclopédie</span>
                    </span>
                </div>
            </div>
        </section>

        <FeaturedPagesEditor bind:slugs={featured} />

        <section class="surface space-y-3 p-6" aria-labelledby="about-heading">
            <h2 id="about-heading" class="font-serif text-xl font-semibold tracking-tight">À propos</h2>

            <dl class="text-muted space-y-1.5 text-sm">
                <div class="flex gap-2">
                    <dt>Version de l'application :</dt>

                    <dd class="text-ink-600 dark:text-paper-300 font-medium">{env.PUBLIC_VERSION ?? "0.0.1"}</dd>
                </div>

                <div class="flex gap-2">
                    <dt>Code source :</dt>

                    <dd class="text-ink-600 dark:text-paper-300 font-medium">
                        <a href={REPOSITORY_URL} class="wiki-link" target="_blank" rel="noreferrer">{REPOSITORY_URL}</a>
                    </dd>
                </div>
            </dl>
        </section>

        <div class="flex flex-wrap items-center gap-3">
            <button type="submit" class="btn btn-primary" disabled={!canSave || !dirty}>Enregistrer</button>

            {#if dirty}
                <span class="text-signal-500 text-xs">Modifications non enregistrées</span>
            {/if}

            {#if hasLocalMeta}
                <button
                    type="button"
                    class="btn btn-ghost hover:text-alert-500 ml-auto"
                    onclick={() => ( resetOpen = true )}
                >
                    Revenir à l'identité par défaut
                </button>
            {/if}
        </div>
    </form>

    <p class="text-muted mt-8 text-xs">
        Identité par défaut : « {wiki.seed.meta.universe} », version {wiki.seed.meta.version}.
    </p>
</div>

<ConfirmDialog
    bind:open={resetOpen}
    title="Revenir à l'identité par défaut ?"
    message="Les modifications locales du nom, de la signature, de la description, du logo et des fiches à la une seront perdues."
    confirmLabel="Revenir"
    danger
    onconfirm={reset}
/>
