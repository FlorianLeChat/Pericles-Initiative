<script lang="ts">
    /**
     * Badge showing the urgency of a live feed item.
     *
     * @author Claude
     */
    import Badge from "flowbite-svelte/Badge.svelte";
    import { severityConfig } from "$lib/config/severities";

    interface Props {
        severity: string;
    }

    let { severity }: Props = $props();

    const config = $derived( severityConfig( severity ) );
</script>

<Badge class="rounded-full px-2.5 py-1 text-xs {config.badge}">{config.label}</Badge>
