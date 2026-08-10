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

    interface Props {
        src: string;
        alt: string;
        caption: string;
    }

    let { src = $bindable(), alt = $bindable(), caption = $bindable() }: Props = $props();
</script>

<fieldset class="surface space-y-3 p-5">
    <legend class="text-muted mb-3 text-xs tracking-wide uppercase">Illustration</legend>

    <div>
        <Label for="entry-image" class="field-label">Adresse de l'image</Label>

        <Input id="entry-image" bind:value={src} type="text" class="font-mono text-xs" placeholder="https://exemple.fr/image.jpg" />
    </div>

    {#if src.trim()}
        <img
            {src}
            alt={alt || "Aperçu de l'illustration"}
            class="border-paper-200 dark:border-ink-800 aspect-video w-full rounded-xl border object-cover"
        />

        <div>
            <Label for="entry-image-alt" class="field-label">Texte alternatif</Label>

            <Input id="entry-image-alt" bind:value={alt} type="text" size="sm" class={SMALL_FIELD} />
        </div>

        <div>
            <Label for="entry-image-caption" class="field-label">Légende</Label>

            <Input id="entry-image-caption" bind:value={caption} type="text" size="sm" class={SMALL_FIELD} />
        </div>
    {:else}
        <Helper class="text-xs leading-relaxed">
            Collez l'adresse d'une image en ligne. Si vous avez accès aux fichiers du site, déposez la dans le
            dossier des médias et indiquez son chemin.
        </Helper>
    {/if}
</fieldset>
