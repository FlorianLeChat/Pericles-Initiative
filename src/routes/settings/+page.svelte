<script lang="ts">
    /**
     * Identity of the wiki: name, tagline, description, logo, highlighted pages.
     *
     * These fields live in `meta`, so a change here is a local change like any
     * other and travels through the same export.
     *
     * @author Claude
     */
    import Alert from "flowbite-svelte/Alert.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Textarea from "flowbite-svelte/Textarea.svelte";
    import { resolve } from "$app/paths";
    import { env } from "$env/dynamic/public";
    import { untrack } from "svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import FeaturedPagesEditor from "$lib/components/FeaturedPagesEditor.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { ACTION_ROW } from "$lib/config/forms";
    import { wiki } from "$lib/state/wiki.svelte";

    /** Repository the application is built from, not part of the fiction. */
    const REPOSITORY_URL = "https://github.com/FlorianLeChat/Pericles-Initiative";

    /** Seeded once: the form is a draft of the identity, applied on save. */
    const initial = untrack( () => ( {
        universe: wiki.meta.universe,
        tagline: wiki.meta.tagline,
        description: wiki.meta.description,
        logo: wiki.meta.logo,
        featured: [ ...wiki.meta.featured ]
    } ) );

    let universe = $state( initial.universe );
    let tagline = $state( initial.tagline );
    let description = $state( initial.description );
    let logo = $state( initial.logo );
    let featured = $state<string[]>( initial.featured );

    let resetOpen = $state( false );
    let saved = $state( false );

    const snapshot = (): string => JSON.stringify( { universe, tagline, description, logo, featured } );

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
        featured = [ ...wiki.seed.meta.featured ];
        baseline = snapshot();
        saved = false;
    };
</script>

<svelte:head>
    <title>Paramètres · {wiki.meta.universe}</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <PageHeader title="Paramètres">
        {#snippet description()}
            Le nom de votre univers et la façon dont il se présente. Ces champs apparaissent dans l'entête, sur la page
            d'accueil, et quand quelqu'un partage un lien vers votre wiki.
        {/snippet}
    </PageHeader>

    {#if saved && !dirty}
        <Alert color="primary" class="mt-6 rounded-xl text-sm" role="status">
            Enregistré. Pensez à faire une copie depuis
            <a href={resolve( "/data" )} class="underline">les sauvegardes</a> pour ne rien perdre.
        </Alert>
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
                <Label for="meta-universe" class="field-label">Nom de l'univers</Label>

                <Input
                    id="meta-universe"
                    bind:value={universe}
                    oninput={() => ( saved = false )}
                    type="text"
                    class="font-serif text-lg"
                    required
                />
            </div>

            <div>
                <Label for="meta-tagline" class="field-label">Signature</Label>

                <Input
                    id="meta-tagline"
                    bind:value={tagline}
                    oninput={() => ( saved = false )}
                    type="text"
                    placeholder="Une phrase, affichée sous le titre de l'accueil"
                />
            </div>

            <div>
                <Label for="meta-description" class="field-label">Description</Label>

                <Textarea
                    id="meta-description"
                    bind:value={description}
                    oninput={() => ( saved = false )}
                    rows={3}
                    class="w-full resize-y"
                    placeholder="Quelques mots sur votre univers, affichés quand un lien est partagé."
                />
            </div>

            <div>
                <Label for="meta-logo" class="field-label">Logo</Label>

                <Input
                    id="meta-logo"
                    bind:value={logo}
                    oninput={() => ( saved = false )}
                    type="text"
                    class="font-mono text-xs"
                    aria-describedby="meta-logo-hint"
                    placeholder="https://exemple.fr/logo.png"
                />

                <Helper id="meta-logo-hint" class="mt-1.5 text-xs leading-relaxed">
                    L'adresse d'une image, en ligne ou dans les fichiers du site. Laissez vide pour garder l'initiale.
                </Helper>
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
                <div class="flex flex-wrap gap-2">
                    <dt>Version de l'application :</dt>

                    <dd class="text-ink-600 dark:text-paper-300 font-medium">{env.PUBLIC_VERSION ?? "0.0.1"}</dd>
                </div>

                <div class="flex flex-wrap gap-2">
                    <dt>Code source :</dt>

                    <dd class="text-ink-600 dark:text-paper-300 min-w-0 font-medium break-all">
                        <a href={REPOSITORY_URL} class="wiki-link" target="_blank" rel="noreferrer">{REPOSITORY_URL}</a>
                    </dd>
                </div>
            </dl>
        </section>

        <div class={ACTION_ROW}>
            <Button type="submit" color="primary" disabled={!canSave || !dirty}>Enregistrer</Button>

            {#if dirty}
                <span class="text-signal-500 text-xs">Modifications non enregistrées</span>
            {/if}

            {#if hasLocalMeta}
                <Button color="red" class="sm:ml-auto" onclick={() => ( resetOpen = true )}>
                    Tout remettre par défaut
                </Button>
            {/if}
        </div>
    </form>
</div>

<ConfirmDialog
    bind:open={resetOpen}
    title="Tout remettre par défaut ?"
    message="Le nom, la signature, la description, le logo et les fiches à la une reviendront à leur état d'origine."
    confirmLabel="Remettre"
    danger
    onconfirm={reset}
/>
