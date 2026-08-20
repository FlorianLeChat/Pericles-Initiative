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
     * Both cards of the form carry their own submit button, and the two write the
     * same draft: a single one under the last card floated between panels that
     * have nothing to do with it, and read as the end of the page rather than as
     * the end of the fields it saves. The demonstration content and the about
     * panel follow the form rather than sit in it, for the same reason.
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
    import DemoContent from "./DemoContent.svelte";
    import FeaturedPagesEditor from "./FeaturedPagesEditor.svelte";
    import { ACCENTS } from "$lib/config/accents";
    import { ACTION_BUTTON, colorPill, RADIO_OVERLAY } from "$lib/config/forms";
    import * as m from "$lib/locales/messages.js";
    import { getLocale, locales, setLocale } from "$lib/locales/runtime";
    import { wiki } from "$lib/state/wiki.svelte";

    /** Reader facing name of each locale the catalogue supports. */
    const LANGUAGE_LABEL: Record<( typeof locales )[ number ], () => string> = {
        en: m.settings_form_language_en,
        fr: m.settings_form_language_fr
    };

    /**
     * Locale the language radios show as picked.
     *
     * `Radio` tracks the checked one of a group through `bind:group`, the same
     * two-way binding the accent picker uses just below, not through a `checked`
     * prop: passing one instead left every click inert, since it fought the
     * binding's own management of the input rather than driving it.
     */
    let selectedLocale = $state<( typeof locales )[ number ]>( getLocale() );

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

    let saved = $state( false );

    const snapshot = (): string => JSON.stringify( { universe, description, logo, accent, featured } );

    /** Last state written to the dataset, so saving clears the pending marker. */
    let baseline = $state( JSON.stringify( initial ) );

    const dirty = $derived( snapshot() !== baseline );
    const canSave = $derived( universe.trim().length > 0 );

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
</script>

{#if saved && !dirty}
    <Alert color="primary" class="mt-6 rounded-xl text-sm" role="status">
        {m.settings_form_saved_intro()}
        <a href={resolve( "/data" )} class="underline">{m.common_backups_link()}</a> {m.settings_form_saved_outro()}
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
            <Label for="meta-universe" class="field-label">{m.settings_form_universe_label()}</Label>

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
            <Label for="meta-description" class="field-label">{m.settings_form_description_label()}</Label>

            <Textarea
                id="meta-description"
                bind:value={description}
                oninput={() => ( saved = false )}
                rows={3}
                class="w-full resize-y"
                placeholder={m.settings_form_description_placeholder()}
            />
        </div>

        <div>
            <Label for="meta-logo" class="field-label">{m.settings_form_logo_label()}</Label>

            <Input
                id="meta-logo"
                bind:value={logo}
                oninput={() => ( saved = false )}
                type="text"
                class="font-mono text-xs"
                aria-describedby="meta-logo-hint"
                placeholder={m.settings_form_logo_placeholder()}
            />

            <Helper id="meta-logo-hint" class="mt-1.5 text-xs leading-relaxed">
                {m.settings_form_logo_hint()}
            </Helper>
        </div>

        <fieldset aria-describedby="meta-accent-hint">
            <legend class="field-label">{m.settings_form_accent_legend()}</legend>

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
                {m.settings_form_accent_hint()}
            </Helper>
        </fieldset>

        <fieldset aria-describedby="meta-language-hint">
            <legend class="field-label">{m.settings_form_language_legend()}</legend>

            <div class="flex flex-wrap gap-1.5">
                {#each locales as code ( code )}
                    <Radio
                        name="meta-language"
                        value={code}
                        bind:group={selectedLocale}
                        onchange={() => setLocale( code )}
                        class={RADIO_OVERLAY}
                        classes={{ label: colorPill( selectedLocale === code ) }}
                    >
                        {LANGUAGE_LABEL[ code ]()}
                    </Radio>
                {/each}
            </div>

            <Helper id="meta-language-hint" class="mt-1.5 text-xs leading-relaxed">
                {m.settings_form_language_hint()}
            </Helper>
        </fieldset>

        <div>
            <p class="field-label">{m.settings_form_preview_label()}</p>

            <div
                data-accent={accent}
                class="border-paper-200 dark:border-ink-800 flex items-center gap-2.5 rounded-xl border p-3"
            >
                {#if logo.trim()}
                    <img src={logo} alt="" class="h-9 w-9 rounded-xl object-cover" loading="lazy" decoding="async" />
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
                        {universe.trim() || m.settings_form_unnamed_universe()}
                    </span>

                    <span class="text-muted block text-xs leading-tight">{m.common_encyclopedia_tagline()}</span>
                </span>
            </div>
        </div>

        <Button type="submit" color="primary" class={ACTION_BUTTON} disabled={!canSave || !dirty}>{m.common_save()}</Button>
    </section>

    <FeaturedPagesEditor bind:slugs={featured}>
        {#snippet actions()}
            <Button type="submit" color="primary" class={ACTION_BUTTON} disabled={!canSave || !dirty}>
                {m.common_confirm()}
            </Button>
        {/snippet}
    </FeaturedPagesEditor>
</form>

<DemoContent />

<section class="surface mt-6 space-y-3 p-6" aria-labelledby="about-heading">
    <h2 id="about-heading" class="font-serif text-xl font-semibold tracking-tight">{m.settings_form_about_heading()}</h2>

    <dl class="text-muted space-y-1.5 text-sm">
        <div class="flex flex-wrap gap-2">
            <dt>{m.settings_form_version_label()}</dt>

            <dd class="text-ink-600 dark:text-paper-300 font-medium">{env.PUBLIC_VERSION ?? "0.0.1"}</dd>
        </div>

        <div class="flex flex-wrap gap-2">
            <dt>{m.settings_form_source_label()}</dt>

            <dd class="text-ink-600 dark:text-paper-300 min-w-0 font-medium break-all">
                <a href={REPOSITORY_URL} class="wiki-link" target="_blank" rel="noreferrer">{REPOSITORY_URL}</a>
            </dd>
        </div>
    </dl>
</section>
