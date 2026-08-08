<script lang="ts">
    /**
     * Table of contents built from the headings of an article.
     *
     * @author Claude
     */
    import type { Heading } from "$lib/types";

    interface Props {
        headings: Heading[];
    }

    let { headings }: Props = $props();

    /** Indentation applied to a heading, by level. */
    const indent = ( level: number ): string => ( level === 2 ? "" : level === 3 ? "pl-4" : "pl-8" );
</script>

{#if headings.length > 1}
    <nav class="surface p-5" aria-label="Sommaire">
        <p class="text-muted mb-3 text-xs tracking-wide uppercase">Sommaire</p>

        <ol class="space-y-1.5 text-sm">
            {#each headings as heading ( heading.id )}
                <li class={indent( heading.level )}>
                    <a
                        href="#{heading.id}"
                        class="text-ink-500 hover:text-accent-600 dark:text-paper-300/80 dark:hover:text-accent-400 block leading-snug"
                    >
                        {heading.text}
                    </a>
                </li>
            {/each}
        </ol>
    </nav>
{/if}
