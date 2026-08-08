<script lang="ts">
    /**
     * Illustration fields of the entry form: path, preview, alt text and caption.
     *
     * @author Claude
     */
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
        <label class="field-label" for="entry-image">Chemin ou URL</label>

        <input
            id="entry-image"
            bind:value={src}
            type="text"
            class="field font-mono text-xs"
            placeholder="/media/exemple.svg"
        />
    </div>

    {#if src.trim()}
        <img
            {src}
            alt={alt || "Aperçu de l'illustration"}
            class="border-paper-200 dark:border-ink-800 aspect-video w-full rounded-xl border object-cover"
        />

        <div>
            <label class="field-label" for="entry-image-alt">Texte alternatif</label>

            <input id="entry-image-alt" bind:value={alt} type="text" class="field py-2" />
        </div>

        <div>
            <label class="field-label" for="entry-image-caption">Légende</label>

            <input id="entry-image-caption" bind:value={caption} type="text" class="field py-2" />
        </div>
    {:else}
        <p class="text-muted text-xs leading-relaxed">
            Déposez le fichier dans <code class="font-mono">static/media/</code>, puis indiquez son chemin. Pas de
            base64 : le stockage local est limité.
        </p>
    {/if}
</fieldset>
