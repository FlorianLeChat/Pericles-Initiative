<script lang="ts">
    /**
     * Root layout: installs the dataset, then frames every page.
     *
     * @author Claude
     */
    import "../app.css";
    import { asset } from "$app/paths";
    import { untrack, type Snippet } from "svelte";
    import { onNavigate } from "$app/navigation";
    import ConnectionStatus from "$lib/components/ConnectionStatus.svelte";
    import BreakingBanner from "$lib/components/live/BreakingBanner.svelte";
    import SearchDialog from "$lib/components/SearchDialog.svelte";
    import SiteHeader from "$lib/components/SiteHeader.svelte";
    import UpdateBanner from "$lib/components/UpdateBanner.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { LayoutData } from "./$types";

    interface Props {
        data: LayoutData;
        children: Snippet;
    }

    const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

    let { data, children }: Props = $props();

    /**
     * Crossfades the two pages during a client side navigation.
     *
     * The callback given to the browser is what it snapshots around, so the
     * promise SvelteKit waits on has to be resolved from inside it, and the
     * navigation has to be awaited before the second snapshot is taken.
     *
     * A browser without the api, or a reader who asked for less motion, simply
     * swaps the page: this is the sole place where that choice is made, which is
     * why nothing in `app.css` repeats it.
     *
     * Reaching the page already open is the other case left alone. Nothing moves
     * on screen, so crossfading a page with itself would only read as a jolt.
     *
     * @param navigation Navigation about to happen.
     * @returns A promise resolved once the outgoing page has been captured.
     * @author Claude
     */
    onNavigate( ( navigation ) =>
    {
        const destination = navigation.to?.url.pathname;
        const staysOnPage = destination === undefined || destination === navigation.from?.url.pathname;

        const animatable = typeof document.startViewTransition === "function"
          && !window.matchMedia( REDUCED_MOTION ).matches;

        if ( staysOnPage || !animatable )
        {
            return;
        }

        return new Promise<void>( ( resolve ) =>
        {
            document.startViewTransition( async () =>
            {
                resolve();
                await navigation.complete;
            } );
        } );
    } );

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

<svelte:head>
    <link rel="icon" href={asset( "/assets/favicon.svg" )} type="image/svg+xml" sizes="any" />
    <link rel="manifest" href={asset( "/manifest.webmanifest" )} crossorigin="use-credentials" />
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<BreakingBanner />

<SiteHeader onsearch={() => ( searchOpen = true )} />

<main class="flex-1">
    {@render children()}
</main>

<SearchDialog bind:open={searchOpen} />

<ConnectionStatus />

<UpdateBanner />

{#if wiki.storageError}
    <p class="bg-alert-500 fixed inset-x-0 bottom-0 z-50 px-4 py-3 text-center text-sm text-white" role="alert">
        {wiki.storageError}
    </p>
{/if}
