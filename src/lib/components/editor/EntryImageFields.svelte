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
    import OptionPanel from "./OptionPanel.svelte";

    interface Props {
        src: string;
        alt: string;
        caption: string;
    }

    let { src = $bindable(), alt = $bindable(), caption = $bindable() }: Props = $props();

    const chosen = $derived( src.trim() !== "" );
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
                placeholder={m.entry_image_fields_src_placeholder()}
            />
        </div>

        {#if chosen}
            <img
                {src}
                alt={alt || m.entry_image_fields_alt_fallback()}
                class="border-paper-200 dark:border-ink-800 aspect-video w-full rounded-xl border object-cover"
                loading="lazy"
                decoding="async"
            />

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
