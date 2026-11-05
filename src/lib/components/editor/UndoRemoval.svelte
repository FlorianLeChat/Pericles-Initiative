<script lang="ts">
    /**
     * Says which row of the infobox card was just removed, and offers it back.
     *
     * A row goes on one press of a cross that sits a finger's width from the
     * arrows, and asking first would slow down the common case to protect the
     * rare one. The removal happens at once and is announced here instead, with
     * the way back beside it, until it is taken or another row goes.
     *
     * The status line stays mounted while empty, since a live region inserted
     * along with its text is not announced by every screen reader.
     *
     * The focus moves to the way back on every removal. The rows of the card are
     * keyed by position, so the cross that was pressed would otherwise stay
     * where it stood, now belonging to the next row, one tap from removing it too.
     *
     * @author Claude
     */
    import { tick } from "svelte";
    import * as m from "#lib/locales/messages.js";
    import Undo2 from "@lucide/svelte/icons/undo-2";
    import Button from "flowbite-svelte/Button.svelte";

    interface Props {
        /** What was removed, in a sentence, or nothing while no row is to restore. */
        message: string | null;
        onundo: () => void;
    }

    let { message, onundo }: Props = $props();

    let frame: HTMLDivElement | undefined = $state();

    $effect( () =>
    {
        if ( message !== null )
        {
            void tick().then( () => frame?.querySelector( "button" )?.focus() );
        }
    } );
</script>

<div
    bind:this={frame}
    class={message === null
        ? ""
        : "bg-paper-100 dark:bg-ink-800 mt-2 flex items-center justify-between gap-2 rounded-full py-1 pr-1 pl-3"}
>
    <p role="status" class="text-ink-600 dark:text-paper-300 min-w-0 truncate text-xs">{message ?? ""}</p>

    {#if message !== null}
        <Button color="alternative" size="xs" class="shrink-0 gap-1.5 rounded-full" onclick={onundo}>
            <Undo2 class="h-3.5 w-3.5" />
            {m.row_controls_undo()}
        </Button>
    {/if}
</div>
