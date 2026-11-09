<script lang="ts">
    /**
     * Whether this device plays the sounds of the interface, or stays silent.
     *
     * A choice of the device, beside the language and the use of the device,
     * applied at once and remembered by `sound` outside the overlay. Silent is
     * the first pill because it is the default: the wiki is read at the table,
     * and a device chiming in the middle of a scene is never what a player
     * wanted. The library is fetched as this choice mounts, see `preload`.
     *
     * While the sounds are on, a second row picks their material, each choice
     * answered by a preview. Its pills carry no cue of their own: the preview is
     * the sound of the choice, and a selection cue in the material being left
     * would play first and mislead the ear.
     *
     * @author Claude
     */
    import { untrack } from "svelte";
    import * as m from "#lib/locales/messages.js";
    import Radio from "flowbite-svelte/Radio.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import { sound } from "#lib/state/sound.svelte.ts";
    import { SOUND_THEMES } from "#lib/config/sounds.ts";
    import { filterPill, RADIO_OVERLAY } from "#lib/config/forms.ts";

    type Choice = "off" | "on";

    const CHOICES: readonly { value: Choice; label: () => string }[] = [
        { value: "off", label: m.settings_form_sound_off },
        { value: "on", label: m.settings_form_sound_on }
    ];

    let choice = $state<Choice>( untrack( () => ( sound.enabled ? "on" : "off" ) ) );
    let theme = $state( untrack( () => sound.theme ) );

    $effect( () =>
    {
        sound.preload();
    } );
</script>

<fieldset class="mt-6" aria-describedby="device-sound-hint">
    <legend class="field-label">{m.settings_form_sound_legend()}</legend>

    <div class="flex flex-wrap gap-1.5">
        {#each CHOICES as option ( option.value )}
            <Radio
                data-cuelume-select
                name="device-sound"
                value={option.value}
                bind:group={choice}
                onchange={() => sound.set( choice === "on" )}
                class={RADIO_OVERLAY}
                classes={{ label: filterPill( choice === option.value ) }}
            >
                {option.label()}
            </Radio>
        {/each}
    </div>

    <Helper id="device-sound-hint" class="mt-1.5 max-w-help text-xs leading-relaxed">
        {m.settings_form_sound_hint()}
    </Helper>
</fieldset>

{#if choice === "on"}
    <fieldset class="mt-6" aria-describedby="device-sound-theme-hint">
        <legend class="field-label">{m.settings_form_sound_theme_legend()}</legend>

        <div class="flex flex-wrap gap-1.5">
            {#each SOUND_THEMES as option ( option.id )}
                <Radio
                    name="device-sound-theme"
                    value={option.id}
                    bind:group={theme}
                    onchange={() => sound.setTheme( theme )}
                    class={RADIO_OVERLAY}
                    classes={{ label: filterPill( theme === option.id ) }}
                >
                    {option.label()}
                </Radio>
            {/each}
        </div>

        <Helper id="device-sound-theme-hint" class="mt-1.5 max-w-help text-xs leading-relaxed">
            {m.settings_form_sound_theme_hint()}
        </Helper>
    </fieldset>
{/if}
