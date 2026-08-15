<script lang="ts">
    /**
     * Root layout: installs the dataset, then frames every page.
     *
     * @author Claude
     */
    import "../app.css";
    import { env } from "$env/dynamic/public";
    import Alert from "flowbite-svelte/Alert.svelte";
    import { asset } from "$app/paths";
    import { untrack, type Snippet } from "svelte";
    import { onNavigate } from "$app/navigation";
    import ConnectionStatus from "$lib/components/ConnectionStatus.svelte";
    import BreakingBanner from "$lib/components/live/BreakingBanner.svelte";
    import SearchDialog from "$lib/components/SearchDialog.svelte";
    import SiteHeader from "$lib/components/SiteHeader.svelte";
    import UpdateBanner from "$lib/components/UpdateBanner.svelte";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { LayoutData } from "./$types";

    interface Props {
        data: LayoutData;
        children: Snippet;
    }

    const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

    let { data, children }: Props = $props();

    /**
     * Address of the tab icon: the wiki's own logo once one is set, the bundled
     * default otherwise.
     *
     * Kept as a single `<link>` whose `href` changes, rather than toggling
     * between two `<link>` elements through an `{#if}`. The latter is what made
     * the default favicon stick in some browsers even after a logo was saved:
     * removing and inserting a fresh node raced the browser's own favicon
     * lookup, which some engines only redo when the existing `<link>` changes in
     * place. A single reactive node cannot lose that race.
     */
    const favicon = $derived( wiki.meta.logo || asset( "/assets/favicon.svg" ) );

    /** Only the bundled default is actually an svg; an author's logo can be anything. */
    const faviconType = $derived( wiki.meta.logo ? undefined : "image/svg+xml" );

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

    /*
     * Paints the site in the accent chosen in the settings.
     *
     * The key is written on the root element rather than resolved into colours
     * here: `app.css` holds the six ramps, so this stays out of the way of the
     * dark theme, which retouches a stop of its own. Running in an effect is what
     * keeps the prerendered HTML free of overlay data, at the cost of a first
     * paint in the default accent, the same moment where the wiki is still empty.
     */
    $effect( () =>
    {
        document.documentElement.dataset.accent = wiki.meta.accent;
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
    <link rel="icon" href={favicon} type={faviconType} sizes="any" />
    <link rel="manifest" href={asset( "/manifest.webmanifest" )} crossorigin="use-credentials" />

    {#if env.PUBLIC_ANALYTICS_ENABLED === "true"}
        <script
            src={env.PUBLIC_ANALYTICS_ENDPOINT}
            defer
            data-website-id={env.PUBLIC_ANALYTICS_PROJECT_ID}
            data-performance="true"
            data-do-not-track={env.PUBLIC_ANALYTICS_RESPECT_DNT}
            data-exclude-hash="true"
            data-exclude-search="true"
        ></script>
    {/if}
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<a
    href="#contenu"
    class="bg-accent-600 focus:ring-accent-500 sr-only rounded-full px-4 py-2 text-sm font-medium text-white
           focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:ring-2 focus:ring-offset-2"
>
    {m.layout_skip_link()}
</a>

<BreakingBanner />

<SiteHeader onsearch={() => ( searchOpen = true )} />

<main id="contenu" tabindex="-1" class="flex-1 focus:outline-none">
    {@render children()}
</main>

<SearchDialog bind:open={searchOpen} />

<div class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-start gap-2 sm:inset-x-6">
    {#if wiki.storageError}
        <Alert color="red" class="pointer-events-auto w-full max-w-md max-sm:max-w-none" role="alert">
            {wiki.storageError}
        </Alert>
    {/if}

    <ConnectionStatus />

    <UpdateBanner />
</div>
