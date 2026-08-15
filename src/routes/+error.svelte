<script lang="ts">
    /**
     * Error page, mostly seen on a mistyped url.
     *
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import * as m from "$lib/locales/messages.js";
</script>

<svelte:head>
    <title>{m.error_title()}</title>
</svelte:head>

<section class="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
    <p class="text-muted font-mono text-sm">{page.status}</p>

    <h1 class="mt-3 font-serif text-4xl font-semibold tracking-tight">
        {page.status === 404 ? m.error_heading_not_found() : m.error_heading_generic()}
    </h1>

    <p class="text-muted mx-auto mt-4 max-w-lg leading-relaxed">
        {page.error?.message ?? m.error_fallback_message()}
    </p>

    <div class="mt-8 flex justify-center gap-3">
        <Button href={resolve( "/" )} color="primary">{m.error_home_button()}</Button>
        <Button href={resolve( "/wiki" )} color="alternative">{m.common_browse_wiki()}</Button>
    </div>
</section>
