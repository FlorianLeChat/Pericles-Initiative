<script lang="ts">
    /**
     * Footer: universe identity and state of the dataset.
     *
     * @author Claude
     */
    import { NAV_LINKS, TOOL_LINKS } from "$lib/config/navigation";
    import { wiki } from "$lib/state/wiki.svelte";
    import { formatShortDate } from "$lib/utilities/date";
</script>

<footer class="border-paper-200 dark:border-ink-800 mt-20 border-t">
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div class="space-y-2">
            <p class="font-serif text-lg font-semibold tracking-tight">{wiki.meta.universe}</p>
            <p class="text-ink-400 max-w-sm text-sm leading-relaxed">{wiki.meta.tagline}</p>
        </div>

        <nav aria-label="Navigation secondaire">
            <p class="text-ink-400 mb-3 text-xs tracking-wide uppercase">Parcourir</p>
            <ul class="space-y-1.5 text-sm">
                {#each NAV_LINKS as link ( link.href )}
                    <li>
                        <a href={link.href} class="wiki-link">{link.label}</a>
                    </li>
                {/each}
            </ul>
        </nav>

        <nav aria-label="Outils">
            <p class="text-ink-400 mb-3 text-xs tracking-wide uppercase">Atelier</p>
            <ul class="space-y-1.5 text-sm">
                {#each TOOL_LINKS as link ( link.href )}
                    <li>
                        <a href={link.href} class="wiki-link">{link.label}</a>
                    </li>
                {/each}
            </ul>
        </nav>

        <div>
            <p class="text-ink-400 mb-3 text-xs tracking-wide uppercase">Données</p>
            <dl class="text-ink-400 space-y-1.5 text-sm">
                <div class="flex gap-2">
                    <dt>Fiches :</dt>
                    <dd class="text-ink-600 dark:text-paper-300 font-medium">{wiki.entries.length}</dd>
                </div>
                <div class="flex gap-2">
                    <dt>Version :</dt>
                    <dd class="text-ink-600 dark:text-paper-300 font-medium">{wiki.meta.version}</dd>
                </div>
                {#if wiki.meta.updatedAt}
                    <div class="flex gap-2">
                        <dt>Mise à jour :</dt>
                        <dd class="text-ink-600 dark:text-paper-300 font-medium">
                            {formatShortDate( wiki.meta.updatedAt )}
                        </dd>
                    </div>
                {/if}
            </dl>
        </div>
    </div>

    <p class="text-ink-400 mx-auto max-w-6xl px-4 pb-8 text-xs sm:px-6">
        Univers de fiction. Toute ressemblance avec des personnes ou des organisations réelles serait
        fortuite.
    </p>
</footer>
