<script lang="ts">
    /**
     * Identity of the wiki: name, description, logo, highlighted pages.
     *
     * Mounted only once the overlay has been read, so its draft starts from the
     * actual local content rather than from the always empty seed. Mounting it
     * any earlier is what used to make a saved identity look lost on a refresh:
     * the fields were seeded before `localStorage` had been read, and nothing
     * afterwards told them to catch up.
     *
     * @author Claude
     */
    import Alert from "flowbite-svelte/Alert.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Radio from "flowbite-svelte/Radio.svelte";
    import Textarea from "flowbite-svelte/Textarea.svelte";
    import { resolve } from "$app/paths";
    import { env } from "$env/dynamic/public";
    import { untrack } from "svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import FeaturedPagesEditor from "$lib/components/FeaturedPagesEditor.svelte";
    import { ACCENTS } from "$lib/config/accents";
    import { ACTION_ROW, colorPill, RADIO_OVERLAY } from "$lib/config/forms";
    import { wiki } from "$lib/state/wiki.svelte";

    /** Repository the application is built from, not part of the fiction. */
    const REPOSITORY_URL = "https://github.com/FlorianLeChat/Pericles-Initiative";

    /**
     * Tint of an accent pill.
     *
     * The stops are the accent's own, and every pill resolves them against the
     * colour it offers rather than against the one the site currently wears, since
     * each of them is nested in a `data-accent` of its own.
     */
    const ACCENT_TINT = "bg-accent-100 text-accent-700 dark:bg-accent-900/60 dark:text-accent-200";

    /** Seeded once: the form is a draft of the identity, applied on save. */
    const initial = untrack( () => ( {
        universe: wiki.meta.universe,
        description: wiki.meta.description,
        logo: wiki.meta.logo,
        accent: wiki.meta.accent,
        featured: [ ...wiki.meta.featured ]
    } ) );

    let universe = $state( initial.universe );
    let description = $state( initial.description );
    let logo = $state( initial.logo );
    let accent = $state( initial.accent );
    let featured = $state<string[]>( initial.featured );

    let resetOpen = $state( false );
    let saved = $state( false );

    const snapshot = (): string => JSON.stringify( { universe, description, logo, accent, featured } );

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
            description: description.trim(),
            logo: logo.trim(),
            accent,
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
        description = wiki.seed.meta.description;
        logo = wiki.seed.meta.logo;
        accent = wiki.seed.meta.accent;
        featured = [ ...wiki.seed.meta.featured ];
        baseline = snapshot();
        saved = false;
    };
</script>

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

        <fieldset aria-describedby="meta-accent-hint">
            <legend class="field-label">Couleur d'accentuation</legend>

            <div class="flex flex-wrap gap-1.5">
                {#each ACCENTS as option ( option.key )}
                    <div data-accent={option.key} class="contents">
                        <Radio
                            name="meta-accent"
                            value={option.key}
                            bind:group={accent}
                            onchange={() => ( saved = false )}
                            class={RADIO_OVERLAY}
                            classes={{ label: `${ colorPill( accent === option.key ) } ${ ACCENT_TINT }` }}
                        >
                            <span class="bg-accent-500 h-1.5 w-1.5 rounded-full"></span>
                            {option.label}
                        </Radio>
                    </div>
                {/each}
            </div>

            <Helper id="meta-accent-hint" class="mt-1.5 text-xs leading-relaxed">
                Elle colore les liens des articles, les boutons et le logo de l'entête.
            </Helper>
        </fieldset>

        <div>
            <p class="field-label">Aperçu de l'entête</p>

            <div
                data-accent={accent}
                class="border-paper-200 dark:border-ink-800 flex items-center gap-2.5 rounded-xl border p-3"
            >
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

        {#if hasLocalMeta}
            <Button color="red" class="sm:ml-auto" onclick={() => ( resetOpen = true )}>
                Tout remettre par défaut
            </Button>
        {/if}
    </div>
</form>

<ConfirmDialog
    bind:open={resetOpen}
    title="Tout remettre par défaut ?"
    message="Le nom, la description, le logo et les fiches à la une reviendront à leur état d'origine."
    confirmLabel="Remettre"
    danger
    onconfirm={reset}
/>
