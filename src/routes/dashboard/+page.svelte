<script lang="ts">
    /**
     * Dashboard: the state of the corpus, and what is left to write.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import ActivityChart from "$lib/components/dashboard/ActivityChart.svelte";
    import BarChart from "$lib/components/dashboard/BarChart.svelte";
    import StatCard from "$lib/components/dashboard/StatCard.svelte";
    import TypeBadge from "$lib/components/TypeBadge.svelte";
    import { wiki } from "$lib/state/wiki.svelte";
    import { formatShortDate } from "$lib/utilities/date";
    import { computeStats } from "$lib/utilities/stats";

    const stats = $derived(
        computeStats( {
            entries: wiki.entries,
            categories: wiki.categories,
            live: wiki.live,
            incomingLinks: wiki.incomingLinks,
            outgoingLinks: wiki.outgoingLinks,
            missingLinks: wiki.missingLinks
        } )
    );

    const recent = $derived( wiki.recentlyUpdated.slice( 0, 8 ) );
</script>

<svelte:head>
    <title>Tableau de bord · {wiki.meta.universe}</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <header class="max-w-2xl">
        <h1 class="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Tableau de bord</h1>

        <p class="text-muted mt-3 leading-relaxed">
            L'état du corpus, calculé sur ce que le site affiche en ce moment, modifications locales comprises.
        </p>
    </header>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
            label="Fiches"
            value={stats.total}
            hint="{stats.published} publiées, {stats.drafts} en brouillon"
            index={0}
        />
        <StatCard
            label="Mots"
            value={stats.words.toLocaleString( "fr-FR" )}
            hint="{stats.averageWords} par fiche en moyenne"
            index={1}
        />
        <StatCard label="Catégories" value={stats.categories} index={2} />
        <StatCard label="Fil en direct" value={stats.liveItems} hint="entrées publiées" index={3} />
    </div>

    <div class="mt-10 grid items-start gap-6 lg:grid-cols-2">
        <section class="surface p-6">
            <h2 class="font-serif text-xl font-semibold tracking-tight">Par nature</h2>

            <div class="mt-5">
                <BarChart items={stats.byType} />
            </div>
        </section>

        <section class="surface p-6">
            <h2 class="font-serif text-xl font-semibold tracking-tight">Par catégorie</h2>

            <div class="mt-5">
                {#if stats.byCategory.length === 0}
                    <p class="text-muted text-sm">Aucune catégorie déclarée.</p>
                {:else}
                    <BarChart items={stats.byCategory} href={( item ) => `/categories/${ item.key }`} />
                {/if}
            </div>
        </section>
    </div>

    <section class="surface mt-6 p-6">
        <h2 class="font-serif text-xl font-semibold tracking-tight">Activité d'édition</h2>

        <p class="text-muted mt-1 text-sm">Nombre de fiches modifiées par mois, sur un an.</p>

        <div class="mt-6">
            <ActivityChart points={stats.activity} />
        </div>
    </section>

    <div class="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section class="surface p-6">
            <h2 class="font-serif text-xl font-semibold tracking-tight">Fiches les plus citées</h2>

            {#if stats.mostLinked.length === 0}
                <p class="text-muted mt-4 text-sm">Aucun lien entre fiches pour l'instant.</p>
            {:else}
                <ul class="mt-5 space-y-2.5 text-sm">
                    {#each stats.mostLinked as item ( item.entry.id )}
                        <li class="flex items-center gap-2">
                            <TypeBadge type={item.entry.type} iconOnly />

                            <a href={resolve( `/wiki/${ item.entry.slug }` )} class="wiki-link min-w-0 flex-1 truncate">
                                {item.entry.title}
                            </a>

                            <span class="text-muted font-mono text-xs">
                                {item.incoming}
                                {item.incoming === 1 ? "lien" : "liens"}
                            </span>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>

        <section class="surface p-6">
            <h2 class="font-serif text-xl font-semibold tracking-tight">Pages à écrire</h2>

            <p class="text-muted mt-1 text-sm">
                Les liens rouges, c'est à dire les fiches que le corpus réclame déjà.
            </p>

            {#if stats.missing.length === 0}
                <p class="text-muted mt-4 text-sm">Aucun lien rouge, tout ce qui est cité existe.</p>
            {:else}
                <ul class="mt-5 space-y-2.5 text-sm">
                    {#each stats.missing as item ( item.slug )}
                        <li class="flex items-center gap-2">
                            <a
                                href={resolve( `/wiki/${ item.slug }` )}
                                class="wiki-link-missing min-w-0 flex-1 truncate font-mono text-xs"
                            >
                                {item.slug}
                            </a>

                            <span class="text-muted shrink-0 text-xs">
                                cité {item.count}
                                {item.count === 1 ? "fois" : "fois"}
                            </span>

                            <a
                                href={resolve( `/new?slug=${ item.slug }` )}
                                class="btn btn-outline shrink-0 px-2.5 py-1 text-xs"
                            >
                                Créer
                            </a>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>
    </div>

    <div class="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section class="surface p-6">
            <h2 class="font-serif text-xl font-semibold tracking-tight">Points d'attention</h2>

            {#if stats.issues.length === 0}
                <p class="text-muted mt-4 text-sm">Rien à signaler sur le corpus.</p>
            {:else}
                <div class="mt-5 space-y-4">
                    {#each stats.issues as issue ( issue.key )}
                        <div>
                            <p class="text-sm font-medium">
                                {issue.label}
                                <span class="text-muted font-normal">({issue.entries.length})</span>
                            </p>

                            <ul class="mt-1.5 flex flex-wrap gap-1.5">
                                {#each issue.entries.slice( 0, 8 ) as entry ( entry.id )}
                                    <li>
                                        <a
                                            href={resolve( `/wiki/${ entry.slug }` )}
                                            class="border-paper-300 dark:border-ink-800 hover:border-accent-400 rounded-full border px-2.5 py-0.5 text-xs transition"
                                        >
                                            {entry.title}
                                        </a>
                                    </li>
                                {/each}

                                {#if issue.entries.length > 8}
                                    <li class="text-muted self-center text-xs">
                                        et {issue.entries.length - 8} autres
                                    </li>
                                {/if}
                            </ul>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>

        <section class="surface p-6">
            <h2 class="font-serif text-xl font-semibold tracking-tight">Dernières modifications</h2>

            <ul class="mt-5 space-y-2.5 text-sm">
                {#each recent as entry ( entry.id )}
                    <li class="flex items-center gap-2">
                        <TypeBadge type={entry.type} iconOnly />

                        <a href={resolve( `/wiki/${ entry.slug }` )} class="wiki-link min-w-0 flex-1 truncate"
                            >{entry.title}</a
                        >

                        {#if entry.status === "brouillon"}
                            <span class="text-muted text-xs">brouillon</span>
                        {/if}

                        <time datetime={entry.updatedAt} class="text-muted shrink-0 font-mono text-xs">
                            {formatShortDate( entry.updatedAt )}
                        </time>
                    </li>
                {/each}
            </ul>
        </section>
    </div>
</div>
