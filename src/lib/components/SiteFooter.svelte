<script lang="ts">
    /**
     * Footer: universe identity and state of the dataset.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import { NAV_LINKS, TOOL_LINKS } from "$lib/config/navigation";
    import { wiki } from "$lib/state/wiki.svelte";
    import { formatShortDate } from "$lib/utilities/date";
</script>

<footer class="border-paper-200 dark:border-ink-800 mt-20 border-t">
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div class="space-y-2">
            <p class="font-serif text-lg font-semibold tracking-tight">{wiki.meta.universe}</p>
            <p class="text-muted max-w-sm text-sm leading-relaxed">{wiki.meta.tagline}</p>
        </div>

        <nav aria-label="Navigation secondaire">
            <p class="text-muted mb-3 text-xs tracking-wide uppercase">Parcourir</p>

            <ul class="space-y-1.5 text-sm">
                {#each NAV_LINKS as link ( link.href )}
                    <li>
                        <a href={resolve( link.href )} class="wiki-link">{link.label}</a>
                    </li>
                {/each}
            </ul>
        </nav>

        <nav aria-label="Outils">
            <p class="text-muted mb-3 text-xs tracking-wide uppercase">Atelier</p>

            <ul class="space-y-1.5 text-sm">
                {#each TOOL_LINKS as link ( link.href )}
                    <li>
                        <a href={resolve( link.href )} class="wiki-link">{link.label}</a>
                    </li>
                {/each}
            </ul>
        </nav>

        <div>
            <p class="text-muted mb-3 text-xs tracking-wide uppercase">Données</p>

            <dl class="text-muted space-y-1.5 text-sm">
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
                            <time datetime={wiki.meta.updatedAt}>{formatShortDate( wiki.meta.updatedAt )}</time>
                        </dd>
                    </div>
                {/if}
            </dl>
        </div>
    </div>
</footer>
