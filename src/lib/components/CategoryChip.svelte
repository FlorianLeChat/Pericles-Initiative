<script lang="ts">
    /**
     * Clickable category pill, coloured from the palette.
     *
     * @author Claude
     */
    import { paletteColor } from "$lib/config/palette";
    import type { Category } from "$lib/types";

    interface Props {
        category: Category;
        /** Number of pages in the category, hidden when omitted. */
        count?: number;
    }

    let { category, count }: Props = $props();

    const color = $derived( paletteColor( category.color ) );
</script>

<a
    href="/categories/{category.slug}"
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition hover:brightness-105 {color.chip}"
>
    <span class="h-1.5 w-1.5 rounded-full {color.dot}"></span>
    {category.name}
    {#if count !== undefined}
        <span class="opacity-70">{count}</span>
    {/if}
</a>
