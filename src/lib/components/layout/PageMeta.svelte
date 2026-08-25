<script lang="ts">
    /**
     * The title and the description of a page, in every form a client reads them.
     *
     * This component is the only place of the site writing those six tags. `app.html`
     * deliberately declares none of them: its own head is injected before
     * `%sveltekit.head%`, so a static description and a page one would both end up in
     * the document, and a browser keeps the first, which is never the page. Every
     * route therefore renders this instead of a `<svelte:head>` of its own, and one
     * route rendering it twice is the only way a duplicate can come back.
     *
     * @author Claude
     */
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";

    interface Props {
        title: string;
        description?: string;
    }

    let { title, description }: Props = $props();

    /*
     * Falls back rather than shipping an empty description: a page may carry none,
     * a category is often written without one, and the identity of the wiki itself
     * is optional in the settings. The last resort is a message of the catalogue,
     * since this string is read by whoever receives the link.
     */
    const summary = $derived(
        description?.trim() || wiki.meta.description.trim() || m.meta_description_fallback()
    );
</script>

<svelte:head>
    <title>{title}</title>

    <meta name="description" content={summary} />

    <meta property="og:title" content={title} />
    <meta property="og:description" content={summary} />

    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={summary} />
</svelte:head>
