<script lang="ts">
    /**
     * Live feed.
     *
     * Publications appear immediately: they are written straight to the
     * `localStorage` overlay, the sole source of content for now.
     *
     * The primary button of the header only ever opens the form: it leaves while
     * the form is open, and the form closes itself through a button of its own.
     * Closing hands the focus back to the button that reappears, rather than to
     * the top of a page the reader was halfway down.
     *
     * Beside the feed stands either that form or, while it is closed, the index
     * of its days (`LiveDayIndex`): the cards explaining how the feed works and
     * where it is stored spoke to the author on a page the players read too, and
     * once they left, the column stood empty under the button of the header. The
     * grid keeps its two columns from `lg` in both states, so the feed keeps its
     * 48rem measure and opening the form does not reflow the column being read.
     *
     * An empty feed says so, rather than blaming a filter nobody chose, and draws
     * no filters over nothing, nor a count line reading «0 entrée» above the
     * sentence that already says it; its only action is the one the header
     * already offers.
     *
     * On a phone the severities and the tags fold behind a «Filtres» button, as
     * on the index: six pills and a menu stood between the header and the first
     * dispatch, some five hundred pixels down. The menu then takes its own line,
     * since iOS keeps a field at sixteen pixels and it read louder than the pills
     * beside it.
     *
     * A device set to read only shows neither «Publier une entrée» nor the edit
     * and delete buttons of each row: the feed reads as news, not as a queue.
     *
     * @author Claude
     */
    import { tick } from "svelte";
    import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import * as m from "#lib/locales/messages.js";
    import Radio from "flowbite-svelte/Radio.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import Select from "flowbite-svelte/Select.svelte";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { SEVERITIES } from "#lib/config/severities.ts";
    import { reading } from "#lib/state/reading.svelte.ts";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import type { LiveEntry, LiveSeverity } from "#lib/types.ts";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import LiveComposer from "#lib/components/live/LiveComposer.svelte";
    import LiveDayIndex from "#lib/components/live/LiveDayIndex.svelte";
    import LiveFeedGroup from "#lib/components/live/LiveFeedGroup.svelte";
    import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
    import { FIELD, filterPill, RADIO_OVERLAY } from "#lib/config/forms.ts";
    import { formatLongDate, localDayKey, relativeTime } from "#lib/utilities/date.ts";

    let severity = $state<LiveSeverity | "toutes">( "toutes" );
    let tag = $state( "toutes" );
    let composerOpen = $state( false );
    let filtersOpen = $state( false );
    let editing = $state<LiveEntry | null>( null );

    const filtered = $derived(
        wiki.live.filter( ( item ) =>
        {
            if ( severity !== "toutes" && item.severity !== severity )
            {
                return false;
            }
            return tag === "toutes" || item.tags.includes( tag );
        } )
    );

    const pinned = $derived( filtered.filter( ( item ) => item.pinned ) );

    /** How many filters narrow the feed, counted on the button that folds them on a phone. */
    const activeFilters = $derived( [ severity !== "toutes", tag !== "toutes" ].filter( ( on ) => on ).length );

    /** Identifier of the group of filters, which the phone's «Filtres» button controls. */
    const FILTERS_ID = "live-filters";

    /**
     * Remaining items, grouped by the reader's local day, most recent day first.
     * Each group is titled from its first timestamp rather than from its key: a
     * bare `2026-11-07` parses as UTC midnight, which west of Greenwich formats
     * as the day before.
     */
    const days = $derived.by( () =>
    {
        const groups: Record<string, LiveEntry[]> = {};

        for ( const item of filtered.filter( ( candidate ) => !candidate.pinned ) )
        {
            const day = localDayKey( item.publishedAt );
            groups[ day ] = [ ...( groups[ day ] ?? [] ), item ];
        }

        return Object.entries( groups )
            .sort( ( [ a ], [ b ] ) => b.localeCompare( a ) )
            .map( ( [ day, items ] ) =>
            {
                const sorted = items.sort( ( a, b ) => b.publishedAt.localeCompare( a.publishedAt ) );
                return { day, label: formatLongDate( sorted[ 0 ].publishedAt ), items: sorted };
            } );
    } );

    /** Anchor of the heading of the pinned group. */
    const PINNED_ANCHOR = "live-pinned";

    /** Groups of the feed as the index beside it names them, in reading order. */
    const index = $derived( [
        ...( pinned.length > 0 ? [ { anchor: PINNED_ANCHOR, label: m.live_pinned_heading(), count: pinned.length } ] : [] ),
        ...days.map( ( group ) => ( {
            anchor: `live-${ group.day }`,
            label: group.label,
            count: group.items.length
        } ) )
    ] );

    /**
     * Most recent item by publication time. Read from the whole feed rather than
     * its first row, which is a pinned item whenever one exists.
     */
    const latest = $derived(
        wiki.live.reduce<LiveEntry | undefined>(
            ( newest, item ) => ( !newest || item.publishedAt > newest.publishedAt ? item : newest ),
            undefined
        )
    );

    /**
     * Loads an item into the composer.
     *
     * @param item Item to edit.
     * @author Claude
     */
    const startEdit = ( item: LiveEntry ): void =>
    {
        editing = item;
        composerOpen = true;
    };

    /**
     * Removes an item at once, the undo toast being the way back.
     *
     * A confirmation used to stand in front of it while saying the item could be
     * restored right after, so one deletion cost two decisions. The focus moves
     * to the main content, since the button pressed leaves with its row.
     *
     * @param item Item to remove.
     * @author Claude
     */
    const remove = ( item: LiveEntry ): void =>
    {
        wiki.deleteLiveEntry( item.id );
        document.getElementById( "main-content" )?.focus();
    };

    /** What a row lets a reader do to it: nothing on a device set to read only. */
    const onedit = $derived( reading.enabled ? undefined : startEdit );
    const ondelete = $derived( reading.enabled ? undefined : remove );

    /** Identifier of the button opening the form, which takes the focus back when the form closes. */
    const PUBLISH_BUTTON_ID = "live-publish";

    /**
     * Closes the form, and puts the focus back on the button that opens it.
     *
     * @returns Resolves once the focus has moved.
     * @author Claude
     */
    const closeComposer = async (): Promise<void> =>
    {
        editing = null;
        composerOpen = false;

        await tick();
        document.getElementById( PUBLISH_BUTTON_ID )?.focus();
    };
</script>

<PageMeta
    title={m.live_title( { universe: wiki.meta.universe } )}
    description={m.live_meta_description( { universe: wiki.meta.universe } )}
/>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    {#snippet counts()}
        {pluralize( wiki.live.length, { one: m.live_count_one, other: m.live_count_other } )}
        {#if latest}
            {m.live_latest_prefix()}
            <time datetime={latest.publishedAt}>{relativeTime( latest.publishedAt )}</time>.
        {/if}
    {/snippet}

    <PageHeader title={m.common_live_label()} description={wiki.live.length > 0 ? counts : undefined}>
        {#snippet action()}
            {#if !composerOpen && !reading.enabled}
                <Button
                    id={PUBLISH_BUTTON_ID}
                    color="primary"
                    onclick={() =>
                    {
                        editing = null;
                        composerOpen = true;
                    }}
                >
                    {m.live_publish_button()}
                </Button>
            {/if}
        {/snippet}
    </PageHeader>

    <div class="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="max-w-3xl min-w-0">
            {#if wiki.live.length > 0}
                <Button
                    color="alternative"
                    class="w-full gap-2 rounded-full sm:hidden"
                    aria-expanded={filtersOpen}
                    aria-controls={FILTERS_ID}
                    onclick={() => ( filtersOpen = !filtersOpen )}
                >
                    <SlidersHorizontal class="h-4 w-4" aria-hidden="true" />

                    {m.common_filters_toggle()}

                    {#if activeFilters > 0}
                        <span
                            class="bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900 rounded-full px-1.5 text-xs"
                        >
                            {activeFilters}
                        </span>
                    {/if}
                </Button>

                <div
                    id={FILTERS_ID}
                    class="{filtersOpen ? "flex" : "hidden"} flex-wrap items-center gap-2 max-sm:mt-3 sm:flex"
                >
                    <fieldset class="contents">
                        <legend class="sr-only">{m.live_filter_severity_legend()}</legend>

                        <Radio
                            name="live-severity"
                            value="toutes"
                            bind:group={severity}
                            class={RADIO_OVERLAY}
                            classes={{ label: filterPill( severity === "toutes" ) }}
                        >
                            {m.live_filter_all_severities()}
                        </Radio>

                        {#each SEVERITIES as config ( config.id )}
                            <Radio
                                name="live-severity"
                                value={config.id}
                                bind:group={severity}
                                class={RADIO_OVERLAY}
                                classes={{ label: filterPill( severity === config.id ) }}
                            >
                                {config.label}
                            </Radio>
                        {/each}
                    </fieldset>

                    {#if wiki.liveTags.length > 0}
                        <Select
                            bind:value={tag}
                            size="sm"
                            placeholder=""
                            class="max-sm:w-full sm:w-auto"
                            classes={{ select: `${ FIELD } h-10 rounded-full py-1.5 ps-3.5 pe-8 text-xs font-medium` }}
                            aria-label={m.live_filter_tag_aria()}
                        >
                            <option value="toutes">{m.live_filter_all_tags()}</option>

                            {#each wiki.liveTags as item ( item )}
                                <option value={item}>{item}</option>
                            {/each}
                        </Select>
                    {/if}
                </div>
            {/if}

            {#if wiki.live.length === 0}
                <div>
                    <EmptyState title={m.live_empty_feed_title()} description={m.live_empty_feed_description()} />
                </div>
            {:else if filtered.length === 0}
                <div class="mt-8">
                    <EmptyState title={m.live_empty_title()} description={m.live_empty_description()}>
                        <Button
                            color="alternative"
                            onclick={() =>
                            {
                                severity = "toutes";
                                tag = "toutes";
                            }}
                        >
                            {m.live_show_all_button()}
                        </Button>
                    </EmptyState>
                </div>
            {:else}
                {#if pinned.length > 0}
                    <LiveFeedGroup
                        heading={m.live_pinned_heading()}
                        anchor={PINNED_ANCHOR}
                        pinned
                        items={pinned}
                        {onedit}
                        {ondelete}
                    />
                {/if}

                {#each days as group ( group.day )}
                    <LiveFeedGroup
                        heading={group.label}
                        anchor="live-{group.day}"
                        items={group.items}
                        {onedit}
                        {ondelete}
                    />
                {/each}
            {/if}
        </div>

        {#if composerOpen}
            <aside class="max-lg:order-first">
                {#key editing?.id ?? "nouvelle"}
                    <div in:fly={{ y: -8, duration: 220, easing: cubicOut }}>
                        <LiveComposer
                            editing={editing ?? undefined}
                            onsaved={() => ( editing = null )}
                            oncancel={() => void closeComposer()}
                        />
                    </div>
                {/key}
            </aside>
        {:else}
            <LiveDayIndex groups={index} />
        {/if}
    </div>
</div>
