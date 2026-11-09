<script lang="ts">
    /**
     * Status picker of the entry form, among the settings of the page.
     *
     * A choice of one value among several is a radio group rather than a row of
     * pressed buttons: the arrows move through the options, the group is
     * announced with its label and its position, and the browser enforces that
     * exactly one stays chosen. The radio itself is hidden, the label carries the
     * appearance.
     *
     * Flowbite's `Radio` renders that pair, so the appearance goes to
     * `classes.label` and `RADIO_OVERLAY` reaches the input, which is what keeps
     * the whole pill clickable.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import Radio from "flowbite-svelte/Radio.svelte";
    import type { EntryStatus } from "#lib/types.ts";
    import { choiceColors, RADIO_OVERLAY } from "#lib/config/forms.ts";

    interface Props {
        status: EntryStatus;
    }

    let { status = $bindable() }: Props = $props();

    const STATUSES: readonly { id: EntryStatus; label: string }[] = [
        { id: "publie", label: m.status_picker_published() },
        { id: "brouillon", label: m.status_picker_draft() }
    ];
</script>

<fieldset>
    <legend class="field-label">{m.status_picker_legend()}</legend>

    <div class="flex gap-1.5">
        {#each STATUSES as option ( option.id )}
            <Radio
                data-cuelume-select
                name="entry-status"
                value={option.id}
                bind:group={status}
                class={RADIO_OVERLAY}
                classes={{
                    label: `relative flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-full px-3 sm:min-h-9
                                text-xs font-medium transition has-[:focus-visible]:outline-2
                                has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-500
                                ${ choiceColors( status === option.id ) }`
                }}
            >
                {option.label}
            </Radio>
        {/each}
    </div>
</fieldset>
