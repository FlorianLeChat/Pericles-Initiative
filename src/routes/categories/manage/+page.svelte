<script lang="ts">
    /**
     * Management of the categories.
     *
     * @author Claude
     */
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import Breadcrumb from "flowbite-svelte/Breadcrumb.svelte";
    import BreadcrumbItem from "flowbite-svelte/BreadcrumbItem.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Radio from "flowbite-svelte/Radio.svelte";
    import Textarea from "flowbite-svelte/Textarea.svelte";
    import { resolve } from "$app/paths";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import { colorPill, RADIO_OVERLAY } from "$lib/config/forms";
    import { PALETTE, paletteColor } from "$lib/config/palette";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { Category } from "$lib/types";
    import { plural } from "$lib/utilities/plural";
    import { slugify } from "$lib/utilities/slug";

    let editing = $state<Category | null>( null );
    let name = $state( "" );
    let slug = $state( "" );
    let description = $state( "" );
    let color = $state( "bleu" );
    let slugLocked = $state( false );

    let pendingDeletion = $state<Category | null>( null );
    let deleteOpen = $state( false );

    const isEditing = $derived( editing !== null );
    const canSave = $derived( name.trim().length > 0 );

    const slugTaken = $derived.by( () =>
    {
        const candidate = slugify( slug || name );
        if ( !candidate )
        {
            return false;
        }

        const owner = wiki.categoriesBySlug.get( candidate );
        return owner !== undefined && owner.slug !== editing?.slug;
    } );

    $effect( () =>
    {
        if ( !slugLocked )
        {
            slug = name.trim() ? slugify( name ) : "";
        }
    } );

    /**
     * Resets the form back to creation mode.
     *
     * @author Claude
     */
    const reset = (): void =>
    {
        editing = null;
        name = "";
        slug = "";
        description = "";
        color = "bleu";
        slugLocked = false;
    };

    /**
     * Loads a category into the form.
     *
     * @param category Category to edit.
     * @author Claude
     */
    const startEdit = ( category: Category ): void =>
    {
        editing = category;
        name = category.name;
        slug = category.slug;
        description = category.description;
        color = category.color;
        slugLocked = true;
    };

    /**
     * Saves the form, creating or updating a category.
     *
     * @author Claude
     */
    const submit = (): void =>
    {
        if ( !canSave )
        {
            return;
        }

        wiki.saveCategory(
            {
                slug: slugify( slug || name ),
                name: name.trim(),
                description: description.trim(),
                color,
                parent: null
            },
            editing?.slug
        );

        reset();
    };

    /**
     * Deletes the pending category and detaches it from every page.
     *
     * @author Claude
     */
    const confirmDeletion = (): void =>
    {
        if ( !pendingDeletion )
        {
            return;
        }

        wiki.deleteCategory( pendingDeletion.slug );
        if ( editing?.slug === pendingDeletion.slug )
        {
            reset();
        }
        pendingDeletion = null;
    };
</script>

<svelte:head>
    <title>Gérer les catégories · {wiki.meta.universe}</title>
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

            Gestion
        </BreadcrumbItem>
    </Breadcrumb>

    <div class="mt-4">
        <PageHeader title="Gérer les catégories">
            {#snippet description()}
                Renommer une catégorie déplace les fiches concernées vers la nouvelle adresse. La supprimer les détache
                sans les effacer.
            {/snippet}
        </PageHeader>
    </div>

    <div class="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="space-y-3">
            {#each wiki.categories as category ( category.slug )}
                {@const count = wiki.entriesInCategory( category.slug, true ).length}

                <article class="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                    <div class="flex min-w-0 flex-1 items-start gap-3">
                        <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full {paletteColor( category.color ).dot}"
                        ></span>

                        <div class="min-w-0">
                            <p class="text-sm font-medium">{category.name}</p>

                            <p class="text-muted truncate font-mono text-xs">/categories/{category.slug}</p>

                            {#if category.description}
                                <p class="text-muted mt-1 line-clamp-2 text-xs leading-relaxed">
                                    {category.description}
                                </p>
                            {/if}
                        </div>
                    </div>

                    <div class="flex shrink-0 items-center gap-2">
                        <span class="text-muted mr-auto text-xs sm:mr-0">
                            {count}
                            {plural( count, "fiche" )}
                        </span>

                        <Button
                            color="alternative"
                            size="xs"
                            class="rounded-full"
                            onclick={() => startEdit( category )}
                            aria-label="Modifier la catégorie {category.name}"
                        >
                            Modifier
                        </Button>

                        <Button
                            color="alternative"
                            size="xs"
                            class="hover:text-alert-500 rounded-full border-0"
                            onclick={() =>
                            {
                                pendingDeletion = category;
                                deleteOpen = true;
                            }}
                            aria-label="Supprimer la catégorie {category.name}"
                        >
                            Supprimer
                        </Button>
                    </div>
                </article>
            {/each}

            {#if wiki.categories.length === 0}
                <p
                    class="border-paper-300 dark:border-ink-800 text-muted rounded-2xl border border-dashed px-6 py-10 text-center text-sm"
                >
                    Aucune catégorie pour le moment.
                </p>
            {/if}
        </div>

        <!--
            First on a phone, where this column would otherwise sit under the
            whole list: creating a category is what this page is for, and pressing
            «Modifier» on a card scrolled the form off screen rather than to it.
        -->
        <form
            class="surface order-first space-y-4 p-5 lg:order-none lg:sticky lg:top-20"
            onsubmit={( event ) =>
            {
                event.preventDefault();
                submit();
            }}
        >
            <p class="text-muted text-xs tracking-wide uppercase">
                {isEditing ? `Modifier « ${ editing?.name } »` : "Nouvelle catégorie"}
            </p>

            <div>
                <Label for="category-name" class="field-label">Nom</Label>

                <Input id="category-name" bind:value={name} type="text" placeholder="Sites et installations" required />
            </div>

            <div>
                <Label for="category-slug" class="field-label">Adresse</Label>

                <Input
                    id="category-slug"
                    bind:value={slug}
                    oninput={() => ( slugLocked = true )}
                    type="text"
                    class="font-mono text-xs"
                    color={slugTaken ? "red" : "default"}
                    aria-invalid={slugTaken}
                    aria-describedby={slugTaken ? "category-slug-taken" : undefined}
                    placeholder="sites-et-installations"
                />

                {#if slugTaken}
                    <Helper id="category-slug-taken" color="red" class="mt-1.5 text-xs">
                        Cette adresse est déjà utilisée.
                    </Helper>
                {/if}
            </div>

            <div>
                <Label for="category-description" class="field-label">Description</Label>

                <Textarea
                    id="category-description"
                    bind:value={description}
                    rows={3}
                    class="w-full resize-y"
                    placeholder="Ce que cette catégorie regroupe."
                />
            </div>

            <fieldset>
                <legend class="field-label">Couleur</legend>

                <div class="flex flex-wrap gap-1.5">
                    {#each PALETTE as option ( option.key )}
                        <Radio
                            name="category-color"
                            value={option.key}
                            bind:group={color}
                            class={RADIO_OVERLAY}
                            classes={{ label: `${ colorPill( color === option.key ) } ${ option.chip }` }}
                        >
                            <span class="h-1.5 w-1.5 rounded-full {option.dot}"></span>
                            {option.label}
                        </Radio>
                    {/each}
                </div>
            </fieldset>

            <div class="flex gap-2 pt-1">
                <Button type="submit" color="primary" class="flex-1" disabled={!canSave || slugTaken}>
                    {isEditing ? "Enregistrer" : "Créer"}
                </Button>

                {#if isEditing}
                    <Button color="alternative" class="border-0" onclick={reset}>Annuler</Button>
                {/if}
            </div>
        </form>
    </div>
</div>

<ConfirmDialog
    bind:open={deleteOpen}
    title="Supprimer cette catégorie ?"
    message="Les fiches qui l'utilisent seront détachées, aucune fiche ne sera supprimée."
    confirmLabel="Supprimer"
    danger
    onconfirm={confirmDeletion}
/>
