<script lang="ts">
    /**
     * The way back after a replacement: an import, a restore, the demonstration
     * or the reset of the content set the wiki they replaced aside, and this card
     * brings it back.
     *
     * It shows only while a copy exists, at the head of `/data`, since it matters
     * most in the minutes after a replacement. Coming back is itself a
     * replacement, so the wiki left sets itself aside in turn and the card stays,
     * now describing that one: pressing twice returns to where the reader was.
     * One copy only, replaced by the next replacement, as the card says.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { ACTION_BUTTON } from "#lib/config/forms.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { formatDateTime } from "#lib/utilities/date.ts";

    let restored = $state( false );

    /**
     * Brings the previous wiki back and says so.
     *
     * @author Claude
     */
    const restore = (): void =>
    {
        wiki.restorePrevious();
        restored = true;
    };
</script>

{#if wiki.previous}
    <section class="surface mt-6 p-6" aria-labelledby="previous-wiki-heading">
        <h2 id="previous-wiki-heading" class="section-heading">{m.previous_wiki_heading()}</h2>

        <p class="text-muted mt-1.5 max-w-help text-sm leading-relaxed">
            {m.previous_wiki_description( {
                date: formatDateTime( wiki.previous.replacedAt ),
                pages: pluralize( wiki.previous.entries, { one: m.common_count_fiche_one, other: m.common_count_fiche_other } )
            } )}
        </p>

        <Button color="alternative" class="mt-4 {ACTION_BUTTON}" onclick={restore}>{m.previous_wiki_restore()}</Button>

        <p class="text-muted mt-2 text-xs" role="status">
            {#if restored}
                {m.previous_wiki_restored()}
            {/if}
        </p>
    </section>
{/if}
