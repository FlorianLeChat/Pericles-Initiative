<script lang="ts">
    /**
     * Categories a page belongs to, chosen from the ones the wiki declares.
     *
     * Drawn at the foot of the infobox card, where the article shows them: the
     * chosen ones as chips, the list folded under one control. Unfolded, it is a
     * plain column of checkboxes up to a handful of categories,
     * and gains a filter past that: a wiki that grew its vocabulary would
     * otherwise ask the writer to read thirty names to find one.
     *
     * A category missing from the list can be declared here rather than on the
     * management screen, which is a navigation away from a form holding unsaved
     * work, and therefore a trip through the guard that protects it. Only the
     * name is asked for, since that is all a category needs to exist; its
     * colour, its description and its parent stay where they are edited.
     *
     * @author Claude
     */
    import { onDestroy } from "svelte";
    import Plus from "@lucide/svelte/icons/plus";
    import * as m from "#lib/locales/messages.js";
    import { deburr, slugify } from "#lib/utilities/slug.ts";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Modal from "flowbite-svelte/Modal.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { sound } from "#lib/state/sound.svelte.ts";
    import { paletteColor } from "#lib/config/palette.ts";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import { MODAL_MOBILE_FULLSCREEN } from "#lib/config/dialogs.ts";
    import { FIELD, PAIRED_ACTION, SMALL_FIELD, TOUCH_HEIGHT } from "#lib/config/forms.ts";

    interface Props {
        /** Slugs of the categories the page carries. */
        categories: string[];
    }

    let { categories = $bindable() }: Props = $props();

    /** Number of categories past which the list is worth filtering. */
    const FILTER_FROM = 8;

    let filter = $state( "" );
    let createOpen = $state( false );
    let createdName = $state( "" );
    let nameField: HTMLInputElement | undefined = $state();

    const filterable = $derived( wiki.categories.length >= FILTER_FROM );
    const needle = $derived( deburr( filter.trim() ) );
    const offered = $derived(
        needle ? wiki.categories.filter( ( item ) => deburr( item.name ).includes( needle ) ) : wiki.categories
    );

    /** Whether the list is unfolded; the chips say what is chosen while it is not. */
    let open = $state( false );

    /** The categories the page carries, in the order the wiki sorts them. */
    const chosen = $derived( wiki.categories.filter( ( item ) => categories.includes( item.slug ) ) );

    const canCreate = $derived( createdName.trim().length > 0 );

    /**
     * Categories declared from this picker, which the store holds the moment
     * they are created, before the page carrying them is saved.
     */
    const declared: string[] = [];

    onDestroy( () =>
    {
        for ( const slug of declared )
        {
            const carried = wiki.entries.some( ( entry ) => entry.categories.includes( slug ) );
            const parent = wiki.categories.some( ( item ) => item.parent === slug );

            if ( !carried && !parent )
            {
                wiki.deleteCategory( slug );
            }
        }
    } );

    $effect( () =>
    {
        if ( createOpen )
        {
            nameField?.focus();
        }
        else
        {
            createdName = "";
        }
    } );

    /**
     * Adds or removes a category.
     *
     * @param slug Category slug.
     * @author Claude
     */
    const toggle = ( slug: string ): void =>
    {
        categories = categories.includes( slug ) ? categories.filter( ( item ) => item !== slug ) : [ ...categories, slug ];
    };

    /**
     * Declares a category and puts the page in it.
     *
     * The filter is cleared on the way out: a category created while the list
     * was narrowed would otherwise be checked somewhere the writer cannot see.
     *
     * @author Claude
     */
    const create = (): void =>
    {
        if ( !canCreate )
        {
            return;
        }

        const name = createdName.trim();

        const existing = wiki.categories.find( ( item ) => item.slug === slugify( name ) );
        const slug = existing ? existing.slug : wiki.saveCategory( { name } ).slug;

        sound.cue( "success", { emphasis: "subtle" } );

        if ( !existing )
        {
            declared.push( slug );
        }

        if ( !categories.includes( slug ) )
        {
            categories = [ ...categories, slug ];
        }

        filter = "";
        createOpen = false;
    };
</script>

<div class="flex items-center justify-between gap-2">
    <p class="text-muted text-xs">{m.common_categories_label()}</p>

    <Button
        color="alternative"
        size="xs"
        class="rounded-full {TOUCH_HEIGHT}"
        aria-expanded={open}
        aria-controls="entry-categories"
        onclick={() => ( open = !open )}
    >
        {open ? m.entry_form_categories_done() : m.entry_form_categories_choose()}
    </Button>
</div>

{#if chosen.length > 0}
    <ul class="mt-2 flex flex-wrap gap-1.5" aria-label={m.entry_form_categories_legend()}>
        {#each chosen as category ( category.slug )}
            <li class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs {paletteColor( category.color ).chip}">
                <span class="h-1.5 w-1.5 rounded-full {paletteColor( category.color ).dot}"></span>
                {category.name}
            </li>
        {/each}
    </ul>
{:else if !open}
    <p class="text-muted mt-1 text-xs">{m.entry_form_categories_none()}</p>
{/if}

{#if open}
    <div id="entry-categories" class="mt-3">
        {#if wiki.categories.length === 0}
            <p class="text-muted text-sm">{m.entry_form_no_categories()}</p>
        {:else}
            {#if filterable}
                <Input
                    bind:value={filter}
                    type="search"
                    size="sm"
                    class="{FIELD} {SMALL_FIELD} mb-2"
                    placeholder={m.entry_form_categories_filter_placeholder()}
                    aria-label={m.entry_form_categories_filter_label()}
                />
            {/if}

            <fieldset class="space-y-1.5">
                <legend class="sr-only">{m.entry_form_categories_legend()}</legend>

                {#each offered as item ( item.slug )}
                    <Checkbox
                        data-cuelume-toggle
                        classes={{ div: "flex min-h-9 items-center text-sm" }}
                        checked={categories.includes( item.slug )}
                        onchange={() => toggle( item.slug )}
                    >
                        {item.name}
                    </Checkbox>
                {/each}

                {#if offered.length === 0}
                    <p class="text-muted text-sm">{m.entry_form_categories_no_match()}</p>
                {/if}
            </fieldset>
        {/if}

        <Button
            color="alternative"
            size="sm"
            class="mt-3 w-full gap-2 rounded-full"
            onclick={() => ( createOpen = true )}
        >
            <Plus class="h-4 w-4" />
            {m.entry_form_category_new()}
        </Button>
    </div>
{/if}

<Modal
    {@attach sound.dialog()}
    bind:open={createOpen}
    title={m.entry_form_category_new()}
    size="xs"
    dismissable={false}
    transitionParams={{ duration: 0 }}
    class="border-paper-200 text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-paper-200 rounded-2xl
           border {MODAL_MOBILE_FULLSCREEN}"
    classes={{
        header: "border-paper-200 dark:border-ink-700 text-ink-900 dark:text-paper-100 font-serif",
        footer: "border-paper-200 dark:border-ink-700 justify-end"
    }}
    aria-label={m.entry_form_category_new()}
>
    <Label for="entry-category-name" class="field-label">{m.entry_form_category_name_label()}</Label>

    <Input
        class={FIELD}
        id="entry-category-name"
        bind:elementRef={nameField}
        bind:value={createdName}
        onkeydown={( event: KeyboardEvent ) =>
        {
            if ( event.key === "Enter" )
            {
                event.preventDefault();
                create();
            }
        }}
        type="text"
        placeholder={m.entry_form_category_name_placeholder()}
    />

    {#snippet footer()}
        <Button color="alternative" class={PAIRED_ACTION} onclick={() => ( createOpen = false )}>
            {m.common_cancel()}
        </Button>

        <Button color="primary" class={PAIRED_ACTION} disabled={!canCreate} onclick={create}>
            {m.common_create_action()}
        </Button>
    {/snippet}
</Modal>
