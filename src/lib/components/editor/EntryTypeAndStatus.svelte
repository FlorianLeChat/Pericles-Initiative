<script lang="ts">
    /**
     * Nature and status pickers of the entry form, as two panels of its options.
     *
     * Both are a choice of one value among several, so both are radio groups
     * rather than rows of pressed buttons: the arrows move through the options,
     * the group is announced with its label and its position, and the browser
     * enforces that exactly one stays chosen. The radio itself is hidden, the
     * label carries the appearance.
     *
     * Flowbite's `Radio` renders that pair, so the appearance goes to
     * `classes.label` and `RADIO_OVERLAY` reaches the input, which is what keeps
     * the whole pill clickable.
     *
     * The panels are closed on arrival, so the chosen value is written in each
     * header: a nature nobody can see is a nature nobody checks.
     *
     * @author Claude
     */
    import Radio from "flowbite-svelte/Radio.svelte";
    import { ENTRY_TYPES, entryTypeConfig } from "$lib/config/entry-types";
    import { RADIO_OVERLAY } from "$lib/config/forms";
    import type { EntryStatus, EntryType } from "$lib/types";
    import OptionPanel from "./OptionPanel.svelte";

    interface Props {
        type: EntryType;
        status: EntryStatus;
    }

    let { type = $bindable(), status = $bindable() }: Props = $props();

    const STATUSES: readonly { id: EntryStatus; label: string }[] = [
        { id: "publie", label: "Publiée" },
        { id: "brouillon", label: "Brouillon" }
    ];

    const chosenStatus = $derived( STATUSES.find( ( option ) => option.id === status )?.label ?? "" );

    /** Appearance of one option, which only depends on whether it is the chosen one. */
    const optionClass = ( chosen: boolean ): string =>
        chosen
            ? "bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900"
            : "bg-paper-100 text-ink-600 dark:bg-ink-800 dark:text-paper-300";
</script>

<OptionPanel label="Nature" value={entryTypeConfig( type ).label}>
    <fieldset>
        <legend class="sr-only">Nature de la fiche</legend>

        <div class="grid grid-cols-2 gap-1.5">
            {#each ENTRY_TYPES as config ( config.id )}
                <Radio
                    name="entry-type"
                    value={config.id}
                    bind:group={type}
                    class={RADIO_OVERLAY}
                    classes={{
                        label: `relative flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-2.5
                                text-center text-xs font-medium transition has-[:focus-visible]:outline-2
                                has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-500
                                ${ optionClass( type === config.id ) }`
                    }}
                >
                    {config.label}
                </Radio>
            {/each}
        </div>
    </fieldset>
</OptionPanel>

<OptionPanel label="Statut" value={chosenStatus}>
    <fieldset>
        <legend class="sr-only">Statut de la fiche</legend>

        <div class="flex gap-1.5">
            {#each STATUSES as option ( option.id )}
                <Radio
                    name="entry-status"
                    value={option.id}
                    bind:group={status}
                    class={RADIO_OVERLAY}
                    classes={{
                        label: `relative flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl px-3
                                text-xs font-medium transition has-[:focus-visible]:outline-2
                                has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-500
                                ${ optionClass( status === option.id ) }`
                    }}
                >
                    {option.label}
                </Radio>
            {/each}
        </div>
    </fieldset>
</OptionPanel>
