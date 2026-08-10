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
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import Modal from "flowbite-svelte/Modal.svelte";

    interface Props {
        open: boolean;
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        /** Styles the confirm button as destructive. */
        danger?: boolean;
        onconfirm: () => void;
    }

    let {
        open = $bindable( false ),
        title,
        message,
        confirmLabel = "Confirmer",
        cancelLabel = "Annuler",
        danger = false,
        onconfirm
    }: Props = $props();

    /**
     * Closes the dialog, then runs the action.
     *
     * @author Claude
     */
    const confirm = (): void =>
    {
        open = false;
        onconfirm();
    };
</script>

<Modal
    bind:open
    {title}
    size="xs"
    dismissable={false}
    transitionParams={{ duration: 0 }}
    class="border-paper-200 dark:border-ink-800 dark:bg-ink-900 rounded-2xl border"
    classes={{
        header: "border-paper-200 dark:border-ink-800 text-ink-900 dark:text-paper-100 font-serif",
        body: "text-ink-500 dark:text-paper-300/80 text-sm leading-relaxed",
        footer: "border-paper-200 dark:border-ink-800 justify-end"
    }}
    aria-label={title}
>
    <p>{message}</p>

    {#snippet footer()}
        <Button color="alternative" onclick={() => ( open = false )}>{cancelLabel}</Button>

        <Button color={danger ? "red" : "primary"} onclick={confirm}>{confirmLabel}</Button>
    {/snippet}
</Modal>
