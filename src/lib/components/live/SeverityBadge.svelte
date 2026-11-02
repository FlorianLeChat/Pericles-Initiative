<script lang="ts">
    /**
     * Badge showing the urgency of a live feed item.
     *
     * @author Claude
     */
    import Badge from "flowbite-svelte/Badge.svelte";
    import { severityConfig } from "#lib/config/severities.ts";

    interface Props {
        severity: string;
    }

    let { severity }: Props = $props();

    const config = $derived( severityConfig( severity ) );
</script>

<Badge class="rounded px-1.5 py-0.5 text-xs font-semibold {config.badge}">{config.label}</Badge>
