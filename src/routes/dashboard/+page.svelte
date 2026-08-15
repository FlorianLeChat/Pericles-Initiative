<script lang="ts">
    /**
     * Dashboard: the state of the corpus, and what is left to write.
     *
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import { resolve } from "$app/paths";
    import ActivityChart from "$lib/components/dashboard/ActivityChart.svelte";
    import BarChart from "$lib/components/dashboard/BarChart.svelte";
    import StatCard from "$lib/components/dashboard/StatCard.svelte";
    import PageHeader from "$lib/components/PageHeader.svelte";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import { formatShortDate } from "$lib/utilities/date";
    import { pluralize } from "$lib/utilities/plural";
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
    <title>{m.dashboard_title( { universe: wiki.meta.universe } )}</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <PageHeader title={m.dashboard_heading()}>
        {#snippet description()}
            {m.dashboard_description()}
        {/snippet}
    </PageHeader>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
            label={m.common_entries_label()}
            value={stats.total}
            hint={m.dashboard_stat_entries_hint( { published: stats.published, drafts: stats.drafts } )}
            index={0}
        />

        <StatCard
            label={m.dashboard_stat_words_label()}
            value={stats.words.toLocaleString( "fr-FR" )}
            hint={m.dashboard_stat_words_hint( { averageWords: stats.averageWords } )}
            index={1}
        />

        <StatCard label={m.common_categories_label()} value={stats.categories} index={2} />

        <StatCard
            label={m.dashboard_stat_live_label()}
            value={stats.liveItems}
            hint={m.dashboard_stat_live_hint()}
            index={3}
        />
    </div>

    <section class="surface mt-10 p-6">
        <h2 class="font-serif text-xl font-semibold tracking-tight">{m.dashboard_by_category_heading()}</h2>

        <div class="mt-5">
            {#if stats.byCategory.length === 0}
                <p class="text-muted text-sm">{m.dashboard_by_category_empty()}</p>
            {:else}
                <BarChart items={stats.byCategory} href={( item ) => `/categories/${ item.key }`} />
            {/if}
        </div>
    </section>

    <section class="surface mt-6 p-6">
        <h2 class="font-serif text-xl font-semibold tracking-tight">{m.dashboard_activity_heading()}</h2>

        <p class="text-muted mt-1 text-sm">{m.dashboard_activity_description()}</p>

        <div class="mt-6">
            <ActivityChart points={stats.activity} />
        </div>
    </section>

    <div class="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section class="surface p-6">
            <h2 class="font-serif text-xl font-semibold tracking-tight">{m.dashboard_most_linked_heading()}</h2>

            {#if stats.mostLinked.length === 0}
                <p class="text-muted mt-4 text-sm">{m.dashboard_most_linked_empty()}</p>
            {:else}
                <ul class="mt-5 space-y-2.5 text-sm">
                    {#each stats.mostLinked as item ( item.entry.id )}
                        <li class="flex items-center gap-2">
                            <a href={resolve( `/wiki/${ item.entry.slug }` )} class="wiki-link min-w-0 flex-1 truncate">
                                {item.entry.title}
                            </a>

                            <span class="text-muted font-mono text-xs">
                                {pluralize( item.incoming, {
                                    one: m.common_count_lien_one,
                                    other: m.common_count_lien_other
                                } )}
                            </span>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>

        <section class="surface p-6">
            <h2 class="font-serif text-xl font-semibold tracking-tight">{m.dashboard_missing_heading()}</h2>

            {#if stats.missing.length === 0}
                <p class="text-muted mt-4 text-sm">{m.dashboard_missing_empty()}</p>
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
                                {m.dashboard_missing_cited( { count: item.count } )}
                            </span>

                            <Button
                                href={resolve( `/new?slug=${ item.slug }` )}
                                color="alternative"
                                size="xs"
                                class="shrink-0 rounded-full"
                                aria-label={m.dashboard_missing_create_aria( { slug: item.slug } )}
                            >
                                {m.common_create_action()}
                            </Button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>
    </div>

    <div class="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section class="surface p-6">
            <h2 class="font-serif text-xl font-semibold tracking-tight">{m.dashboard_issues_heading()}</h2>

            {#if stats.issues.length === 0}
                <p class="text-muted mt-4 text-sm">{m.dashboard_issues_empty()}</p>
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
                                        {m.dashboard_issues_more( { count: issue.entries.length - 8 } )}
                                    </li>
                                {/if}
                            </ul>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>

        <section class="surface p-6">
            <h2 class="font-serif text-xl font-semibold tracking-tight">{m.common_recent_changes_heading()}</h2>

            <ul class="mt-5 space-y-2.5 text-sm">
                {#each recent as entry ( entry.id )}
                    <li class="flex items-center gap-2">
                        <a href={resolve( `/wiki/${ entry.slug }` )} class="wiki-link min-w-0 flex-1 truncate"
                            >{entry.title}</a
                        >

                        {#if entry.status === "brouillon"}
                            <span class="text-muted text-xs">{m.dashboard_draft_label()}</span>
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
