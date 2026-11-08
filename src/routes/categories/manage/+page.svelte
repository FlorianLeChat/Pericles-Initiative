<script lang="ts">
    /**
     * Management of the categories.
     *
     * The rows follow the tree of `/categories`: a subcategory stands under its
     * parent, indented behind the same hairline branch, so where a category is
     * filed reads from its place rather than from a note under its name.
     *
     * «Modifier» and «Supprimer» are the same alternative pill, so a row offers two
     * actions of one shape; «Supprimer» is written in the catalogue red, as every
     * control that erases is, and the confirmation is where the red fills.
     *
     * @author Claude
     */
    import { tick } from "svelte";
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import type { Category } from "#lib/types.ts";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Radio from "flowbite-svelte/Radio.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import { slugify } from "#lib/utilities/slug.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import Select from "flowbite-svelte/Select.svelte";
    import Textarea from "flowbite-svelte/Textarea.svelte";
    import Breadcrumb from "flowbite-svelte/Breadcrumb.svelte";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import { PALETTE, paletteColor } from "#lib/config/palette.ts";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import BreadcrumbItem from "flowbite-svelte/BreadcrumbItem.svelte";
    import { BREADCRUMB_LIST, BREADCRUMB_STEP } from "#lib/config/navigation.ts";
    import { colorPill, FIELD, RADIO_OVERLAY, TOUCH_HEIGHT } from "#lib/config/forms.ts";
    import { categoryChildren, categoryDescendants, pageCountWithDrafts } from "#lib/utilities/categories.ts";

    /** The hairline a subcategory hangs from, as on `/categories`. */
    const BRANCH = "border-paper-300 dark:border-ink-700 border-l pl-5";

    let editing = $state<Category | null>( null );
    let name = $state( "" );
    let slug = $state( "" );
    let description = $state( "" );
    let color = $state( "bleu" );
    let parent = $state( "" );
    let slugLocked = $state( false );

    let pendingDeletion = $state<Category | null>( null );
    let deleteOpen = $state( false );

    const isEditing = $derived( editing !== null );
    const canSave = $derived( name.trim().length > 0 );

    const tree = $derived( categoryChildren( wiki.categories ) );

    /** Every category in the order of the tree, each with how deep it is filed. */
    const rows = $derived.by( () =>
    {
        const ordered: { category: Category; depth: number }[] = [];
        const visit = ( parentSlug: string | null, depth: number ): void =>
        {
            for ( const category of tree.get( parentSlug ) ?? [] )
            {
                ordered.push( { category, depth } );
                visit( category.slug, depth + 1 );
            }
        };

        visit( null, 0 );
        return ordered;
    } );

    /**
     * Categories the one in the form may be filed under: never itself, nor anything already filed
     * beneath it, which would close a loop with no root left to list it from.
     */
    const parentOptions = $derived.by( () =>
    {
        if ( !editing )
        {
            return wiki.categories;
        }

        const excluded = categoryDescendants( editing.slug, tree );
        excluded.add( editing.slug );

        return wiki.categories.filter( ( category ) => !excluded.has( category.slug ) );
    } );

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
        parent = "";
        slugLocked = false;
    };

    /**
     * Loads a category into the form, and puts the focus on its name.
     *
     * The form stands above the list on a phone, so a «Modifier» tapped far down
     * the list would otherwise fill a form the reader cannot see; moving the
     * focus brings it into view, and lets a keyboard type the new name at once.
     *
     * @param category Category to edit.
     * @returns Resolves once the focus has moved.
     * @author Claude
     */
    const startEdit = async ( category: Category ): Promise<void> =>
    {
        editing = category;
        name = category.name;
        slug = category.slug;
        description = category.description;
        color = category.color;
        parent = category.parent ?? "";
        slugLocked = true;

        await tick();
        document.getElementById( NAME_FIELD_ID )?.focus();
    };

    /** Identifier of the name field, which takes the focus when a category is loaded. */
    const NAME_FIELD_ID = "category-name";

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

        const previousSlug = editing?.slug;
        wiki.saveCategory(
            {
                slug: slugify( slug || name ),
                name: name.trim(),
                description: description.trim(),
                color,
                parent: parent || null
            },
            previousSlug
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

<PageMeta title={m.categories_manage_title( { universe: wiki.meta.universe } )} />

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <Breadcrumb ariaLabel={m.common_breadcrumb_aria()} class="text-muted text-sm" classes={{ list: BREADCRUMB_LIST }}>
        <BreadcrumbItem home href={resolve( "/categories" )} homeClass={BREADCRUMB_STEP}>
            {#snippet icon()}{/snippet}

            {m.common_categories_label()}
        </BreadcrumbItem>

        <BreadcrumbItem aria-current="page" spanClass={BREADCRUMB_STEP}>
            {#snippet icon()}
                <ChevronRight class="text-muted mx-1 h-4 w-4" />
            {/snippet}

            {m.categories_manage_breadcrumb_current()}
        </BreadcrumbItem>
    </Breadcrumb>

    <div class="mt-4">
        <PageHeader title={m.common_categories_manage_label()} rule={false}>
            {#snippet description()}
                {m.categories_manage_description()}
            {/snippet}
        </PageHeader>
    </div>

    <div class="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div
            class={wiki.categories.length === 0
                ? ""
                : "divide-paper-200 dark:divide-ink-700 border-paper-200 dark:border-ink-700 divide-y border-y"}
        >
            {#each rows as { category, depth } ( category.slug )}
                {@const members = wiki.entriesInCategory( category.slug, true )}
                {@const indent = depth > 0 ? `margin-left: ${ ( depth - 1 ) * 1.5 + 0.25 }rem` : undefined}

                <article class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
                    <div
                        class="flex min-w-0 flex-1 items-start gap-3
                               {depth > 0 ? BRANCH : ""}"
                        style={indent}
                    >
                        <span
                            class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full {paletteColor( category.color ).dot}"
                            aria-hidden="true"
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
                            {pageCountWithDrafts( members )}
                        </span>

                        <Button
                            color="alternative"
                            size="xs"
                            class="rounded-full {TOUCH_HEIGHT}"
                            onclick={() => void startEdit( category )}
                            aria-label={m.categories_manage_edit_aria( { name: category.name } )}
                        >
                            {m.common_edit_action()}
                        </Button>

                        <Button
                            color="alternative"
                            size="xs"
                            class="text-alert-500 dark:text-dark-alert-500 hover:text-alert-500 rounded-full {TOUCH_HEIGHT}"
                            onclick={() =>
                            {
                                pendingDeletion = category;
                                deleteOpen = true;
                            }}
                            aria-label={m.categories_manage_delete_aria( { name: category.name } )}
                        >
                            {m.common_delete_action()}
                        </Button>
                    </div>
                </article>
            {:else}
                <p
                    class="border-paper-300 dark:border-ink-700 text-muted rounded-2xl border border-dashed px-6 py-10 text-center text-sm"
                >
                    {m.categories_manage_empty_list()}
                </p>
            {/each}
        </div>

        <form
            class="surface order-first space-y-4 p-5 lg:order-none lg:sticky lg:top-20"
            onsubmit={( event ) =>
            {
                event.preventDefault();
                submit();
            }}
        >
            <h2 class="section-heading">
                {isEditing
                    ? m.categories_manage_form_editing_title( { name: editing?.name ?? "" } )
                    : m.categories_manage_form_new_title()}
            </h2>

            <div>
                <Label for={NAME_FIELD_ID} class="field-label">{m.categories_manage_field_name_label()}</Label>

                <Input
                    class={FIELD}
                    id={NAME_FIELD_ID}
                    bind:value={name}
                    type="text"
                    placeholder={m.categories_manage_field_name_placeholder()}
                    required
                />
            </div>

            <div>
                <Label for="category-slug" class="field-label">{m.categories_manage_field_slug_label()}</Label>

                <Input
                    id="category-slug"
                    bind:value={slug}
                    oninput={() => ( slugLocked = true )}
                    type="text"
                    class="{FIELD} font-mono text-xs placeholder:font-sans"
                    aria-invalid={slugTaken}
                    aria-describedby={slugTaken ? "category-slug-taken" : undefined}
                    placeholder={m.categories_manage_field_slug_placeholder()}
                />

                {#if slugTaken}
                    <Helper id="category-slug-taken" color="red" class="mt-1.5 text-xs">
                        {m.categories_manage_field_slug_taken()}
                    </Helper>
                {/if}
            </div>

            <div>
                <Label for="category-description" class="field-label">
                    {m.categories_manage_field_description_label()}
                </Label>

                <Textarea
                    id="category-description"
                    bind:value={description}
                    rows={3}
                    class="{FIELD} w-full resize-y"
                    placeholder={m.categories_manage_field_description_placeholder()}
                />
            </div>

            <div>
                <Label for="category-parent" class="field-label">{m.categories_manage_field_parent_label()}</Label>

                <Select classes={{ select: FIELD }} id="category-parent" bind:value={parent} placeholder="">
                    <option value="">{m.categories_manage_field_parent_none()}</option>

                    {#each parentOptions as option ( option.slug )}
                        <option value={option.slug}>{option.name}</option>
                    {/each}
                </Select>
            </div>

            <fieldset>
                <legend class="field-label">{m.categories_manage_field_color_legend()}</legend>

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
                    {isEditing ? m.categories_manage_save_button() : m.common_create_action()}
                </Button>

                {#if isEditing}
                    <Button color="alternative" class="border-0" onclick={reset}>
                        {m.categories_manage_cancel_button()}
                    </Button>
                {/if}
            </div>
        </form>
    </div>
</div>

<ConfirmDialog
    bind:open={deleteOpen}
    title={m.categories_manage_delete_dialog_title()}
    message={m.categories_manage_delete_dialog_message()}
    confirmLabel={m.common_delete_action()}
    danger
    onconfirm={confirmDeletion}
/>
