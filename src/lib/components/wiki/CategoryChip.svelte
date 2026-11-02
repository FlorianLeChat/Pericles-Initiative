<script lang="ts">
    /**
     * Clickable category pill, coloured from the palette.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import type { Category } from "#lib/types.ts";
    import Badge from "flowbite-svelte/Badge.svelte";
    import { paletteColor } from "#lib/config/palette.ts";

    interface Props {
        category: Category;
        /** Number of pages in the category, hidden when omitted. */
        count?: number;
    }

    let { category, count }: Props = $props();

    const color = $derived( paletteColor( category.color ) );
</script>

<Badge
    href={resolve( `categories/${ category.slug }/` )}
    class="gap-1.5 rounded-full px-2.5 py-1 text-xs transition hover:brightness-105 {color.chip}"
    classes={{ linkClass: "flex items-center gap-1.5" }}
>
    <span class="h-1.5 w-1.5 rounded-full {color.dot}"></span>

    {category.name}

    {#if count !== undefined}
        <span class="tabular-nums">{count}</span>
    {/if}
</Badge>
