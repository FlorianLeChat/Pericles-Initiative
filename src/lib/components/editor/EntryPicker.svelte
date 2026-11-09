<script lang="ts">
    /**
     * Picks the page an internal link should point at.
     *
     * A title that matches nothing is not a dead end: it produces a red link,
     * which is how a page gets planned before it gets written.
     *
     * The hits stay buttons rather than becoming listbox options, unlike the
     * search palette: nothing here moves a selection with the arrows, so they are
     * reached with the tab key like any other control, and a combobox would only
     * take that away.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import Input from "flowbite-svelte/Input.svelte";
    import Modal from "flowbite-svelte/Modal.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import { slugify } from "#lib/utilities/slug.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { sound } from "#lib/state/sound.svelte.ts";
    import { searchEntries } from "#lib/utilities/search.ts";
    import { FIELD, PAIRED_ACTION } from "#lib/config/forms.ts";
    import { MODAL_MOBILE_FULLSCREEN } from "#lib/config/dialogs.ts";

    interface Props {
        open: boolean;
        /** Called with the target slug and the label to display. */
        onselect: ( slug: string, label: string ) => void;
    }

    let { open = $bindable( false ), onselect }: Props = $props();

    let input: HTMLInputElement | undefined = $state();
    let query = $state( "" );

    const trimmed = $derived( query.trim() );
    const hits = $derived( trimmed.length > 0 ? searchEntries( wiki.entries, trimmed, 8 ) : [] );
    const plannedSlug = $derived( trimmed.length > 0 ? slugify( trimmed ) : "" );
    const isNew = $derived( plannedSlug.length > 0 && !wiki.slugs.has( plannedSlug ) );

    $effect( () =>
    {
        if ( open )
        {
            input?.focus();
        }
        else
        {
            query = "";
        }
    } );

    /**
     * Sends the chosen target back and closes the dialog.
     *
     * @param slug Target page slug.
     * @param label Link text.
     * @author Claude
     */
    const choose = ( slug: string, label: string ): void =>
    {
        onselect( slug, label );
        open = false;
        query = "";
    };
</script>

<Modal
    {@attach sound.dialog()}
    bind:open
    size="sm"
    placement="top-center"
    dismissable={false}
    transitionParams={{ duration: 0 }}
    class="border-paper-200 text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-paper-200 mt-[8dvh]
           max-h-[80dvh] rounded-2xl border {MODAL_MOBILE_FULLSCREEN}"
    classes={{
        header: "border-paper-200 dark:border-ink-700 p-4",
        body: "p-2",
        footer: "border-paper-200 dark:border-ink-700 justify-end p-4"
    }}
    aria-label={m.entry_picker_aria_label()}
>
    {#snippet header()}
        <div class="w-full">
            <p class="mb-2 text-sm font-medium">{m.entry_picker_aria_label()}</p>

            <Input
                bind:elementRef={input}
                bind:value={query}
                onkeydown={( event: KeyboardEvent ) =>
                {
                    if ( event.key !== "Enter" )
                    {
                        return;
                    }

                    event.preventDefault();

                    const first = hits[ 0 ];

                    if ( first )
                    {
                        choose( first.entry.slug, first.entry.title );
                    }
                    else if ( isNew )
                    {
                        choose( plannedSlug, trimmed );
                    }
                }}
                type="text"
                class="{FIELD} rounded-xl px-3.5 py-2.5 transition"
                placeholder={m.entry_picker_input_label()}
                aria-label={m.entry_picker_input_label()}
                autocomplete="off"
            />
        </div>
    {/snippet}

    {#if trimmed.length === 0}
        <p class="text-muted px-3 py-6 text-center text-sm">
            {m.entry_picker_hint()}
        </p>
    {:else}
        <ul>
            {#each hits as hit ( hit.entry.id )}
                <li>
                    <button
                        type="button"
                        class="hover:bg-paper-100 dark:hover:bg-ink-800 flex w-full items-center gap-3 rounded-xl
                               px-3 py-2.5 text-left transition"
                        onclick={() => choose( hit.entry.slug, hit.entry.title )}
                    >
                        <span class="min-w-0 flex-1">
                            <span class="block truncate text-sm font-medium">{hit.entry.title}</span>

                            <span class="text-muted block truncate font-mono text-xs">
                                /entries/{hit.entry.slug}
                            </span>
                        </span>
                    </button>
                </li>
            {/each}

            {#if isNew}
                <li>
                    <button
                        type="button"
                        class="hover:bg-paper-100 dark:hover:bg-ink-800 flex w-full items-center gap-3 rounded-xl
                               px-3 py-2.5 text-left transition"
                        onclick={() => choose( plannedSlug, trimmed )}
                    >
                        <span
                            class="border-alert-500/40 text-alert-500 grid h-6 w-6 shrink-0 place-items-center
                                   rounded-full border border-dashed text-xs"
                            aria-hidden="true"
                        >
                            +
                        </span>

                        <span class="min-w-0 flex-1">
                            <span class="block truncate text-sm font-medium">
                                {m.entry_picker_red_link( { title: trimmed } )}
                            </span>

                            <span class="text-muted block truncate font-mono text-xs">
                                /entries/{plannedSlug}
                            </span>
                        </span>
                    </button>
                </li>
            {/if}
        </ul>
    {/if}

    {#snippet footer()}
        <Button color="alternative" class={PAIRED_ACTION} onclick={() => ( open = false )}>
            {m.common_cancel()}
        </Button>
    {/snippet}
</Modal>
