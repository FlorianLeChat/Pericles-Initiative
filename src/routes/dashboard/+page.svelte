<script lang="ts">
    /**
     * Dashboard: the author's workbench. A quiet summary of the corpus, then what
     * is left to write on the left, and how the corpus stands on the right.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { getLocale } from "#lib/locales/runtime.js";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { paletteColor } from "#lib/config/palette.ts";
    import { humanizeSlug } from "#lib/utilities/slug.ts";
    import { computeStats } from "#lib/utilities/stats.ts";
    import { formatShortDate } from "#lib/utilities/date.ts";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import BarChart from "#lib/components/dashboard/BarChart.svelte";
    import StatCard from "#lib/components/dashboard/StatCard.svelte";
    import ActivityChart from "#lib/components/dashboard/ActivityChart.svelte";

    /** How many pages of a point of attention are named before the rest is summed up. */
    const ISSUE_PREVIEW = 8;

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

    const words = $derived( new Intl.NumberFormat( getLocale() ).format( stats.words ) );

    const missing = $derived( stats.missing.map( ( item ) => ( { ...item, title: humanizeSlug( item.slug ) } ) ) );

    const recent = $derived( wiki.recentlyUpdated.slice( 0, 8 ) );
</script>

<PageMeta title={m.dashboard_title( { universe: wiki.meta.universe } )} />

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <PageHeader title={m.dashboard_heading()}>
        {#snippet description()}
            {m.dashboard_description()}
        {/snippet}
    </PageHeader>

    <dl
        class="border-paper-200 dark:border-ink-800 bg-paper-200 dark:bg-ink-800 mt-8 grid grid-cols-2 gap-px
               overflow-hidden rounded-xl border lg:grid-cols-4"
    >
        <StatCard
            label={m.common_entries_label()}
            value={stats.total}
            hint={m.dashboard_stat_entries_hint( { published: stats.published, drafts: stats.drafts } )}
        />

        <StatCard
            label={m.dashboard_stat_words_label()}
            value={words}
            hint={m.dashboard_stat_words_hint( { averageWords: stats.averageWords } )}
        />

        <StatCard label={m.common_categories_label()} value={stats.categories} />

        <StatCard label={m.dashboard_stat_live_label()} value={stats.liveItems} hint={m.dashboard_stat_live_hint()} />
    </dl>

    <div class="mt-12 grid grid-cols-1 items-start gap-x-12 gap-y-12 lg:grid-cols-2">
        <div class="space-y-12">
            <section>
                <h2 class="section-heading">{m.dashboard_missing_heading()}</h2>

                {#if missing.length === 0}
                    <p class="text-muted mt-3 text-sm">{m.dashboard_missing_empty()}</p>
                {:else}
                    <ul
                        class="divide-paper-200 dark:divide-ink-800 border-paper-200 dark:border-ink-800 mt-4 divide-y
                               border-y text-sm"
                    >
                        {#each missing as item ( item.slug )}
                            <li class="flex items-center gap-3 py-2.5">
                                <a href={resolve( `wiki/${ item.slug }/` )} class="wiki-link-missing min-w-0 truncate">
                                    {item.title}
                                </a>

                                <span class="text-muted flex-1 shrink-0 text-xs">
                                    {pluralize( item.count, {
                                        one: m.dashboard_missing_cited_one,
                                        other: m.dashboard_missing_cited_other
                                    } )}
                                </span>

                                <Button
                                    href={resolve(
                                        `new/?slug=${ encodeURIComponent( item.slug ) }&titre=${ encodeURIComponent( item.title ) }`
                                    )}
                                    color="alternative"
                                    size="xs"
                                    class="shrink-0 rounded-full"
                                    aria-label={m.dashboard_missing_create_aria( { title: item.title } )}
                                >
                                    {m.common_create_action()}
                                </Button>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </section>

            <section>
                <h2 class="section-heading">{m.dashboard_issues_heading()}</h2>

                {#if stats.issues.length === 0}
                    <p class="text-muted mt-3 text-sm">{m.dashboard_issues_empty()}</p>
                {:else}
                    <div class="divide-paper-200 dark:divide-ink-800 border-paper-200 dark:border-ink-800 mt-4 divide-y border-y">
                        {#each stats.issues as issue ( issue.key )}
                            <div class="py-3">
                                <h3 class="text-sm font-medium">
                                    {issue.label}
                                    <span class="text-muted font-normal">({issue.entries.length})</span>
                                </h3>

                                <ul class="mt-2 flex flex-wrap gap-1.5">
                                    {#each issue.entries.slice( 0, ISSUE_PREVIEW ) as entry ( entry.id )}
                                        <li>
                                            <a
                                                href={resolve( `wiki/${ entry.slug }/` )}
                                                class="border-paper-300 dark:border-ink-700 hover:border-accent-400 rounded-full border
                                                       px-2.5 py-0.5 text-xs transition"
                                            >
                                                {entry.title}
                                            </a>
                                        </li>
                                    {/each}

                                    {#if issue.entries.length > ISSUE_PREVIEW}
                                        <li class="text-muted self-center text-xs">
                                            {m.dashboard_issues_more( { count: issue.entries.length - ISSUE_PREVIEW } )}
                                        </li>
                                    {/if}
                                </ul>
                            </div>
                        {/each}
                    </div>
                {/if}
            </section>
        </div>

        <div class="space-y-12">
            <section>
                <h2 class="section-heading">{m.dashboard_most_linked_heading()}</h2>

                {#if stats.mostLinked.length === 0}
                    <p class="text-muted mt-3 text-sm">{m.dashboard_most_linked_empty()}</p>
                {:else}
                    <ol
                        class="divide-paper-200 dark:divide-ink-800 border-paper-200 dark:border-ink-800 mt-4 divide-y
                               border-y text-sm"
                    >
                        {#each stats.mostLinked as item ( item.entry.id )}
                            <li class="flex items-center gap-3 py-2.5">
                                <a href={resolve( `wiki/${ item.entry.slug }/` )} class="wiki-link min-w-0 flex-1 truncate">
                                    {item.entry.title}
                                </a>

                                <span class="text-muted shrink-0 text-xs">
                                    {pluralize( item.incoming, {
                                        one: m.common_count_lien_one,
                                        other: m.common_count_lien_other
                                    } )}
                                </span>
                            </li>
                        {/each}
                    </ol>
                {/if}
            </section>

            <section>
                <h2 class="section-heading">{m.dashboard_by_category_heading()}</h2>

                <div class="mt-4">
                    {#if stats.byCategory.length === 0}
                        <p class="text-muted text-sm">{m.dashboard_by_category_empty()}</p>
                    {:else}
                        <BarChart
                            items={stats.byCategory}
                            href={( item ) => `categories/${ item.key }/`}
                            tint={( item ) => paletteColor( wiki.categoriesBySlug.get( item.key )?.color ).dot}
                        />
                    {/if}
                </div>
            </section>

            <section>
                <h2 class="section-heading">{m.dashboard_activity_heading()}</h2>

                <p class="text-muted mt-1 text-sm">{m.dashboard_activity_description()}</p>

                <div class="mt-5">
                    <ActivityChart points={stats.activity} />
                </div>
            </section>

            <section>
                <h2 class="section-heading">{m.common_recent_changes_heading()}</h2>

                {#if recent.length === 0}
                    <p class="text-muted mt-3 text-sm">{m.dashboard_recent_empty()}</p>
                {:else}
                    <ul
                        class="divide-paper-200 dark:divide-ink-800 border-paper-200 dark:border-ink-800 mt-4 divide-y
                               border-y text-sm"
                    >
                        {#each recent as entry ( entry.id )}
                            <li class="flex items-center gap-3 py-2.5">
                                <a href={resolve( `wiki/${ entry.slug }/` )} class="wiki-link min-w-0 flex-1 truncate">
                                    {entry.title}
                                </a>

                                {#if entry.status === "brouillon"}
                                    <span class="text-muted text-xs">{m.dashboard_draft_label()}</span>
                                {/if}

                                <time datetime={entry.updatedAt} class="text-muted shrink-0 text-xs">
                                    {formatShortDate( entry.updatedAt )}
                                </time>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </section>
        </div>
    </div>
</div>
