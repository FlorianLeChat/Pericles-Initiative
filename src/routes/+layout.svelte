<script lang="ts">
    /**
     * Root layout: installs the dataset, then frames every page.
     *
     * @author Claude
     */
    import "../app.css";
    import Alert from "flowbite-svelte/Alert.svelte";
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

<a
    href="#contenu"
    class="bg-accent-600 focus:ring-accent-500 sr-only rounded-full px-4 py-2 text-sm font-medium text-white
           focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:ring-2 focus:ring-offset-2"
>
    Aller au contenu
</a>

<BreakingBanner />

<SiteHeader onsearch={() => ( searchOpen = true )} />

<!--
    `tabindex` is what makes the skip link actually move the focus: without it
    the browser scrolls to the landmark and leaves the focus where it was, so the
    next tab goes back to the header the reader just skipped.
-->
<main id="contenu" tabindex="-1" class="flex-1 focus:outline-none">
    {@render children()}
</main>

<SearchDialog bind:open={searchOpen} />

<!--
    The three floating messages share one column in the bottom corner rather than
    each owning the corner: stacked in a flex container they push each other up
    instead of covering one another, which is what happened when a failed
    publication, a pending update and a storage error met.
-->
<div class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-start gap-2 sm:inset-x-6">
    {#if wiki.storageError}
        <Alert color="red" class="pointer-events-auto w-full max-w-md" role="alert">
            {wiki.storageError}
        </Alert>
    {/if}

    <ConnectionStatus />

    <UpdateBanner />
</div>
