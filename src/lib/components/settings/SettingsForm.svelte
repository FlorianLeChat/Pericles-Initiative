<script lang="ts">
    /**
     * Identity of the wiki and the pages it puts forward, then the preferences of this device.
     *
     * Mounted only once the overlay has been read, so its draft starts from the
     * actual local content rather than from the always empty seed. Mounting it
     * any earlier is what used to make a saved identity look lost on a refresh:
     * the fields were seeded before `localStorage` had been read, and nothing
     * afterwards told them to catch up.
     *
     * The two groups of the draft share one save bar, sticky at the foot of the
     * form, which also carries the status of the draft. A button per group wrote
     * the same draft under two names, and the confirmation rendered above the
     * first group, a screen away from the second one.
     *
     * The language is not part of that draft. It belongs to this browser rather
     * than to the wiki, never leaves with an export, and applies at once through a
     * reload, so it stands in a group of its own after the form. That reload would
     * throw a pending draft away, which is why a change of language with unsaved
     * edits asks first.
     *
     * @author Claude
     */
    import { untrack } from "svelte";
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Radio from "flowbite-svelte/Radio.svelte";
    import { ACCENTS } from "#lib/config/accents.ts";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import Textarea from "flowbite-svelte/Textarea.svelte";
    import FeaturedPagesEditor from "./FeaturedPagesEditor.svelte";
    import HeaderPreview from "./HeaderPreview.svelte";
    import SettingsSection from "./SettingsSection.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import { getLocale, locales, setLocale } from "#lib/locales/runtime.js";
    import { ACTION_BUTTON, colorPill, filterPill, RADIO_OVERLAY } from "#lib/config/forms.ts";

    type Locale = ( typeof locales )[ number ];

    /** Reader facing name of each locale the catalogue supports. */
    const LANGUAGE_LABEL: Record<Locale, () => string> = {
        en: m.settings_form_language_en,
        fr: m.settings_form_language_fr
    };

    /**
     * Locale the language radios show as picked.
     *
     * `Radio` tracks the checked one of a group through `bind:group`, the same
     * two-way binding the accent picker uses just above, not through a `checked`
     * prop: passing one instead left every click inert, since it fought the
     * binding's own management of the input rather than driving it.
     */
    let selectedLocale = $state<Locale>( getLocale() );

    /** Locale waiting on the answer to the unsaved draft question, if any. */
    let pendingLocale = $state<Locale | null>( null );
    let languageDialogOpen = $state( false );

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
    const blocked = $derived( dirty && !canSave );

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
     * Switches the interface language, or asks first when a draft would be lost.
     *
     * The radio is put back on the current language while the question is open,
     * so it never shows a language the page is not in yet.
     *
     * @param code Locale the reader picked.
     * @author Claude
     */
    const chooseLocale = ( code: Locale ): void =>
    {
        if ( !dirty )
        {
            void setLocale( code );
            return;
        }

        selectedLocale = getLocale();
        pendingLocale = code;
        languageDialogOpen = true;
    };

    /**
     * Answers the question in favour of the new language, saving the draft when it can be saved.
     *
     * @author Claude
     */
    const confirmLocale = (): void =>
    {
        if ( pendingLocale === null )
        {
            return;
        }

        save();
        void setLocale( pendingLocale );
    };
</script>

<form
    onsubmit={( event ) =>
    {
        event.preventDefault();
        save();
    }}
>
    <SettingsSection
        heading={m.settings_identity_heading()}
        description={m.settings_identity_description()}
        class="border-t-0"
    >
        <div class="space-y-5">
            <HeaderPreview {universe} {logo} {accent} />

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
        </div>
    </SettingsSection>

    <FeaturedPagesEditor bind:slugs={featured} />

    <div
        class="border-paper-200 dark:border-ink-800 dark:bg-ink-950/95 sticky bottom-4 z-10 mb-2 flex flex-col gap-3
               rounded-xl border bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
    >
        <p class="text-muted min-h-5 text-sm" role="status">
            {#if blocked}
                {m.settings_form_name_required()}
            {:else if dirty}
                {m.settings_form_unsaved()}
            {:else if saved}
                {m.settings_form_saved_intro()}
                <a href={resolve( "/data" )} class="wiki-link">{m.common_backups_link()}</a>
                {m.settings_form_saved_outro()}
            {/if}
        </p>

        <Button type="submit" color="primary" class="shrink-0 {ACTION_BUTTON}" disabled={!canSave || !dirty}>
            {m.common_save()}
        </Button>
    </div>
</form>

<SettingsSection heading={m.settings_preferences_heading()} description={m.settings_preferences_description()}>
    <fieldset aria-describedby="meta-language-hint">
        <legend class="field-label">{m.settings_form_language_legend()}</legend>

        <div class="flex flex-wrap gap-1.5">
            {#each locales as code ( code )}
                <Radio
                    name="meta-language"
                    value={code}
                    bind:group={selectedLocale}
                    onchange={() => chooseLocale( code )}
                    class={RADIO_OVERLAY}
                    classes={{ label: filterPill( selectedLocale === code ) }}
                >
                    {LANGUAGE_LABEL[ code ]()}
                </Radio>
            {/each}
        </div>

        <Helper id="meta-language-hint" class="mt-1.5 text-xs leading-relaxed">
            {m.settings_form_language_hint()}
        </Helper>
    </fieldset>
</SettingsSection>

<ConfirmDialog
    bind:open={languageDialogOpen}
    title={canSave ? m.settings_language_save_title() : m.settings_language_discard_title()}
    message={canSave ? m.settings_language_save_message() : m.settings_language_discard_message()}
    confirmLabel={canSave ? m.settings_language_save_label() : m.settings_language_discard_label()}
    danger={!canSave}
    onconfirm={confirmLocale}
/>
