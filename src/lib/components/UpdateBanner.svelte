<script lang="ts">
    /**
     * Offers to load a newly deployed version of the site.
     *
     * A service worker that finds a new build installs it and then waits, rather
     * than taking over on its own: swapping the shell under an article being
     * written would reload the page and lose what the editor holds. Nothing moves
     * until the reader accepts, and the offer survives a navigation since this
     * lives in the layout.
     *
     * The registration is watched directly rather than through SvelteKit's
     * `updated` store, which polls its own version file and knows nothing about
     * what the worker has actually finished downloading.
     *
     * @author Claude
     */
    import { browser } from "$app/environment";
    import Icon from "$lib/components/Icon.svelte";
    import { ACTIVATE_NOW } from "$lib/config/service-worker";

    const REFRESH = "M4.5 12a7.5 7.5 0 0 1 12.8-5.3M19.5 12a7.5 7.5 0 0 1-12.8 5.3M17.3 3.5v3.2h-3.2M6.7 20.5v-3.2h3.2";

    let waiting = $state<ServiceWorker | null>( null );
    let reloading = $state( false );

    /**
     * Remembers a worker that has finished installing and is waiting its turn.
     *
     * A worker installed while no other one controls the page is the very first
     * one: it takes over immediately and there is nothing new to offer, so the
     * controller check is what tells an update apart from a first visit.
     *
     * @param registration Registration of the site's worker.
     * @author Claude
     */
    const watch = ( registration: ServiceWorkerRegistration ): void =>
    {
        const controlled = navigator.serviceWorker.controller !== null;

        if ( registration.waiting && controlled )
        {
            waiting = registration.waiting;
        }

        registration.addEventListener( "updatefound", () =>
        {
            const installing = registration.installing;

            if ( !installing )
            {
                return;
            }

            installing.addEventListener( "statechange", () =>
            {
                if ( installing.state === "installed" && navigator.serviceWorker.controller )
                {
                    waiting = installing;
                }
            } );
        } );
    };

    $effect( () =>
    {
        if ( !browser || !( "serviceWorker" in navigator ) )
        {
            return;
        }

        void navigator.serviceWorker.getRegistration().then( ( registration ) =>
        {
            if ( registration )
            {
                watch( registration );
            }
        } );

        // The new worker taking control is the moment the page can be reloaded on
        // the new shell. Guarded, because a worker calling `clients.claim` on a
        // page that never asked for it would otherwise reload it under the reader.
        navigator.serviceWorker.addEventListener( "controllerchange", () =>
        {
            if ( reloading )
            {
                location.reload();
            }
        } );
    } );

    /**
     * Accepts the update: the waiting worker takes over, then the page reloads.
     *
     * @author Claude
     */
    const accept = (): void =>
    {
        if ( !waiting )
        {
            return;
        }

        reloading = true;
        waiting.postMessage( ACTIVATE_NOW );
    };
</script>

{#if waiting}
    <aside
        class="surface fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-col gap-3 p-4 shadow-lg sm:flex-row
               sm:items-center sm:justify-between"
        aria-label="Mise à jour disponible"
    >
        <p class="flex items-center gap-2 text-sm">
            <Icon path={REFRESH} class="h-4 w-4 shrink-0" />
            Une nouvelle version du site est prête.
        </p>

        <div class="flex shrink-0 gap-2">
            <button type="button" class="btn btn-ghost" onclick={() => ( waiting = null )}>Plus tard</button>
            <button type="button" class="btn btn-primary" onclick={accept} disabled={reloading}>
                {reloading ? "Chargement..." : "Recharger"}
            </button>
        </div>
    </aside>
{/if}
