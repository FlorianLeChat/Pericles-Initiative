<script lang="ts">
    /**
     * Site wide banner shown while an alert is recent.
     *
     * @author Claude
     */
    import { wiki } from "$lib/state/wiki.svelte";
    import { relativeTime } from "$lib/utilities/date";

    let dismissed = $state( false );

    const item = $derived( wiki.breaking );
</script>

{#if item && !dismissed}
    <aside class="bg-alert-500 text-white" aria-label="Alerte en cours">
        <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm sm:px-6">
            <span class="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tracking-wide uppercase">
                Alerte
            </span>
            <a href="/direct" class="min-w-0 flex-1 truncate font-medium hover:underline">{item.title}</a>
            <span class="hidden shrink-0 text-xs text-white/80 sm:block">{relativeTime( item.publishedAt )}</span>
            <button
                type="button"
                class="shrink-0 cursor-pointer rounded-full px-2 py-0.5 text-white/80 transition hover:bg-white/20 hover:text-white"
                onclick={() => ( dismissed = true )}
                aria-label="Masquer l'alerte"
            >
                &times;
            </button>
        </div>
    </aside>
{/if}
