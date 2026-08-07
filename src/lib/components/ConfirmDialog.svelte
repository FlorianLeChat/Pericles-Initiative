<script lang="ts">
    /**
     * Confirmation dialog for actions that cannot be undone.
     *
     * @author Claude
     */
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

    let dialog: HTMLDialogElement | null = $state( null );

    $effect( () =>
    {
        if ( !dialog )
        {
            return;
        }

        if ( open && !dialog.open )
        {
            dialog.showModal();
        }
        else if ( !open && dialog.open )
        {
            dialog.close();
        }
    } );
</script>

<dialog
    bind:this={dialog}
    onclose={() => ( open = false )}
    class="backdrop:bg-ink-950/60 dark:bg-ink-900 border-paper-200 dark:border-ink-800 mx-auto mt-[22vh] w-[min(28rem,92vw)] rounded-2xl border bg-white p-6 shadow-2xl"
    aria-label={title}
>
    <p class="text-lg font-semibold tracking-tight">{title}</p>

    <p class="text-ink-500 dark:text-paper-300/80 mt-3 text-sm leading-relaxed">{message}</p>

    <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn btn-ghost" onclick={() => ( open = false )}>{cancelLabel}</button>

        <button
            type="button"
            class="btn {danger ? "btn-danger" : "btn-primary"}"
            onclick={() =>
            {
                open = false;
                onconfirm();
            }}
        >
            {confirmLabel}
        </button>
    </div>
</dialog>
