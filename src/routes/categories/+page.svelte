<script lang="ts">
    /**
     * Overview of the categories.
     *
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import { resolve } from "$app/paths";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { staggerRank } from "$lib/config/motion";
    import { paletteColor } from "$lib/config/palette";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import { pluralize } from "$lib/utilities/plural";

    const groups = $derived(
        wiki.categories.map( ( category ) => ( {
            category,
            color: paletteColor( category.color ),
            entries: wiki.entriesInCategory( category.slug )
        } ) )
    );

    const uncategorized = $derived( wiki.publishedEntries.filter( ( entry ) => entry.categories.length === 0 ) );
</script>

<svelte:head>
    <title>{m.categories_title( { universe: wiki.meta.universe } )}</title>

    <meta name="description" content={m.categories_meta_description( { universe: wiki.meta.universe } )} />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <PageHeader title={m.common_categories_label()}>
        {#snippet description()}
            {m.categories_description()}
        {/snippet}

        {#snippet action()}
            <Button href={resolve( "/categories/manage" )} color="primary">{m.common_categories_manage_label()}</Button>
        {/snippet}
    </PageHeader>

    {#if groups.length === 0}
        <div class="mt-10">
            <EmptyState title={m.categories_empty_title()} description={m.categories_empty_description()}>
                <Button href={resolve( "/categories/manage" )} color="alternative">
                    {m.categories_create_button()}
                </Button>
            </EmptyState>
        </div>
    {:else}
        <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {#each groups as group, index ( group.category.slug )}
                <a
                    href={resolve( `/categories/${ group.category.slug }/` )}
                    class="surface surface-lift rise-in hover:border-accent-300 dark:hover:border-accent-700 group flex flex-col gap-3 p-6"
                    style="--rank: {staggerRank( index )}"
                >
                    <span class="flex items-center gap-2">
                        <span class="h-2 w-2 rounded-full {group.color.dot}"></span>

                        <span class="text-muted text-xs tracking-wide uppercase">
                            {pluralize( group.entries.length, {
                                one: m.common_count_fiche_one,
                                other: m.common_count_fiche_other
                            } )}
                        </span>
                    </span>

                    <h2
                        class="group-hover:text-accent-600 dark:group-hover:text-accent-400 font-serif text-xl font-semibold tracking-tight"
                    >
                        {group.category.name}
                    </h2>

                    {#if group.category.description}
                        <p class="text-ink-500 dark:text-paper-300/80 text-sm leading-relaxed">
                            {group.category.description}
                        </p>
                    {/if}
                </a>
            {/each}
        </div>
    {/if}

    {#if uncategorized.length > 0}
        <section class="mt-12">
            <h2 class="font-serif text-xl font-semibold tracking-tight">{m.categories_uncategorized_heading()}</h2>

            <ul class="mt-4 flex flex-wrap gap-2">
                {#each uncategorized as entry ( entry.id )}
                    <li>
                        <a
                            href={resolve( `/wiki/${ entry.slug }/` )}
                            class="border-paper-300 dark:border-ink-800 hover:border-accent-400 rounded-full border px-3 py-1.5 text-sm transition"
                        >
                            {entry.title}
                        </a>
                    </li>
                {/each}
            </ul>
        </section>
    {/if}
</div>
