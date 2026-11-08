<script lang="ts">
    /**
     * Offers to take back the deletion that has just happened, or the drafts
     * just published together from the index.
     *
     * Mounted by the root layout rather than beside the control that deletes, so
     * it survives the navigation that follows: deleting a page leaves its editor
     * for the index, and the offer has to be there when the reader lands.
     *
     * It never times out: a reader who needs longer to find the button, by
     * keyboard or through a screen reader, would lose it. It leaves when the
     * deletion is taken back, waved away, settled by any other write, or when the
     * reader leaves the page it was offered on. That last one is what keeps it
     * from sitting over the foot of every list on a phone for the rest of the
     * visit. The page it is offered on is the first one it shows on outside the
     * editor, since deleting a page always leaves the editor on its own.
     *
     * Taking the deletion back removes the toast, and the button with it, so the
     * focus is handed to the main content rather than left on nothing.
     *
     * @author Claude
     */
    import { page } from "$app/state";
    import X from "@lucide/svelte/icons/x";
    import * as m from "#lib/locales/messages.js";
    import Undo2 from "@lucide/svelte/icons/undo-2";
    import Toast from "flowbite-svelte/Toast.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { motionDuration } from "#lib/config/motion.ts";
    import { ICON_BUTTON, TOUCH_HEIGHT } from "#lib/config/forms.ts";

    /** Path of the page the offer was made on, null while there is none. */
    let offeredOn = $state<string | null>( null );

    const inEditor = $derived( page.route.id?.startsWith( "/new" ) === true || page.route.id?.startsWith( "/edit" ) === true );

    const message = $derived.by( () =>
    {
        const undoable = wiki.undoable;

        if ( !undoable )
        {
            return "";
        }

        if ( undoable.kind === "publish" )
        {
            const count = undoable.count ?? 1;

            return count === 1
                ? m.undo_toast_publish_one( { title: undoable.title } )
                : m.undo_toast_publish_other( { count } );
        }

        const sentences = {
            entry: m.undo_toast_entry,
            live: m.undo_toast_live,
            category: m.undo_toast_category
        };

        return sentences[ undoable.kind ]( { title: undoable.title } );
    } );

    $effect( () =>
    {
        const here = page.url.pathname;

        if ( !wiki.undoable )
        {
            offeredOn = null;
            return;
        }

        if ( offeredOn === null )
        {
            offeredOn = inEditor ? null : here;
            return;
        }

        if ( here !== offeredOn )
        {
            wiki.dismissUndo();
        }
    } );

    /**
     * Restores what was deleted, then moves the focus off the vanishing toast.
     *
     * @author Claude
     */
    const restore = (): void =>
    {
        wiki.undo();
        document.getElementById( "main-content" )?.focus();
    };
</script>

{#if wiki.undoable}
    <Toast
        dismissable={false}
        color="gray"
        params={{ duration: motionDuration() }}
        class="surface text-ink-800 dark:text-paper-200 pointer-events-auto max-w-sm rounded-2xl p-3 text-sm
               shadow-lg max-sm:w-full max-sm:max-w-none"
        role="status"
        aria-live="polite"
    >
        <div class="flex items-center gap-3">
            <p class="min-w-0 flex-1 leading-snug">{message}</p>

            <Button size="xs" color="alternative" class="shrink-0 gap-1.5 {TOUCH_HEIGHT}" onclick={restore}>
                <Undo2 class="h-3.5 w-3.5" />
                {m.undo_toast_restore()}
            </Button>

            <button
                type="button"
                class="text-muted hover:text-ink-800 dark:hover:text-paper-200 -mr-1 inline-flex {ICON_BUTTON} shrink-0
                       items-center justify-center rounded-full"
                aria-label={m.undo_toast_dismiss()}
                onclick={() => wiki.dismissUndo()}
            >
                <X class="h-4 w-4" />
            </button>
        </div>
    </Toast>
{/if}
