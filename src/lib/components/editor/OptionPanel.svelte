<script lang="ts">
    /**
     * One collapsible group of options of the entry form.
     *
     * The six groups used to be six open cards stacked down the side of the
     * editor, which made the column of settings twice as tall as the page being
     * written, and on a phone pushed the body of the fiche above a screen and a
     * half of controls. They are the rows of one accordion now, closed on
     * arrival, and each row states its own value so that nothing has to be
     * opened to be read.
     *
     * A `<legend>` is what a group of radios or of checkboxes wants as a name,
     * and it is also what made those cards look so padded: a legend is laid out
     * in the top border of its fieldset, so its own height and margin stack on
     * top of the padding of the box, and every card carried some fifty pixels of
     * nothing above its first control. The name is worn by the header here, and
     * the fieldsets inside keep a hidden legend for the same purpose.
     *
     * Flowbite's `AccordionItem` draws the row. Everything handed to it below is
     * a correction: `p-5` on a card reads as breathing room and on a row as a
     * gap, its open and closed states are painted from the gray scale, and its
     * chevron is an inline svg the site cannot restyle. The bottom border is the
     * library's own, dropped on the last row only while it is closed, where it
     * would otherwise double the border of the card.
     *
     * @author Claude
     */
    import ChevronDown from "@lucide/svelte/icons/chevron-down";
    import ChevronUp from "@lucide/svelte/icons/chevron-up";
    import AccordionItem from "flowbite-svelte/AccordionItem.svelte";
    import type { Snippet } from "svelte";
    import { motionDuration } from "$lib/config/motion";

    interface Props {
        /** Name of the group, worn by the header. */
        label: string;
        /** What the group currently holds, readable without opening it. */
        value: string;
        /** The controls of the group. */
        children: Snippet;
    }

    let { label, value, children }: Props = $props();
</script>

<AccordionItem
    classes={{
        button: `border-paper-200 dark:border-ink-800 hover:bg-paper-100/60 dark:hover:bg-ink-800/40 gap-3 px-4
                 py-3 text-left transition group-last:border-b-0`,
        content: "border-b-0 px-4 pt-3 pb-4"
    }}
    transitionParams={{ duration: motionDuration() }}
>
    {#snippet header()}
        <span class="flex min-w-0 flex-1 items-baseline justify-between gap-3">
            <span class="text-muted text-xs tracking-wide uppercase">{label}</span>

            <span class="text-ink-600 dark:text-paper-300 truncate text-sm font-normal">{value}</span>
        </span>
    {/snippet}

    {#snippet arrowdown()}
        <ChevronDown class="text-muted h-4 w-4 shrink-0" />
    {/snippet}

    {#snippet arrowup()}
        <ChevronUp class="text-muted h-4 w-4 shrink-0" />
    {/snippet}

    {@render children()}
</AccordionItem>
