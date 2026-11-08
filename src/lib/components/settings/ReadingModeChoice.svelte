<script lang="ts">
    /**
     * Whether this device reads and writes, or only reads.
     *
     * A choice of the device, like the language beside it, applied at once and
     * remembered by `reading` outside the overlay, so it needs no save and has no
     * place in the draft of the form above. Unlike the language it reloads
     * nothing: the authoring controls simply leave or come back.
     *
     * @author Claude
     */
    import { untrack } from "svelte";
    import * as m from "#lib/locales/messages.js";
    import Radio from "flowbite-svelte/Radio.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import { reading } from "#lib/state/reading.svelte.ts";
    import { filterPill, RADIO_OVERLAY } from "#lib/config/forms.ts";

    type Usage = "write" | "read";

    const USAGES: readonly { value: Usage; label: () => string }[] = [
        { value: "write", label: m.settings_form_usage_write },
        { value: "read", label: m.settings_form_usage_read }
    ];

    let usage = $state<Usage>( untrack( () => ( reading.enabled ? "read" : "write" ) ) );
</script>

<fieldset class="mt-6" aria-describedby="device-usage-hint">
    <legend class="field-label">{m.settings_form_usage_legend()}</legend>

    <div class="flex flex-wrap gap-1.5">
        {#each USAGES as option ( option.value )}
            <Radio
                name="device-usage"
                value={option.value}
                bind:group={usage}
                onchange={() => reading.set( usage === "read" )}
                class={RADIO_OVERLAY}
                classes={{ label: filterPill( usage === option.value ) }}
            >
                {option.label()}
            </Radio>
        {/each}
    </div>

    <Helper id="device-usage-hint" class="mt-1.5 max-w-help text-xs leading-relaxed">
        {m.settings_form_usage_hint()}
    </Helper>
</fieldset>
