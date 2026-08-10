<script lang="ts">
    /**
     * Badge showing the kind of subject a page documents.
     *
     * In its icon only form the label is kept as screen reader text rather than
     * as a `title`: a tooltip on a `<span>` is announced inconsistently, and this
     * badge is the only thing carrying the nature of a page in the listings, the
     * search palette and the dashboard.
     *
     * @author Claude
     */
    import Badge from "flowbite-svelte/Badge.svelte";
    import { entryTypeConfig } from "$lib/config/entry-types";

    interface Props {
        type: string;
        /** Hides the text and keeps only the icon. */
        iconOnly?: boolean;
    }

    let { type, iconOnly = false }: Props = $props();

    const config = $derived( entryTypeConfig( type ) );
    const Glyph = $derived( config.icon );
</script>

<Badge class="gap-1.5 rounded-full px-2.5 py-1 text-xs {config.badge}">
    <Glyph class="h-3.5 w-3.5 shrink-0" />

    {#if iconOnly}
        <span class="sr-only">{config.label}</span>
    {:else}
        {config.label}
    {/if}
</Badge>
