<script lang="ts">
    /**
     * Confirmation dialog for actions that cannot be undone.
     *
     * Flowbite's `Modal` is a real `<dialog>` opened with `showModal`, so the top
     * layer, the inert background and the `Échap` key are the browser's own
     * behaviour rather than something reimplemented here.
     *
     * It is deliberately not `dismissable`: that flag renders Flowbite's close
     * button, whose accessible name is the English «Close» and cannot be
     * overridden through the component. The dialog is dismissed by `Échap`, by a
     * click outside, or by «Annuler», all of which stay available.
     *
     * A caller with more to show than one sentence, such as what an import is
     * about to replace, passes it as `children`: it renders under the message,
     * inside the dialog, so a control placed there acts without closing it.
     *
     * A question with a third answer, such as leaving unsaved work, passes it as
     * `secondaryLabel` and `onsecondary`. Three answers never fit one row of a
     * dialog this narrow, so they stack, the confirmation on top.
     *
     * @author Claude
     */
    import type { Snippet } from "svelte";
    import * as m from "#lib/locales/messages.js";
    import Modal from "flowbite-svelte/Modal.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import { sound } from "#lib/state/sound.svelte.ts";
    import { PAIRED_ACTION } from "#lib/config/forms.ts";
    import { MODAL_MOBILE_FULLSCREEN } from "#lib/config/dialogs.ts";

    interface Props {
        open: boolean;
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        /** Styles the confirm button as destructive. */
        danger?: boolean;
        onconfirm: () => void;
        /** Label of a third answer, between cancelling and confirming. */
        secondaryLabel?: string;
        /** Called by the third answer, after the dialog has closed. */
        onsecondary?: () => void;
        /** Optional detail rendered under the message, inside the dialog. */
        children?: Snippet;
    }

    let {
        open = $bindable( false ),
        title,
        message,
        confirmLabel = m.common_confirm(),
        cancelLabel = m.common_cancel(),
        danger = false,
        onconfirm,
        secondaryLabel,
        onsecondary,
        children
    }: Props = $props();

    const stacked = $derived( secondaryLabel !== undefined && onsecondary !== undefined );
    const answer = $derived( stacked ? "w-full" : PAIRED_ACTION );

    /**
     * Closes the dialog, then runs the action.
     *
     * @param action Action the answer stands for.
     * @author Claude
     */
    const close = ( action: () => void ): void =>
    {
        open = false;
        action();
    };
</script>

<Modal
    {@attach sound.dialog()}
    bind:open
    {title}
    size="xs"
    dismissable={false}
    transitionParams={{ duration: 0 }}
    class="border-paper-200 dark:border-ink-700 dark:bg-ink-900 rounded-2xl border {MODAL_MOBILE_FULLSCREEN}"
    classes={{
        header: "border-paper-200 dark:border-ink-700 text-ink-900 dark:text-paper-100 font-serif",
        body: "text-ink-500 dark:text-paper-300/80 text-sm leading-relaxed",
        footer: `border-paper-200 dark:border-ink-700 justify-end ${ stacked ? "flex-col-reverse items-stretch gap-2 space-x-0" : "" }`
    }}
    aria-label={title}
>
    <p>{message}</p>

    {@render children?.()}

    {#snippet footer()}
        <Button color="alternative" class={answer} onclick={() => ( open = false )}>{cancelLabel}</Button>

        {#if stacked && onsecondary}
            <Button color="alternative" class={answer} onclick={() => close( onsecondary )}>{secondaryLabel}</Button>
        {/if}

        <Button color={danger ? "red" : "primary"} class={answer} onclick={() => close( onconfirm )}>
            {confirmLabel}
        </Button>
    {/snippet}
</Modal>
