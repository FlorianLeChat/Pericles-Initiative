<script lang="ts">
    /**
     * Error page, mostly seen on a mistyped url.
     *
     * Every word of it comes from the catalogue: the message SvelteKit attaches
     * to an error is English and written for a developer, «Not Found» under a
     * French title. A missing page names the address it was asked for, in mono
     * since a path is a machine string, which is also the only thing the status
     * code told a reader, so the code itself is no longer printed.
     *
     * Going home is the one primary action, so the «Nouvelle fiche» of the header
     * steps back to a control pill here, as it does on every page holding one.
     * A mistyped address usually names a page that exists under another spelling,
     * so the search palette is offered beside it, opened through the same flag the
     * header and the shortcut set, rather than a guess at the closest address.
     *
     * It stands in the 72rem frame of every other page, left aligned, so its title
     * starts from the same edge as the title of the page the reader came from.
     *
     * @author Claude
     */
    import { page } from "$app/state";
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import Search from "@lucide/svelte/icons/search";
    import { ACTION_ROW } from "#lib/config/forms.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { search } from "#lib/state/search.svelte.ts";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";

    const missing = $derived( page.status === 404 );
</script>

<PageMeta title={missing ? m.error_title() : m.error_heading_generic()} />

<div class="mx-auto max-w-6xl px-4 py-24 sm:px-6">
    <section class="max-w-3xl">
        <h1 class="font-serif text-4xl font-semibold tracking-tight text-balance">
            {missing ? m.error_heading_not_found() : m.error_heading_generic()}
        </h1>

        <p class="text-muted mt-4 max-w-lg leading-relaxed text-pretty">
            {#if missing}
                {m.error_not_found_message()}
                <code class="text-ink-800 dark:text-paper-200 font-mono text-sm break-all">{page.url.pathname}</code>
            {:else}
                {m.error_generic_message()}
            {/if}
        </p>

        <div class="mt-8 {ACTION_ROW}">
            <Button href={resolve( "/" )} color="primary">{m.error_home_button()}</Button>

            <Button color="alternative" class="gap-2" onclick={() => ( search.open = true )}>
                <Search class="h-4 w-4" aria-hidden="true" />
                {m.error_search_button()}
            </Button>

            <Button href={resolve( "/entries" )} color="alternative">{m.common_browse_wiki()}</Button>
        </div>
    </section>
</div>
