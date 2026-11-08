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
     * The frame is the one thing the two pages draw differently: a card among the
     * cards of `/data`, a group among the groups of `/settings`. The content is
     * split in two blocks either way, which a card stacks and a settings group sets
     * side by side.
     *
     * Both erase something a download keeps, the pages on one side and the
     * identity of the wiki on the other, so the confirmation offers that download
     * before the button that erases.
     *
     * @author Claude
     */
    import type { Snippet } from "svelte";
    import DownloadFirst from "./DownloadFirst.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import { ACTION_BUTTON } from "#lib/config/forms.ts";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";

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
        /** Classes drawing the section around it, a card unless told otherwise. */
        frame?: string;
        /** True when the reset empties the content, which the store then sets aside. */
        replacesWiki?: boolean;
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
        frame = "surface mt-6 space-y-3 p-6",
        replacesWiki = false,
        confirmTitle,
        confirmMessage,
        confirmLabel,
        onconfirm
    }: Props = $props();

    /** Minted per instance rather than written down, since two pages mount this. */
    const headingId = $props.id();

    let confirmOpen = $state( false );
</script>

<section class={frame} aria-labelledby={headingId}>
    <div>
        <h2 id={headingId} class="section-heading">{heading}</h2>

        <p class="text-muted mt-1.5 max-w-help text-sm leading-relaxed text-pretty">{description}</p>
    </div>

    <div class="min-w-0">
        <p class="text-ink-600 dark:text-paper-300 max-w-help text-sm leading-relaxed">{@render spares()}</p>

        <Button color="red" class="mt-5 {ACTION_BUTTON}" {disabled} onclick={() => ( confirmOpen = true )}>
            {action}
        </Button>
    </div>
</section>

<ConfirmDialog
    bind:open={confirmOpen}
    title={confirmTitle}
    message={confirmMessage}
    {confirmLabel}
    danger
    {onconfirm}
>
    {#if confirmOpen}
        <DownloadFirst {replacesWiki} />
    {/if}
</ConfirmDialog>
