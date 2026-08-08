<script lang="ts">
    /**
     * Creation and edition form of a page.
     *
     * @author Claude
     */
    import { beforeNavigate, goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { untrack } from "svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { Entry, EntryStatus, EntryType, InfoboxField } from "$lib/types";
    import { slugify } from "$lib/utilities/slug";
    import ChipsInput from "./ChipsInput.svelte";
    import EntryImageFields from "./EntryImageFields.svelte";
    import EntryTypeAndStatus from "./EntryTypeAndStatus.svelte";
    import InfoboxEditor from "./InfoboxEditor.svelte";
    import MarkdownEditor from "./MarkdownEditor.svelte";

    interface Props {
        /** Page being edited, absent when creating one. */
        entry?: Entry;
        /** Slug imposed by the caller, typically coming from a red link. */
        initialSlug?: string;
        initialTitle?: string;
    }

    let { entry, initialSlug = "", initialTitle = "" }: Props = $props();

    /**
     * The form is a snapshot: it is seeded once from the props, and the parent
     * remounts it with `{#key}` when another page has to be edited. Reading the
     * props untracked states that intent instead of tripping over it.
     */
    const initial = untrack( () => ( {
        title: entry?.title ?? initialTitle,
        slug: entry?.slug ?? initialSlug,
        type: entry?.type ?? ( "personnage" as EntryType ),
        summary: entry?.summary ?? "",
        body: entry?.body ?? "",
        categories: [ ...( entry?.categories ?? [] ) ],
        infobox: ( entry?.infobox ?? [] ).map( ( field ) => ( { ...field } ) ),
        imageSrc: entry?.image?.src ?? "",
        imageAlt: entry?.image?.alt ?? "",
        imageCaption: entry?.image?.caption ?? "",
        timelineDate: entry?.timelineDate ?? "",
        aliases: [ ...( entry?.aliases ?? [] ) ],
        status: entry?.status ?? ( "publie" as EntryStatus ),
        /** The slug stops following the title as soon as it is known. */
        slugLocked: Boolean( entry ?? initialSlug )
    } ) );

    let title = $state( initial.title );
    let slug = $state( initial.slug );
    let type = $state<EntryType>( initial.type );
    let summary = $state( initial.summary );
    let body = $state( initial.body );
    let categories = $state<string[]>( initial.categories );
    let infobox = $state<InfoboxField[]>( initial.infobox );
    let imageSrc = $state( initial.imageSrc );
    let imageAlt = $state( initial.imageAlt );
    let imageCaption = $state( initial.imageCaption );
    let timelineDate = $state( initial.timelineDate );
    let aliases = $state<string[]>( initial.aliases );
    let status = $state<EntryStatus>( initial.status );
    let slugLocked = $state( initial.slugLocked );

    let deleteOpen = $state( false );
    let leaving = $state( false );

    /**
     * Serialises the form, to detect unsaved changes.
     *
     * @returns A comparable representation of every field.
     * @author Claude
     */
    const snapshot = (): string =>
        JSON.stringify( {
            title,
            slug,
            type,
            summary,
            body,
            categories,
            infobox,
            imageSrc,
            imageAlt,
            imageCaption,
            timelineDate,
            aliases,
            status,
            slugLocked
        } );

    const initialSnapshot = JSON.stringify( initial );

    const dirty = $derived( snapshot() !== initialSnapshot );
    const canSave = $derived( title.trim().length > 0 );

    /** Another page already uses this slug, so a suffix will be added on save. */
    const slugTaken = $derived.by( () =>
    {
        const candidate = slug.trim();
        if ( !candidate )
        {
            return false;
        }

        const owner = wiki.bySlug( candidate );
        return owner !== undefined && owner.id !== entry?.id;
    } );

    // The slug follows the title until it is edited by hand.
    $effect( () =>
    {
        if ( !slugLocked )
        {
            slug = title.trim() ? slugify( title ) : "";
        }
    } );

    beforeNavigate( ( navigation ) =>
    {
        if ( !dirty || leaving )
        {
            return;
        }

        if ( !confirm( "Des modifications ne sont pas enregistrées. Quitter quand même l'éditeur ?" ) )
        {
            navigation.cancel();
        }
    } );

    /**
     * Saves the page and opens it.
     *
     * @author Claude
     */
    const save = (): void =>
    {
        if ( !canSave )
        {
            return;
        }

        const saved = wiki.saveEntry( {
            id: entry?.id,
            createdAt: entry?.createdAt,
            title: title.trim(),
            slug: slug.trim() || slugify( title ),
            type,
            summary: summary.trim(),
            body,
            categories: [ ...categories ],
            infobox: infobox.filter( ( field ) => field.label.trim() !== "" || field.value.trim() !== "" ),
            image: imageSrc.trim()
                ? { src: imageSrc.trim(), alt: imageAlt.trim(), caption: imageCaption.trim() || undefined }
                : null,
            timelineDate: timelineDate.trim() || null,
            aliases: [ ...aliases ],
            status
        } );

        leaving = true;
        void goto( resolve( `/wiki/${ saved.slug }` ) );
    };

    /**
     * Deletes the page and goes back to the index.
     *
     * @author Claude
     */
    const remove = (): void =>
    {
        if ( !entry )
        {
            return;
        }

        wiki.deleteEntry( entry.id );
        leaving = true;
        void goto( resolve( "/wiki" ) );
    };

    /**
     * Adds or removes a category.
     *
     * @param slugToToggle Category slug.
     * @author Claude
     */
    const toggleCategory = ( slugToToggle: string ): void =>
    {
        categories = categories.includes( slugToToggle )
            ? categories.filter( ( item ) => item !== slugToToggle )
            : [ ...categories, slugToToggle ];
    };
</script>

<form
    class="mx-auto max-w-6xl px-4 py-8 sm:px-6"
    onsubmit={( event ) =>
    {
        event.preventDefault();
        save();
    }}
>
    <div
        class="border-paper-200 dark:border-ink-800 dark:bg-ink-950/80 sticky top-16 z-30 -mx-4 mb-8 flex flex-wrap items-center gap-3 border-b bg-paper-50/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
    >
        <div class="min-w-0 flex-1">
            <p class="text-muted text-xs tracking-wide uppercase">
                {entry ? "Modifier une fiche" : "Nouvelle fiche"}
            </p>

            <p class="truncate text-sm font-medium">{title.trim() || "Sans titre"}</p>
        </div>

        {#if dirty}
            <span class="text-signal-500 text-xs">Modifications non enregistrées</span>
        {/if}

        {#if entry}
            <button type="button" class="btn btn-ghost hover:text-alert-500" onclick={() => ( deleteOpen = true )}>
                Supprimer
            </button>
        {/if}

        <a href={resolve( entry ? `/wiki/${ entry.slug }` : "/wiki" )} class="btn btn-outline">Annuler</a>

        <button type="submit" class="btn btn-primary" disabled={!canSave}>Enregistrer</button>
    </div>

    <div class="space-y-4">
        <div>
            <label class="field-label" for="entry-title">Titre</label>

            <input
                id="entry-title"
                bind:value={title}
                type="text"
                class="field font-serif text-xl"
                placeholder="Nom du personnage, du lieu, de l'événement..."
                required
            />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
            <div>
                <label class="field-label" for="entry-slug">
                    Adresse de la page
                    {#if !slugLocked}
                        <span class="text-muted font-normal">suit le titre</span>
                    {/if}
                </label>

                <div class="flex items-center gap-2">
                    <span class="text-muted shrink-0 font-mono text-sm">/wiki/</span>

                    <input
                        id="entry-slug"
                        bind:value={slug}
                        oninput={() => ( slugLocked = true )}
                        onblur={() => ( slug = slug.trim() ? slugify( slug ) : "" )}
                        type="text"
                        class="field font-mono text-sm"
                        placeholder="adresse-de-la-page"
                    />
                </div>

                {#if slugTaken}
                    <p class="text-signal-500 mt-1.5 text-xs">
                        Cette adresse est déjà prise, un suffixe sera ajouté à l'enregistrement.
                    </p>
                {/if}
            </div>

            <div>
                <label class="field-label" for="entry-date">Date dans l'univers</label>

                <input
                    id="entry-date"
                    bind:value={timelineDate}
                    type="text"
                    class="field"
                    placeholder="2025-04-02, ou Juin 2043"
                />

                <p class="text-muted mt-1.5 text-xs">
                    Facultatif. Une date ISO alimente la chronologie, un texte libre est accepté.
                </p>
            </div>
        </div>

        <div>
            <label class="field-label" for="entry-summary">Résumé</label>

            <textarea
                id="entry-summary"
                bind:value={summary}
                rows="2"
                class="field resize-y"
                placeholder="Une ou deux phrases, en texte brut, reprises dans les listes et les résultats de recherche."
            ></textarea>
        </div>
    </div>

    <div class="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="min-w-0">
            <p class="field-label">Corps de la fiche</p>

            <MarkdownEditor value={body} onchange={( markdown ) => ( body = markdown )} />
        </div>

        <aside class="space-y-5">
            <EntryTypeAndStatus bind:type bind:status />

            <fieldset class="surface p-5">
                <legend class="text-muted mb-3 text-xs tracking-wide uppercase">Catégories</legend>

                {#if wiki.categories.length === 0}
                    <p class="text-muted text-sm">
                        Aucune catégorie déclarée. <a href={resolve( "/categories/manage" )} class="wiki-link">En créer</a
                        >.
                    </p>
                {:else}
                    <div class="space-y-1.5">
                        {#each wiki.categories as item ( item.slug )}
                            <label class="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    class="accent-accent-600 h-4 w-4"
                                    checked={categories.includes( item.slug )}
                                    onchange={() => toggleCategory( item.slug )}
                                />
                                {item.name}
                            </label>
                        {/each}
                    </div>
                {/if}
            </fieldset>

            <fieldset class="surface p-5">
                <legend class="text-muted mb-3 text-xs tracking-wide uppercase">Infobox</legend>

                <InfoboxEditor bind:fields={infobox} />
            </fieldset>

            <EntryImageFields bind:src={imageSrc} bind:alt={imageAlt} bind:caption={imageCaption} />

            <fieldset class="surface p-5">
                <legend class="text-muted mb-3 text-xs tracking-wide uppercase">Autres noms</legend>

                <ChipsInput bind:values={aliases} id="entry-aliases" placeholder="Alias, puis Entrée" />

                <p class="text-muted mt-2 text-xs leading-relaxed">
                    Pris en compte par la recherche, sans créer de page.
                </p>
            </fieldset>
        </aside>
    </div>
</form>

{#if entry}
    <ConfirmDialog
        bind:open={deleteOpen}
        title="Supprimer cette fiche ?"
        message="La fiche disparaît du site et de ce navigateur."
        confirmLabel="Supprimer"
        danger
        onconfirm={remove}
    />
{/if}
