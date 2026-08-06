<script lang="ts">
    /**
     * Management of the categories.
     *
     * @author Claude
     */
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { PALETTE, paletteColor } from "$lib/config/palette";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { Category } from "$lib/types";
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

    // The slug follows the name until it is edited by hand.
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
    <nav class="text-ink-400 flex flex-wrap items-center gap-2 text-sm" aria-label="Fil d'Ariane">
        <a href="/categories" class="hover:text-accent-600 dark:hover:text-accent-400">Catégories</a>
        <span aria-hidden="true">/</span>
        <span>Gestion</span>
    </nav>

    <header class="mt-4 max-w-2xl">
        <h1 class="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Gérer les catégories</h1>
        <p class="text-ink-400 mt-3 leading-relaxed">
            Renommer une catégorie déplace les fiches concernées vers la nouvelle adresse. La supprimer les
            détache sans les effacer.
        </p>
    </header>

    <div class="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="space-y-3">
            {#each wiki.categories as category ( category.slug )}
                {@const count = wiki.entriesInCategory( category.slug, true ).length}
                <article class="surface flex flex-wrap items-center gap-4 p-4">
                    <span class="h-2.5 w-2.5 shrink-0 rounded-full {paletteColor( category.color ).dot}"></span>

                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium">{category.name}</p>
                        <p class="text-ink-400 truncate font-mono text-xs">/categories/{category.slug}</p>
                        {#if category.description}
                            <p class="text-ink-400 mt-1 line-clamp-2 text-xs leading-relaxed">
                                {category.description}
                            </p>
                        {/if}
                    </div>

                    <span class="text-ink-400 text-xs">
                        {count}
                        {count === 1 ? "fiche" : "fiches"}
                    </span>

                    <div class="flex gap-1">
                        <button
                            type="button"
                            class="btn btn-outline px-3 py-1.5 text-xs"
                            onclick={() => startEdit( category )}
                        >
                            Modifier
                        </button>
                        <button
                            type="button"
                            class="btn btn-ghost hover:text-alert-500 px-3 py-1.5 text-xs"
                            onclick={() =>
                            {
                                pendingDeletion = category;
                                deleteOpen = true;
                            }}
                        >
                            Supprimer
                        </button>
                    </div>
                </article>
            {/each}

            {#if wiki.categories.length === 0}
                <p class="border-paper-300 dark:border-ink-800 text-ink-400 rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
                    Aucune catégorie pour le moment.
                </p>
            {/if}
        </div>

        <form
            class="surface space-y-4 p-5 lg:sticky lg:top-20"
            onsubmit={( event ) =>
            {
                event.preventDefault();
                submit();
            }}
        >
            <p class="text-ink-400 text-xs tracking-wide uppercase">
                {isEditing ? `Modifier « ${ editing?.name } »` : "Nouvelle catégorie"}
            </p>

            <div>
                <label class="field-label" for="category-name">Nom</label>
                <input
                    id="category-name"
                    bind:value={name}
                    type="text"
                    class="field"
                    placeholder="Sites et installations"
                    required
                />
            </div>

            <div>
                <label class="field-label" for="category-slug">Adresse</label>
                <input
                    id="category-slug"
                    bind:value={slug}
                    oninput={() => ( slugLocked = true )}
                    type="text"
                    class="field font-mono text-xs"
                    placeholder="sites-et-installations"
                />
                {#if slugTaken}
                    <p class="text-alert-500 mt-1.5 text-xs">Cette adresse est déjà utilisée.</p>
                {/if}
            </div>

            <div>
                <label class="field-label" for="category-description">Description</label>
                <textarea
                    id="category-description"
                    bind:value={description}
                    rows="3"
                    class="field resize-y"
                    placeholder="Ce que cette catégorie regroupe."
                ></textarea>
            </div>

            <div>
                <p class="field-label">Couleur</p>
                <div class="flex flex-wrap gap-1.5">
                    {#each PALETTE as option ( option.key )}
                        <button
                            type="button"
                            class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition {option.chip} {color
                              === option.key
                                ? "ring-accent-500 ring-2 ring-offset-1"
                                : "opacity-70 hover:opacity-100"}"
                            onclick={() => ( color = option.key )}
                        >
                            <span class="h-1.5 w-1.5 rounded-full {option.dot}"></span>
                            {option.label}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="flex gap-2 pt-1">
                <button type="submit" class="btn btn-primary flex-1" disabled={!canSave || slugTaken}>
                    {isEditing ? "Enregistrer" : "Créer"}
                </button>
                {#if isEditing}
                    <button type="button" class="btn btn-ghost" onclick={reset}>Annuler</button>
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
