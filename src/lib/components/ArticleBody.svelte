<script lang="ts">
    /**
     * Displays already rendered article HTML with the reading typography.
     *
     * The HTML comes from `renderArticle`, which sanitizes it and decorates the
     * internal links, so it is trusted here.
     *
     * @author Claude
     */
    interface Props {
        html: string;
    }

    let { html }: Props = $props();
</script>

<div class="article-body">
    <!-- The HTML is produced by renderArticle, which sanitizes it, so it is trusted here. -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html html}
</div>
