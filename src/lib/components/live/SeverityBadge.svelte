<script lang="ts">
    /**
     * Badge showing the urgency of a live feed item.
     *
     * @author Claude
     */
    import { severityConfig } from "$lib/config/severities";

    interface Props {
        severity: string;
    }

    let { severity }: Props = $props();

    const config = $derived( severityConfig( severity ) );
</script>

<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium {config.badge}">
    {config.label}
</span>
