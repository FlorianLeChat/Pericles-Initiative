<script lang="ts">
    /**
     * Illustration at the head of the infobox card: the preview, and the source,
     * alt text and caption folded under one control.
     *
     * The source is either an image chosen on this device, reduced and stored as
     * base64 through `ImageImportDialog`, or the address of an image online. An
     * imported one is named by its weight rather than shown as the data url it is,
     * which nobody could read or edit. Base64 pasted into the address field goes
     * through the same dialog rather than being stored at full size.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Upload from "@lucide/svelte/icons/upload";
    import Helper from "flowbite-svelte/Helper.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import { formatSize } from "#lib/utilities/size.ts";
    import { IMAGE_MAX_SIDE } from "#lib/config/images.ts";
    import ImagePlus from "@lucide/svelte/icons/image-plus";
    import { FIELD, SMALL_FIELD } from "#lib/config/forms.ts";
    import ImageImportDialog from "./ImageImportDialog.svelte";
    import { dataUrlBlob, imageSize, isImportedImage, pastedImage } from "#lib/utilities/image.ts";

    interface Props {
        src: string;
        alt: string;
        caption: string;
    }

    let { src = $bindable(), alt = $bindable(), caption = $bindable() }: Props = $props();

    /** Identifier of the suggestion list the path field points at. */
    const PATH_LIST = "entry-image-paths";

    let broken = $state( false );

    /** Whether the fields are unfolded; closed on arrival, since a page is written before it is illustrated. */
    let open = $state( false );

    let importer: ImageImportDialog | undefined = $state();
    let fileField: HTMLInputElement | undefined = $state();

    const chosen = $derived( src.trim() !== "" );
    const imported = $derived( isImportedImage( src ) );

    /**
     * Addresses of the illustrations the wiki already points at, so several
     * pages can share one. Imported images are left out: a data url is no
     * suggestion anybody can read.
     */
    const suggestions = $derived( [
        ...new Set( wiki.entries.map( ( entry ) => entry.image?.src ?? "" ).filter( ( item ) => item && !isImportedImage( item ) ) )
    ] );

    /**
     * Sends base64 typed or pasted into the address field through the import dialog.
     *
     * The field is emptied while the dialog is open, and keeps the reduced image
     * once imported, or nothing when the import is cancelled.
     *
     * @param event Input of the address field.
     * @author Claude
     */
    const importPasted = async ( event: Event ): Promise<void> =>
    {
        const field = event.target;
        const data = field instanceof HTMLInputElement ? pastedImage( field.value ) : null;

        if ( !data || !importer )
        {
            return;
        }

        src = "";

        const url = await importer.pick( await dataUrlBlob( data ) );

        src = url ?? "";
    };

    /**
     * Imports the file just chosen, once the reader has settled its quality.
     *
     * @param event Change of the file field.
     * @author Claude
     */
    const importFile = async ( event: Event & { currentTarget: HTMLInputElement } ): Promise<void> =>
    {
        const field = event.currentTarget;
        const file = field.files?.[ 0 ];

        field.value = "";

        if ( !file || !importer )
        {
            return;
        }

        const url = await importer.pick( file );

        if ( url )
        {
            src = url;
        }
    };
</script>

{#if chosen}
    <!-- Kept in the document while it fails, rather than swapped for the notice:
         an unmounted image never reloads, so a corrected path would stay broken. -->
    <img
        {src}
        alt={alt || m.entry_image_fields_alt_fallback()}
        class="border-paper-200 dark:border-ink-700 aspect-video w-full border-b object-cover"
        class:hidden={broken}
        loading="lazy"
        decoding="async"
        onerror={() => ( broken = true )}
        onload={() => ( broken = false )}
    />

    {#if broken}
        <p
            class="border-alert-500/40 text-muted grid aspect-video w-full place-items-center border-b border-dashed
                   px-4 text-center text-xs"
        >
            {m.entry_image_fields_broken()}
        </p>
    {/if}
{/if}

<div class="px-4 pt-4">
    <button
        type="button"
        class="text-muted hover:text-ink-800 dark:hover:text-paper-200 flex w-full items-center justify-center gap-2
               rounded-lg text-sm transition-colors
               {chosen
                   ? "min-h-9"
                   : "border-paper-300 dark:border-ink-700 hover:border-paper-400 min-h-20 border border-dashed"}"
        aria-expanded={open}
        aria-controls="entry-image-fields"
        onclick={() => ( open = !open )}
    >
        <ImagePlus class="h-4 w-4" />
        {chosen ? m.entry_image_fields_edit() : m.entry_image_fields_add()}
    </button>

    {#if open}
        <div id="entry-image-fields" class="space-y-3 pt-3">
            {#if imported}
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-muted text-xs">{m.image_import_imported( { size: formatSize( imageSize( src ) ) } )}</p>

                    <Button color="alternative" size="xs" class="rounded-full" onclick={() => ( src = "" )}>
                        {m.image_import_remove()}
                    </Button>
                </div>
            {:else}
                <Button color="alternative" size="sm" class="w-full gap-2 rounded-full" onclick={() => fileField?.click()}>
                    <Upload class="h-4 w-4" />
                    {m.image_import_choose()}
                </Button>

                <input bind:this={fileField} type="file" accept="image/*" class="hidden" onchange={importFile} />

                <div>
                    <Label for="entry-image" class="field-label">{m.entry_image_fields_src_label()}</Label>

                    <Input
                        id="entry-image"
                        bind:value={src}
                        oninput={importPasted}
                        type="text"
                        size="sm"
                        class="{FIELD} {SMALL_FIELD} font-mono placeholder:font-sans"
                        list={PATH_LIST}
                        placeholder={m.entry_image_fields_src_placeholder()}
                    />

                    <datalist id={PATH_LIST}>
                        {#each suggestions as path ( path )}
                            <option value={path}></option>
                        {/each}
                    </datalist>
                </div>
            {/if}

            {#if chosen}
                <div>
                    <Label for="entry-image-alt" class="field-label">{m.entry_image_fields_alt_label()}</Label>

                    <Input id="entry-image-alt" bind:value={alt} type="text" size="sm" class="{FIELD} {SMALL_FIELD}" />
                </div>

                <div>
                    <Label for="entry-image-caption" class="field-label">{m.entry_image_fields_caption_label()}</Label>

                    <Input id="entry-image-caption" bind:value={caption} type="text" size="sm" class="{FIELD} {SMALL_FIELD}" />
                </div>
            {:else}
                <Helper class="text-xs leading-relaxed">
                    {m.entry_image_fields_hint()}
                </Helper>
            {/if}
        </div>
    {/if}
</div>

<ImageImportDialog bind:this={importer} maxSide={IMAGE_MAX_SIDE.illustration} />
