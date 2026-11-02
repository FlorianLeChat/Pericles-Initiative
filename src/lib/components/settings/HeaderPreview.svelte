<script lang="ts">
    /**
     * Miniature of the site header, drawn from the identity being edited.
     *
     * It mirrors `SiteHeader` rather than inventing a badge of its own: the serif
     * wordmark, the logo only when one is given, the search pill and the one
     * primary action, which is where the accent shows. An earlier preview drew an
     * initial in an accent tile that the real header never renders, so it promised
     * a look the site did not have.
     *
     * The miniature is hidden from assistive technologies, which would otherwise
     * read a search field and a button that do nothing; the caption names it.
     *
     * @author Claude
     */
    import Plus from "@lucide/svelte/icons/plus";
    import * as m from "#lib/locales/messages.js";
    import Search from "@lucide/svelte/icons/search";
    import type { Accent } from "#lib/config/accents.ts";

    interface Props {
        universe: string;
        /** Address of the logo, empty when the wiki has none. */
        logo: string;
        accent: Accent[ "key" ];
    }

    let { universe, logo, accent }: Props = $props();

    const name = $derived( universe.trim() || m.settings_form_unnamed_universe() );
    const logoUrl = $derived( logo.trim() );
</script>

<figure>
    <figcaption class="field-label">{m.settings_form_preview_label()}</figcaption>

    <div
        data-accent={accent}
        class="border-paper-200 dark:border-ink-800 dark:bg-ink-950 flex h-16 items-center gap-3 rounded-xl border
               bg-white px-4"
        aria-hidden="true"
    >
        {#if logoUrl}
            <img src={logoUrl} alt="" class="h-8 w-8 shrink-0 rounded-lg object-cover" loading="lazy" decoding="async" />
        {/if}

        <span class="min-w-0 flex-1 sm:flex-none">
            <span class="text-ink-900 dark:text-paper-100 block truncate font-serif text-lg leading-tight font-semibold">
                {name}
            </span>

            <span class="text-muted block truncate text-xs leading-tight">{m.common_encyclopedia_tagline()}</span>
        </span>

        <span
            class="bg-paper-100 text-muted dark:bg-ink-900 mx-auto hidden h-9 max-w-52 flex-1 items-center gap-2
                   rounded-full px-3.5 text-sm sm:flex"
        >
            <Search class="h-4 w-4 shrink-0" />
            {m.common_search()}
        </span>

        <span
            class="bg-accent-700 dark:bg-accent-600 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm
                   font-medium text-white"
        >
            <Plus class="h-4 w-4" />
            <span class="hidden sm:inline">{m.common_new_entry()}</span>
        </span>
    </div>
</figure>
