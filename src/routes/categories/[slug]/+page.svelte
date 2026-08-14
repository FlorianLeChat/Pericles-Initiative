<script lang="ts">
    /**
     * Every page of one category.
     *
     * @author Claude
     */
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import Breadcrumb from "flowbite-svelte/Breadcrumb.svelte";
    import BreadcrumbItem from "flowbite-svelte/BreadcrumbItem.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import EmptyState from "$lib/components/EmptyState.svelte";
    import EntryCard from "$lib/components/EntryCard.svelte";
    import { paletteColor } from "$lib/config/palette";
    import { wiki } from "$lib/state/wiki.svelte";
    import { plural } from "$lib/utilities/plural";

    const slug = $derived( page.params.slug ?? "" );
    const category = $derived( wiki.categoriesBySlug.get( slug ) );
    const color = $derived( paletteColor( category?.color ) );
    const entries = $derived( wiki.entriesInCategory( slug, true ) );
</script>

<svelte:head>
    <title>{category?.name ?? "Catégorie inconnue"} · {wiki.meta.universe}</title>

    <meta name="description" content={category?.description ?? ""} />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <Breadcrumb ariaLabel="Fil d'Ariane" class="text-muted text-sm">
        <BreadcrumbItem href={resolve( "/categories" )}>
            {#snippet icon()}{/snippet}

            Catégories
        </BreadcrumbItem>

        <BreadcrumbItem aria-current="page">
            {#snippet icon()}
                <ChevronRight class="text-muted mx-1 h-4 w-4" />
            {/snippet}

            {category?.name ?? slug}
        </BreadcrumbItem>
    </Breadcrumb>

    {#if category}
        <header class="border-paper-200 dark:border-ink-800 mt-4 border-b pb-8">
            <span class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full {color.dot}"></span>

                <span class="text-muted text-xs tracking-wide uppercase">
                    {entries.length}
                    {plural( entries.length, "fiche" )}
                </span>
            </span>

            <h1 class="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {category.name}
            </h1>

            {#if category.description}
                <p class="text-ink-600 dark:text-paper-300 mt-4 max-w-2xl leading-relaxed">
                    {category.description}
                </p>
            {/if}
        </header>

        {#if entries.length === 0}
            <div class="mt-10">
                <EmptyState title="Catégorie vide" description="Aucune fiche ne se rattache encore à cette catégorie.">
                    <Button href={resolve( "/wiki" )} color="alternative">Parcourir l'encyclopédie</Button>
                </EmptyState>
            </div>
        {:else}
            <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {#each entries as entry, index ( entry.id )}
                    <EntryCard {entry} {index} />
                {/each}
            </div>
        {/if}
    {:else}
        <div class="mt-10">
            <EmptyState title="Catégorie inconnue" description="Aucune catégorie ne porte ce nom.">
                <Button href={resolve( "/categories" )} color="alternative">Voir les catégories</Button>
            </EmptyState>
        </div>
    {/if}
</div>
