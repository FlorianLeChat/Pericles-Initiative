<script lang="ts">
    /**
     * Panel offering one irreversible reset, and the confirmation guarding it.
     *
     * There are two of them, on two pages, and they undo the two disjoint halves
     * of what a browser holds: `/data` clears the encyclopedia and spares the
     * settings, `/settings` puts the settings back and spares the encyclopedia.
     * The pair was easy to mistake for one another while one was a bordered panel
     * and the other a red button at the foot of a form, so they are now the same
     * card, each stating in the same place what it leaves alone and where the
     * other half is handled.
     *
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import type { Snippet } from "svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { ACTION_BUTTON } from "$lib/config/forms";

    interface Props {
        /** Names what this card resets. */
        heading: string;
        /** What the reset removes, and what to do before pressing it. */
        description: string;
        /** What it spares, and a link to the page undoing that other half. */
        spares: Snippet;
        /** Label of the button opening the confirmation. */
        action: string;
        /** True when there is nothing left to reset. */
        disabled?: boolean;
        confirmTitle: string;
        confirmMessage: string;
        confirmLabel: string;
        onconfirm: () => void;
    }

    let {
        heading,
        description,
        spares,
        action,
        disabled = false,
        confirmTitle,
        confirmMessage,
        confirmLabel,
        onconfirm
    }: Props = $props();

    /** Minted per instance rather than written down, since two pages mount this. */
    const headingId = $props.id();

    let confirmOpen = $state( false );
</script>

<section class="border-alert-500/30 mt-6 rounded-2xl border p-6" aria-labelledby={headingId}>
    <h2 id={headingId} class="font-serif text-xl font-semibold tracking-tight">{heading}</h2>

    <p class="text-muted mt-2 text-sm leading-relaxed">{description}</p>

    <p class="text-ink-600 dark:text-paper-300 mt-3 text-sm leading-relaxed">{@render spares()}</p>

    <Button color="red" class="mt-5 {ACTION_BUTTON}" {disabled} onclick={() => ( confirmOpen = true )}>
        {action}
    </Button>
</section>

<ConfirmDialog
    bind:open={confirmOpen}
    title={confirmTitle}
    message={confirmMessage}
    {confirmLabel}
    danger
    {onconfirm}
/>
