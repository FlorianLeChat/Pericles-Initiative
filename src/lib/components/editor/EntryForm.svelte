<script lang="ts">
    /**
     * Creation and edition form of a page.
     *
     * @author Claude
     */
    import Trash2 from "@lucide/svelte/icons/trash-2";
    import Button from "flowbite-svelte/Button.svelte";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Textarea from "flowbite-svelte/Textarea.svelte";
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
        class="border-paper-200 dark:border-ink-800 dark:bg-ink-950/80 bg-paper-50/90 sticky top-16 z-30 -mx-4 mb-8
               flex items-center gap-2 border-b px-4 py-3 backdrop-blur sm:-mx-6 sm:gap-3 sm:px-6"
    >
        <div class="hidden min-w-0 flex-1 sm:block">
            <p class="text-muted text-xs tracking-wide uppercase">
                {entry ? "Modifier une fiche" : "Nouvelle fiche"}
            </p>

            <p class="truncate text-sm font-medium">{title.trim() || "Sans titre"}</p>
        </div>

        {#if dirty}
            <span class="bg-signal-500 h-2 w-2 shrink-0 rounded-full lg:hidden" aria-hidden="true"></span>

            <span class="text-signal-500 sr-only shrink-0 text-xs lg:not-sr-only" role="status">
                Modifications non enregistrées
            </span>
        {/if}

        <div class="ml-auto flex shrink-0 items-center gap-2">
            {#if entry}
                <Button
                    color="alternative"
                    size="sm"
                    class="hover:text-alert-500 border-0 px-2 sm:px-3"
                    onclick={() => ( deleteOpen = true )}
                    aria-label="Supprimer la fiche"
                >
                    <Trash2 class="h-4 w-4 sm:hidden" />

                    <span class="hidden sm:inline">Supprimer</span>
                </Button>
            {/if}

            <Button href={resolve( entry ? `/wiki/${ entry.slug }` : "/wiki" )} color="alternative" size="sm">
                Annuler
            </Button>

            <Button type="submit" color="primary" size="sm" disabled={!canSave}>Enregistrer</Button>
        </div>
    </div>

    <div class="space-y-4">
        <div>
            <Label for="entry-title" class="field-label">Titre</Label>

            <Input
                id="entry-title"
                bind:value={title}
                type="text"
                class="font-serif text-xl"
                placeholder="Nom du personnage, du lieu, de l'événement..."
                required
            />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
            <div>
                <Label for="entry-slug" class="field-label">
                    Adresse de la page
                    {#if !slugLocked}
                        <span class="text-muted font-normal">suit le titre</span>
                    {/if}
                </Label>

                <div class="flex items-center gap-2">
                    <span class="text-muted shrink-0 font-mono text-sm">/wiki/</span>

                    <Input
                        id="entry-slug"
                        bind:value={slug}
                        oninput={() => ( slugLocked = true )}
                        onblur={() => ( slug = slug.trim() ? slugify( slug ) : "" )}
                        type="text"
                        class="font-mono"
                        color={slugTaken ? "red" : "default"}
                        aria-invalid={slugTaken}
                        aria-describedby={slugTaken ? "entry-slug-taken" : undefined}
                        placeholder="adresse-de-la-page"
                    />
                </div>

                {#if slugTaken}
                    <Helper id="entry-slug-taken" color="red" class="mt-1.5 text-xs">
                        Une autre fiche utilise déjà cette adresse. Un numéro sera ajouté à la fin.
                    </Helper>
                {/if}
            </div>

            <div>
                <Label for="entry-date" class="field-label">Date dans l'univers</Label>

                <Input
                    id="entry-date"
                    bind:value={timelineDate}
                    type="text"
                    aria-describedby="entry-date-hint"
                    placeholder="2025-04-02, ou Juin 2043"
                />

                <Helper id="entry-date-hint" class="mt-1.5 text-xs">
                    Facultatif. Une date comme 2043-06-12 place la fiche dans la chronologie ; « Juin 2043 » ou « Le troisième hiver » sont acceptés aussi.
                </Helper>
            </div>
        </div>

        <div>
            <Label for="entry-summary" class="field-label">Résumé</Label>

            <Textarea
                id="entry-summary"
                bind:value={summary}
                rows={2}
                class="w-full resize-y"
                placeholder="Une ou deux phrases. Elles apparaissent sous le titre, dans les listes et dans la recherche."
            />
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
                            <Checkbox
                                classes={{ div: "flex min-h-9 items-center text-sm" }}
                                checked={categories.includes( item.slug )}
                                onchange={() => toggleCategory( item.slug )}
                            >
                                {item.name}
                            </Checkbox>
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
