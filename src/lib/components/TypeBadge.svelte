<script lang="ts">
    /**
     * Badge showing the kind of subject a page documents.
     *
     * @author Claude
     */
    import { entryTypeConfig } from "$lib/config/entry-types";
    import Icon from "./Icon.svelte";

    interface Props {
        type: string;
        /** Hides the text and keeps only the icon. */
        iconOnly?: boolean;
    }

    let { type, iconOnly = false }: Props = $props();

    const config = $derived( entryTypeConfig( type ) );
</script>

<span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium {config.badge}"
    title={iconOnly ? config.label : undefined}
>
    <Icon path={config.icon} class="h-3.5 w-3.5 shrink-0" />
    {#if !iconOnly}
        {config.label}
    {/if}
</span>
