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
    import RefreshCw from "@lucide/svelte/icons/refresh-cw";
    import Button from "flowbite-svelte/Button.svelte";
    import Toast from "flowbite-svelte/Toast.svelte";
    import { browser } from "$app/environment";
    import { motionDuration } from "$lib/config/motion";
    import { ACTIVATE_NOW } from "$lib/config/service-worker";

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
    <Toast
        dismissable={false}
        color="gray"
        params={{ duration: motionDuration() }}
        class="surface text-ink-800 dark:text-paper-200 pointer-events-auto w-full max-w-md rounded-2xl p-4 shadow-lg
               max-sm:max-w-none"
        aria-label="Mise à jour disponible"
    >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="flex items-center gap-2.5 text-sm">
                <RefreshCw class="text-accent-600 dark:text-accent-400 h-4 w-4 shrink-0" />
                Une nouvelle version du site est prête.
            </p>

            <div class="flex shrink-0 gap-2">
                <Button color="alternative" size="sm" onclick={() => ( waiting = null )}>Plus tard</Button>

                <Button color="primary" size="sm" onclick={accept} disabled={reloading} loading={reloading}>
                    {reloading ? "Chargement..." : "Recharger"}
                </Button>
            </div>
        </div>
    </Toast>
{/if}
