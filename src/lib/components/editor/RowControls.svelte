<script lang="ts">
    /**
     * Controls of one row of the infobox card: link, move up, move down, remove.
     *
     * Shared by the dates and the free rows, which are written the same way. Under
     * a mouse they stay out of sight until the row is pointed at or holds the
     * focus, so a filled card reads like the infobox it will become. A finger has
     * no hover, and four controls drawn on every row crowded a phone with a column
     * of crosses, so there they show on the active row only: the last one touched,
     * kept by the editor rather than read from the focus, since a tapped button
     * takes no focus on iOS and the controls would vanish under the finger. Each
     * control is named after the row it acts on, since «Monter» repeated down a
     * column tells a screen reader nothing.
     *
     * @author Claude
     */
    import X from "@lucide/svelte/icons/x";
    import Link from "@lucide/svelte/icons/link";
    import * as m from "#lib/locales/messages.js";
    import Button from "flowbite-svelte/Button.svelte";
    import ArrowUp from "@lucide/svelte/icons/arrow-up";
    import ArrowDown from "@lucide/svelte/icons/arrow-down";

    interface Props {
        /** Name of the row, read out in the name of every control. */
        name: string;
        first: boolean;
        last: boolean;
        /** Called with -1 to move the row up, 1 to move it down. */
        onmove: ( offset: number ) => void;
        onremove: () => void;
        /** Offers to link a page from the value, when the row accepts one. */
        onlink?: () => void;
        /** Whether this is the row last touched, the only one whose controls a touch screen draws. */
        active: boolean;
    }

    let { name, first, last, onmove, onremove, onlink, active }: Props = $props();

    const CONTROL = "text-ink-500 dark:text-paper-400 h-9 w-9 shrink-0 border-0 bg-transparent dark:bg-transparent p-0";
</script>

<div
    class="flex shrink-0 transition-opacity pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100
           pointer-fine:group-hover:opacity-100 {active ? "" : "pointer-coarse:hidden"}"
>
    {#if onlink}
        <Button color="alternative" class={CONTROL} onclick={onlink} aria-label={m.row_controls_link( { name } )}>
            <Link class="h-4 w-4" />
        </Button>
    {/if}

    <Button
        color="alternative"
        class={CONTROL}
        onclick={() => onmove( -1 )}
        disabled={first}
        aria-label={m.common_move_up( { name } )}
    >
        <ArrowUp class="h-4 w-4" />
    </Button>

    <Button
        color="alternative"
        class={CONTROL}
        onclick={() => onmove( 1 )}
        disabled={last}
        aria-label={m.common_move_down( { name } )}
    >
        <ArrowDown class="h-4 w-4" />
    </Button>

    <Button
        color="alternative"
        class="{CONTROL} hover:text-alert-500"
        onclick={onremove}
        aria-label={m.common_delete_row( { name } )}
    >
        <X class="h-4 w-4" />
    </Button>
</div>
