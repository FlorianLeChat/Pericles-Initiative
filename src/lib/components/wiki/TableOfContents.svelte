<script lang="ts">
    /**
     * Table of contents built from the headings of an article, following the read.
     *
     * The section the reader is in is marked, the way a modern encyclopedia does:
     * an observer watches the headings of the body and keeps the last one that
     * crossed the top of the viewport. It is a `<details>` so a phone can fold it
     * away above the text; it opens on its own from `lg`, where it sits in a column
     * beside the body and costs the reading nothing.
     *
     * @author Claude
     */
    import { onMount } from "svelte";
    import type { Heading } from "#lib/types.ts";
    import * as m from "#lib/locales/messages.js";

    interface Props {
        headings: Heading[];
    }

    let { headings }: Props = $props();

    /** Breakpoint from which the contents stand beside the body, `lg` in Tailwind. */
    const WIDE = "(min-width: 64rem)";

    /** Band at the top of the viewport where a heading counts as the current section, below the sticky header. */
    const READING_LINE = "-96px 0px -70% 0px";

    let open = $state( false );
    let current = $state( "" );

    /** Indentation applied to a heading, by level. */
    const indent = ( level: number ): string => ( level === 2 ? "" : level === 3 ? "pl-3" : "pl-6" );

    onMount( () =>
    {
        open = window.matchMedia( WIDE ).matches;
    } );

    $effect( () =>
    {
        const targets = headings
            .map( ( heading ) => document.getElementById( heading.id ) )
            .filter( ( element ): element is HTMLElement => element !== null );

        const observer = new IntersectionObserver(
            ( records ) =>
            {
                for ( const record of records )
                {
                    if ( record.isIntersecting )
                    {
                        current = record.target.id;
                    }
                }
            },
            { rootMargin: READING_LINE }
        );

        for ( const target of targets )
        {
            observer.observe( target );
        }

        return () => observer.disconnect();
    } );
</script>

{#if headings.length > 1}
    <details
        class="group border-paper-200 dark:border-ink-800 border-t pt-4 lg:sticky lg:top-24 lg:border-t-0 lg:pt-0"
        bind:open
    >
        <summary
            class="text-ink-900 dark:text-paper-100 flex min-h-11 cursor-pointer list-none items-center justify-between
                   text-sm font-semibold lg:min-h-0 [&::-webkit-details-marker]:hidden"
        >
            {m.table_of_contents_heading()}

            <span class="text-muted text-xs font-normal group-open:hidden">{headings.length}</span>
        </summary>

        <nav class="mt-3" aria-label={m.table_of_contents_heading()}>
            <ol class="border-paper-200 dark:border-ink-800 space-y-0.5 border-l text-sm">
                {#each headings as heading ( heading.id )}
                    <li class={indent( heading.level )}>
                        <a
                            href="#{heading.id}"
                            class="-ml-px block border-l py-1 pl-3 leading-snug transition-colors {current === heading.id
                                ? "border-ink-900 text-ink-900 dark:border-paper-100 dark:text-paper-100 font-medium"
                                : "text-ink-500 hover:text-ink-900 dark:text-paper-300 dark:hover:text-paper-100 border-transparent"}"
                            aria-current={current === heading.id ? "location" : undefined}
                        >
                            {heading.text}
                        </a>
                    </li>
                {/each}
            </ol>
        </nav>
    </details>
{/if}
