<script lang="ts">
    /**
     * Categories a page belongs to, chosen from the ones the wiki declares.
     *
     * The panel is a plain column of checkboxes up to a handful of categories,
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
    import Plus from "@lucide/svelte/icons/plus";
    import Button from "flowbite-svelte/Button.svelte";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Modal from "flowbite-svelte/Modal.svelte";
    import { resolve } from "$app/paths";
    import { MODAL_MOBILE_FULLSCREEN } from "$lib/config/dialogs";
    import { PAIRED_ACTION, SMALL_FIELD } from "$lib/config/forms";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import { pluralize } from "$lib/utilities/plural";
    import { deburr } from "$lib/utilities/slug";
    import OptionPanel from "./OptionPanel.svelte";

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

    const summary = $derived(
        categories.length === 0
            ? m.entry_form_categories_none()
            : pluralize( categories.length, { one: m.common_count_categorie_one, other: m.common_count_categorie_other } )
    );

    const canCreate = $derived( createdName.trim().length > 0 );

    // Reopened as often as a category turns out to be missing, so the field is
    // focused on every opening, and emptied on the way out rather than kept.
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
        categories = categories.includes( slug )
            ? categories.filter( ( item ) => item !== slug )
            : [ ...categories, slug ];
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

        const created = wiki.saveCategory( { name: createdName.trim() } );

        if ( !categories.includes( created.slug ) )
        {
            categories = [ ...categories, created.slug ];
        }

        filter = "";
        createOpen = false;
    };
</script>

<OptionPanel label={m.common_categories_label()} value={summary}>
    {#if wiki.categories.length === 0}
        <p class="text-muted text-sm">
            {m.entry_form_no_categories()}
            <a href={resolve( "/categories/manage" )} class="wiki-link">{m.entry_form_create_category_link()}</a>.
        </p>
    {:else}
        {#if filterable}
            <Input
                bind:value={filter}
                type="search"
                size="sm"
                class="{SMALL_FIELD} mb-2"
                placeholder={m.entry_form_categories_filter_placeholder()}
                aria-label={m.entry_form_categories_filter_label()}
            />
        {/if}

        <fieldset class="space-y-1.5">
            <legend class="sr-only">{m.entry_form_categories_legend()}</legend>

            {#each offered as item ( item.slug )}
                <Checkbox
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

    <Button color="alternative" size="sm" class="mt-3 w-full gap-2" onclick={() => ( createOpen = true )}>
        <Plus class="h-4 w-4" />
        {m.entry_form_category_new()}
    </Button>
</OptionPanel>

<Modal
    bind:open={createOpen}
    title={m.entry_form_category_new()}
    size="xs"
    dismissable={false}
    transitionParams={{ duration: 0 }}
    class="border-paper-200 text-ink-800 dark:border-ink-800 dark:bg-ink-900 dark:text-paper-200 rounded-2xl
           border {MODAL_MOBILE_FULLSCREEN}"
    classes={{
        header: "border-paper-200 dark:border-ink-800 text-ink-900 dark:text-paper-100 font-serif",
        footer: "border-paper-200 dark:border-ink-800 justify-end"
    }}
    aria-label={m.entry_form_category_new()}
>
    <Label for="entry-category-name" class="field-label">{m.entry_form_category_name_label()}</Label>

    <Input
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
