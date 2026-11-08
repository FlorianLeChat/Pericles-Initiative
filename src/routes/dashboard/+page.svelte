<script lang="ts">
    /**
     * Dashboard: the author's workbench. A quiet summary of the corpus, then what
     * is left to write on the left, and how the corpus stands on the right.
     *
     * The latest edits close the left column rather than the right one: holding
     * the cited pages, the categories and the activity as well, the right column
     * ran some eight hundred pixels past the left at 1440; moved, they let the two
     * columns end within a few lines of each other.
     *
     * An empty wiki shows no figures at all: four zeros above the invitation to
     * write the first page said nothing the invitation does not.
     *
     * @author Claude
     */
    import { resolve } from "$app/paths";
    import * as m from "#lib/locales/messages.js";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import { getLocale } from "#lib/locales/runtime.js";
    import { TOUCH_HEIGHT } from "#lib/config/forms.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { paletteColor } from "#lib/config/palette.ts";
    import { humanizeSlug } from "#lib/utilities/slug.ts";
    import { reading } from "#lib/state/reading.svelte.ts";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import ToolsNav from "#lib/components/layout/ToolsNav.svelte";
    import BarChart from "#lib/components/dashboard/BarChart.svelte";
    import StatCard from "#lib/components/dashboard/StatCard.svelte";
    import { computeStats, SHORT_PAGE_WORDS } from "#lib/utilities/stats.ts";
    import ActivityChart from "#lib/components/dashboard/ActivityChart.svelte";
    import { formatShortDate, formatUniverseDate } from "#lib/utilities/date.ts";

    /**
     * How many pages in want of something are named before the rest is summed up,
     * the least finished first. Each is a row of its own carrying its gaps, with a
     * «Modifier» beside it, and the whole row reaches the page: a pill per page
     * read as a category chip and was a 20px target on a phone.
     */
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

    /**
     * True when no page was edited over the whole span of the chart, which then
     * gives way to a sentence: twelve bars at zero say the same thing less
     * plainly, and on a fresh browser they were most of the page. The line
     * describing the chart leaves with it, rather than introducing a chart that
     * is not there.
     */
    const quietYear = $derived( stats.activity.every( ( point ) => point.count === 0 ) );

    /**
     * Line under the activity heading, naming the first and last month in full:
     * the columns only carry a short month, and twelve of them cross a new year
     * every time but in January.
     */
    const activitySpan = $derived(
        m.dashboard_activity_description( {
            from: formatUniverseDate( stats.activity[ 0 ]?.month ),
            to: formatUniverseDate( stats.activity.at( -1 )?.month )
        } )
    );
</script>

<PageMeta title={m.dashboard_title( { universe: wiki.meta.universe } )} />

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <PageHeader title={m.dashboard_heading()} rule={false}>
        {#snippet description()}
            {m.dashboard_description()}
        {/snippet}
    </PageHeader>

    <ToolsNav />

    {#if stats.total > 0}
        <dl
            class="border-paper-200 dark:border-ink-700 bg-paper-200 dark:bg-ink-800 mt-8 grid grid-cols-2 gap-px
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

            <StatCard label={m.common_live_label()} value={stats.liveItems} hint={m.dashboard_stat_live_hint()} />
        </dl>
    {/if}

    {#if stats.total === 0}
        <div class="mt-10">
            <EmptyState title={m.common_empty_wiki_title()} description={m.common_empty_wiki_description()}>
                <Button href={resolve( "/new" )} color="alternative">{m.common_create_entry()}</Button>
                <a href={resolve( "/data" )} class="wiki-link content-center text-sm text-balance {TOUCH_HEIGHT}">{m.home_empty_demo_link()}</a>
            </EmptyState>
        </div>
    {:else}
        <div class="mt-12 grid grid-cols-1 items-start gap-x-12 gap-y-12 lg:grid-cols-2">
            <div class="space-y-12">
                <section>
                    <h2 class="section-heading">{m.dashboard_missing_heading()}</h2>

                    {#if missing.length === 0}
                        <p class="text-muted mt-3 text-sm">{m.dashboard_missing_empty()}</p>
                    {:else}
                        <ul
                            class="divide-paper-200 dark:divide-ink-700 border-paper-200 dark:border-ink-700 mt-4
                                   divide-y
                                   border-y text-sm"
                        >
                            {#each missing as item ( item.slug )}
                                <li class="flex items-center gap-3 sm:py-2.5">
                                    <a
                                        href={resolve( `entries/${ item.slug }/` )}
                                        class="wiki-link-missing min-w-0 truncate block content-center {TOUCH_HEIGHT}"
                                    >
                                        {item.title}
                                    </a>

                                    <span class="text-muted flex-1 shrink-0 text-xs">
                                        {pluralize( item.count, {
                                            one: m.dashboard_cited_one,
                                            other: m.dashboard_cited_other
                                        } )}
                                    </span>

                                    {#if !reading.enabled}
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
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </section>

                <section>
                    <h2 id="dashboard-issues" class="section-heading scroll-mt-24">{m.dashboard_issues_heading()}</h2>

                    <p class="text-muted mt-1.5 max-w-help text-xs leading-relaxed">
                        {m.dashboard_issues_criteria( { words: SHORT_PAGE_WORDS } )}
                    </p>

                    {#if stats.issues.length === 0 && stats.shortOnly === 0}
                        <p class="text-muted mt-3 text-sm">{m.dashboard_issues_empty()}</p>
                    {:else if stats.issues.length > 0}
                        <ul
                            class="divide-paper-200 dark:divide-ink-700 border-paper-200 dark:border-ink-700 mt-4
                                   divide-y border-y text-sm"
                        >
                            {#each stats.issues.slice( 0, ISSUE_PREVIEW ) as issue ( issue.entry.id )}
                                <li class="relative flex items-center gap-3 py-2">
                                    <div class="min-w-0 flex-1">
                                        <a
                                            href={resolve( `entries/${ issue.entry.slug }/` )}
                                            class="row-link stretched-link block truncate"
                                        >
                                            {issue.entry.title}
                                        </a>

                                        <p class="text-muted mt-0.5 text-xs">{issue.reasons.join( " · " )}</p>
                                    </div>

                                    {#if !reading.enabled}
                                        <Button
                                            href={resolve( `edit/${ issue.entry.slug }/` )}
                                            color="alternative"
                                            size="xs"
                                            class="relative shrink-0 rounded-full"
                                            aria-label={m.dashboard_issues_edit_aria( { title: issue.entry.title } )}
                                        >
                                            {m.common_edit_action()}
                                        </Button>
                                    {/if}
                                </li>
                            {/each}

                            {#if stats.issues.length > ISSUE_PREVIEW}
                                <li class="text-muted py-2 text-xs">
                                    {m.dashboard_issues_more( { count: stats.issues.length - ISSUE_PREVIEW } )}
                                </li>
                            {/if}
                        </ul>
                    {/if}

                    {#if stats.shortOnly > 0}
                        <p class="text-muted mt-3 text-xs">
                            {pluralize( stats.shortOnly, {
                                one: ( { count } ) => m.dashboard_issues_short_only_one( { count, words: SHORT_PAGE_WORDS } ),
                                other: ( { count } ) => m.dashboard_issues_short_only_other( { count, words: SHORT_PAGE_WORDS } )
                            } )}
                        </p>
                    {/if}
                </section>

                <section>
                    <h2 class="section-heading">{m.common_recent_changes_heading()}</h2>

                    {#if recent.length === 0}
                        <p class="text-muted mt-3 text-sm">{m.dashboard_recent_empty()}</p>
                    {:else}
                        <ul
                            class="divide-paper-200 dark:divide-ink-700 border-paper-200 dark:border-ink-700 mt-4
                                   divide-y
                                   border-y text-sm"
                        >
                            {#each recent as entry ( entry.id )}
                                <li class="relative flex items-center gap-3 sm:py-2.5">
                                    <a
                                        href={resolve( `entries/${ entry.slug }/` )}
                                        class="row-link stretched-link min-w-0 flex-1 truncate block content-center {TOUCH_HEIGHT}"
                                    >
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

            <div class="space-y-12">
                <section>
                    <h2 class="section-heading">{m.dashboard_most_linked_heading()}</h2>

                    {#if stats.mostLinked.length === 0}
                        <p class="text-muted mt-3 text-sm">{m.dashboard_most_linked_empty()}</p>
                    {:else}
                        <ol
                            class="divide-paper-200 dark:divide-ink-700 border-paper-200 dark:border-ink-700 mt-4
                                   divide-y
                                   border-y text-sm"
                        >
                            {#each stats.mostLinked as item ( item.entry.id )}
                                <li class="relative flex items-center gap-3 sm:py-2.5">
                                    <a
                                        href={resolve( `entries/${ item.entry.slug }/` )}
                                        class="row-link stretched-link min-w-0 flex-1 truncate block content-center {TOUCH_HEIGHT}"
                                    >
                                        {item.entry.title}
                                    </a>

                                    <span class="text-muted shrink-0 text-xs">
                                        {pluralize( item.incoming, {
                                            one: m.dashboard_cited_one,
                                            other: m.dashboard_cited_other
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

                    {#if quietYear}
                        <p class="text-muted mt-3 text-sm">{m.dashboard_activity_empty()}</p>
                    {:else}
                        <p class="text-muted mt-1 text-sm">{activitySpan}</p>

                        <div class="mt-5">
                            <ActivityChart points={stats.activity} />
                        </div>
                    {/if}
                </section>
            </div>
        </div>
    {/if}
</div>
