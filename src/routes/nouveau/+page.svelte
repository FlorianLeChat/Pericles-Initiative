<script lang="ts">
    /**
     * Creation of a page.
     *
     * `slug` and `titre` may be passed in the query string, which is how a red
     * link hands over the page it was waiting for.
     *
     * @author Claude
     */
    import { page } from "$app/state";
    import EntryForm from "$lib/components/editor/EntryForm.svelte";
    import { wiki } from "$lib/state/wiki.svelte";

    const initialSlug = $derived( page.url.searchParams.get( "slug" ) ?? "" );
    const initialTitle = $derived( page.url.searchParams.get( "titre" ) ?? "" );
</script>

<svelte:head>
    <title>Nouvelle fiche · {wiki.meta.universe}</title>
</svelte:head>

{#key `${ initialSlug }-${ initialTitle }`}
    <EntryForm {initialSlug} {initialTitle} />
{/key}
