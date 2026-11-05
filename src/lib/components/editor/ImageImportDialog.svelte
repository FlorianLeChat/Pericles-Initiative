<script lang="ts">
    /**
     * Imports an image from a file, at the quality the reader picks.
     *
     * The image is reduced to the longest side its place on the site needs,
     * encoded as WebP, and handed back as a base64 data url to store with the
     * rest of the wiki. The dialog shows the result at each level before
     * anything is kept, with its weight beside what the wiki already takes
     * from a quota of roughly five megabytes, since that is what the choice
     * trades against.
     *
     * Reached from a file chosen on the device, and from base64 pasted where an
     * address was expected, which would otherwise be stored at full size.
     *
     * Opened through `pick`, the one way in, which resolves with the data url,
     * or with nothing when the reader cancels or the file cannot be read: the
     * body editor, the infobox card and the logo of the settings all wait on it
     * the same way.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import Modal from "flowbite-svelte/Modal.svelte";
    import Radio from "flowbite-svelte/Radio.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { formatSize, storedSize } from "#lib/utilities/size.ts";
    import { MODAL_MOBILE_FULLSCREEN } from "#lib/config/dialogs.ts";
    import { filterPill, PAIRED_ACTION, RADIO_OVERLAY } from "#lib/config/forms.ts";
    import { decodeImage, encodeImage, imageSize, type DecodedImage } from "#lib/utilities/image.ts";
    import { DEFAULT_IMAGE_QUALITY, IMAGE_QUALITIES, type ImageQuality } from "#lib/config/images.ts";

    interface Props {
        /** Longest side the stored image keeps, in pixels. */
        maxSide: number;
    }

    let { maxSide }: Props = $props();

    let open = $state( false );
    let image = $state<DecodedImage | null>( null );
    let unreadable = $state( false );
    let quality = $state<ImageQuality[ "id" ]>( DEFAULT_IMAGE_QUALITY );
    let wikiSize = $state( 0 );

    let settle: ( ( value: string | null ) => void ) | null = null;

    const level = $derived( IMAGE_QUALITIES.find( ( option ) => option.id === quality ) ?? IMAGE_QUALITIES[ 0 ] );
    const encoded = $derived( image && level ? encodeImage( image, level.quality ) : "" );

    /**
     * Opens the dialog on an image, and waits for the reader.
     *
     * A call made while the dialog is already open answers the previous one
     * with nothing first, so no caller is left waiting forever.
     *
     * @param file File chosen by the reader, or the bytes of a pasted base64 image.
     * @returns The data url of the image, or `null` when nothing is imported.
     * @author Claude
     */
    export const pick = async ( file: Blob ): Promise<string | null> =>
    {
        settle?.( null );

        const answer = new Promise<string | null>( ( resolve ) =>
        {
            settle = resolve;
        } );

        image = null;
        unreadable = false;
        quality = DEFAULT_IMAGE_QUALITY;
        wikiSize = storedSize( wiki.overlay );
        open = true;

        try
        {
            image = await decodeImage( file, maxSide );
        }
        catch
        {
            unreadable = true;
        }

        return answer;
    };

    /**
     * Answers the waiting caller and closes the dialog.
     *
     * @param value Data url to hand back, or `null` to import nothing.
     * @author Claude
     */
    const finish = ( value: string | null ): void =>
    {
        settle?.( value );
        settle = null;
        open = false;
        image?.bitmap.close();
        image = null;
    };
</script>

<Modal
    bind:open
    title={m.image_import_title()}
    size="sm"
    dismissable={false}
    transitionParams={{ duration: 0 }}
    oncancel={() => finish( null )}
    class="border-paper-200 text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-paper-200 rounded-2xl border
           {MODAL_MOBILE_FULLSCREEN}"
    classes={{
        header: "border-paper-200 dark:border-ink-700 text-ink-900 dark:text-paper-100 font-serif",
        body: "space-y-4",
        footer: "border-paper-200 dark:border-ink-700 justify-end"
    }}
    aria-label={m.image_import_title()}
>
    {#if unreadable}
        <p class="text-alert-500 dark:text-dark-alert-500 text-sm" role="alert">{m.image_import_unreadable()}</p>
    {:else if !image}
        <p class="text-muted py-6 text-center text-sm" role="status">{m.image_import_loading()}</p>
    {:else}
        <img
            src={encoded}
            alt={m.image_import_preview_alt()}
            class="bg-paper-100 dark:bg-ink-800 max-h-64 w-full rounded-lg object-contain"
        />

        <fieldset>
            <legend class="field-label">{m.image_import_quality_legend()}</legend>

            <div class="flex flex-wrap gap-1.5">
                {#each IMAGE_QUALITIES as option ( option.id )}
                    <Radio
                        name="image-import-quality"
                        value={option.id}
                        bind:group={quality}
                        class={RADIO_OVERLAY}
                        classes={{ label: filterPill( quality === option.id ) }}
                    >
                        {option.label()}
                    </Radio>
                {/each}
            </div>
        </fieldset>

        <p class="text-ink-800 dark:text-paper-200 text-sm" role="status">
            {m.image_import_size( {
                width: image.width,
                height: image.height,
                size: formatSize( imageSize( encoded ) )
            } )}
        </p>

        <p class="text-muted text-xs leading-relaxed">{m.image_import_hint( { size: formatSize( wikiSize ) } )}</p>
    {/if}

    {#snippet footer()}
        <Button color="alternative" class={PAIRED_ACTION} onclick={() => finish( null )}>
            {m.common_cancel()}
        </Button>

        <Button color="primary" class={PAIRED_ACTION} disabled={!encoded} onclick={() => finish( encoded )}>
            {m.image_import_confirm()}
        </Button>
    {/snippet}
</Modal>
