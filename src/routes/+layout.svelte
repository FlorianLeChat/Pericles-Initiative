<script lang="ts">
    /**
     * Root layout: installs the dataset, then frames every page.
     *
     * @author Claude
     */
    import "../app.css";
    import { untrack, type Snippet } from "svelte";
    import BreakingBanner from "$lib/components/live/BreakingBanner.svelte";
    import SearchDialog from "$lib/components/SearchDialog.svelte";
    import SiteFooter from "$lib/components/SiteFooter.svelte";
    import SiteHeader from "$lib/components/SiteHeader.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { LayoutData } from "./$types";

    interface Props {
        data: LayoutData;
        children: Snippet;
    }

    let { data, children }: Props = $props();

    // Effects never run while prerendering, so the dataset is installed here as
    // well: this is what puts the content into the static HTML.
    untrack( () => wiki.hydrate( data.dataset ) );

    let searchOpen = $state( false );

    // Keeps the store in sync when the loaded data changes, and does nothing
    // on mount since `hydrate` ignores an unchanged source.
    $effect.pre( () =>
    {
        wiki.hydrate( data.dataset );
    } );

    // Local changes are only read in the browser, after hydration.
    $effect( () =>
    {
        wiki.loadOverlay();
    } );

    /**
     * Opens the search palette on Ctrl+K or Cmd+K.
     *
     * @param event Keyboard event on the window.
     * @author Claude
     */
    const onKeydown = ( event: KeyboardEvent ): void =>
    {
        if ( ( event.ctrlKey || event.metaKey ) && event.key.toLowerCase() === "k" )
        {
            event.preventDefault();
            searchOpen = true;
        }
    };
</script>

<svelte:window onkeydown={onKeydown} />

<BreakingBanner />

<SiteHeader onsearch={() => ( searchOpen = true )} />

<main class="flex-1">
    {@render children()}
</main>

<SiteFooter />

<SearchDialog bind:open={searchOpen} />

{#if wiki.storageError}
    <p
        class="bg-alert-500 fixed inset-x-0 bottom-0 z-50 px-4 py-3 text-center text-sm text-white"
        role="alert"
    >
        {wiki.storageError}
    </p>
{/if}
