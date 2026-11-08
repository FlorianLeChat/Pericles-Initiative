<script lang="ts">
    /**
     * Site wide banner shown while an alert is recent.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import X from "@lucide/svelte/icons/x";
    import { cubicOut } from "svelte/easing";
    import { slide } from "svelte/transition";
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import { ICON_BUTTON } from "#lib/config/forms.ts";
    import { relativeTime } from "#lib/utilities/date.ts";
    import { motionDuration } from "#lib/config/motion.ts";

    let dismissed = $state( false );

    const item = $derived( wiki.breaking );
</script>

{#if item && !dismissed}
    <aside
        id="breaking-banner"
        class="bg-alert-600 text-white"
        aria-label={m.breaking_banner_aria()}
        transition:slide={{ duration: motionDuration( 260 ), easing: cubicOut }}
    >
        <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm sm:px-6">
            <span class="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tracking-wide uppercase">
                {m.breaking_banner_badge()}
            </span>

            <a href={resolve( "/live" )} class="min-w-0 flex-1 truncate font-medium hover:underline">{item.title}</a>

            <time datetime={item.publishedAt} class="hidden shrink-0 text-xs text-white/80 sm:block">
                {relativeTime( item.publishedAt )}
            </time>

            <button
                type="button"
                class="inline-flex {ICON_BUTTON} shrink-0 items-center justify-center rounded-full
                       text-white/80 transition hover:bg-white/20 hover:text-white"
                onclick={() => ( dismissed = true )}
                aria-label={m.breaking_banner_dismiss()}
            >
                <X class="h-4 w-4" />
            </button>
        </div>
    </aside>
{/if}
