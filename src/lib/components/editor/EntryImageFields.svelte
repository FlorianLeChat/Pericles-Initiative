<script lang="ts">
    /**
     * Illustration fields of the entry form: path, preview, alt text and caption.
     *
     * @author Claude
     */
    import Helper from "flowbite-svelte/Helper.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import { SMALL_FIELD } from "$lib/config/forms";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import OptionPanel from "./OptionPanel.svelte";

    interface Props {
        src: string;
        alt: string;
        caption: string;
    }

    let { src = $bindable(), alt = $bindable(), caption = $bindable() }: Props = $props();

    /** Identifier of the suggestion list the path field points at. */
    const PATH_LIST = "entry-image-paths";

    let broken = $state( false );

    const chosen = $derived( src.trim() !== "" );

    /**
     * Illustrations the wiki already points at.
     *
     * The site is statically generated, so nothing can read `static/media/` at
     * runtime to list what is actually there: the corpus is the only inventory
     * of the paths known to work, and it covers the common case of several pages
     * sharing one illustration.
     */
    const suggestions = $derived( [ ...new Set( wiki.entries.map( ( entry ) => entry.image?.src ).filter( Boolean ) ) ] );
</script>

<OptionPanel label={m.entry_image_fields_label()} value={chosen ? m.entry_image_fields_set() : m.entry_image_fields_none()}>
    <div class="space-y-3">
        <div>
            <Label for="entry-image" class="field-label">{m.entry_image_fields_src_label()}</Label>

            <Input
                id="entry-image"
                bind:value={src}
                type="text"
                class="font-mono text-xs"
                list={PATH_LIST}
                placeholder={m.entry_image_fields_src_placeholder()}
            />

            <datalist id={PATH_LIST}>
                {#each suggestions as path ( path )}
                    <option value={path}></option>
                {/each}
            </datalist>
        </div>

        {#if chosen}
            <!-- Kept in the document while it fails, rather than swapped for the notice:
                 an unmounted image never reloads, so a corrected path would stay broken. -->
            <img
                {src}
                alt={alt || m.entry_image_fields_alt_fallback()}
                class="border-paper-200 dark:border-ink-800 aspect-video w-full rounded-xl border object-cover"
                class:hidden={broken}
                loading="lazy"
                decoding="async"
                onerror={() => ( broken = true )}
                onload={() => ( broken = false )}
            />

            {#if broken}
                <p
                    class="border-alert-500/40 text-muted grid aspect-video w-full place-items-center rounded-xl
                           border border-dashed px-4 text-center text-xs"
                >
                    {m.entry_image_fields_broken()}
                </p>
            {/if}

            <div>
                <Label for="entry-image-alt" class="field-label">{m.entry_image_fields_alt_label()}</Label>

                <Input id="entry-image-alt" bind:value={alt} type="text" size="sm" class={SMALL_FIELD} />
            </div>

            <div>
                <Label for="entry-image-caption" class="field-label">{m.entry_image_fields_caption_label()}</Label>

                <Input id="entry-image-caption" bind:value={caption} type="text" size="sm" class={SMALL_FIELD} />
            </div>
        {:else}
            <Helper class="text-xs leading-relaxed">
                {m.entry_image_fields_hint()}
            </Helper>
        {/if}
    </div>
</OptionPanel>
