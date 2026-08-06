<script lang="ts">
    /**
     * Renders an SVG path from the configuration files as a stroked icon.
     *
     * @author Claude
     */
    interface Props {
        /** Path data drawn on a 24x24 viewBox. */
        path: string;
        /** Extra classes, typically the size. */
        class?: string;
    }

    let { path, class: className = "h-4 w-4" }: Props = $props();
</script>

<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={className}
    aria-hidden="true"
>
    <path d={path} />
</svg>
