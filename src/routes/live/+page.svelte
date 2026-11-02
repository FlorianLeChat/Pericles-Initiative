<script lang="ts">
    /**
     * Live feed.
     *
     * Publications appear immediately: they are written straight to the
     * `localStorage` overlay, the sole source of content for now.
     *
     * @author Claude
     */
    import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";
    import * as m from "#lib/locales/messages.js";
    import Radio from "flowbite-svelte/Radio.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import Select from "flowbite-svelte/Select.svelte";
    import { pluralize } from "#lib/utilities/plural.ts";
    import { SEVERITIES } from "#lib/config/severities.ts";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import PageHeader from "#lib/components/PageHeader.svelte";
    import type { LiveEntry, LiveSeverity } from "#lib/types.ts";
    import PageMeta from "#lib/components/layout/PageMeta.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import { filterPill, RADIO_OVERLAY } from "#lib/config/forms.ts";
    import LiveComposer from "#lib/components/live/LiveComposer.svelte";
    import LiveFeedGroup from "#lib/components/live/LiveFeedGroup.svelte";
    import { formatLongDate, relativeTime } from "#lib/utilities/date.ts";

    let severity = $state<LiveSeverity | "toutes">( "toutes" );
    let tag = $state( "toutes" );
    let composerOpen = $state( false );
    let editing = $state<LiveEntry | null>( null );
    let pendingDeletion = $state<LiveEntry | null>( null );
    let deleteOpen = $state( false );

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

    /** Remaining items, grouped by day, most recent day first. */
    const days = $derived.by( () =>
    {
        const groups: Record<string, LiveEntry[]> = {};

        for ( const item of filtered.filter( ( candidate ) => !candidate.pinned ) )
        {
            const day = item.publishedAt.slice( 0, 10 );
            groups[ day ] = [ ...( groups[ day ] ?? [] ), item ];
        }

        return Object.entries( groups )
            .sort( ( [ a ], [ b ] ) => b.localeCompare( a ) )
            .map( ( [ day, items ] ) => ( {
                day,
                items: items.sort( ( a, b ) => b.publishedAt.localeCompare( a.publishedAt ) )
            } ) );
    } );

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
</script>

<PageMeta
    title={m.live_title( { universe: wiki.meta.universe } )}
    description={m.live_meta_description( { universe: wiki.meta.universe } )}
/>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <PageHeader title={m.live_heading()}>
        {#snippet description()}
            {pluralize( wiki.live.length, { one: m.live_count_one, other: m.live_count_other } )}
            {#if latest}
                {m.live_latest_prefix()}
                <time datetime={latest.publishedAt}>{relativeTime( latest.publishedAt )}</time>.
            {/if}
        {/snippet}

        {#snippet action()}
            <Button
                color="primary"
                aria-expanded={composerOpen}
                onclick={() =>
                {
                    editing = null;
                    composerOpen = !composerOpen;
                }}
            >
                {composerOpen && !editing ? m.live_close_composer_button() : m.live_publish_button()}
            </Button>
        {/snippet}
    </PageHeader>

    <div class="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
                <fieldset class="contents">
                    <legend class="sr-only">{m.live_filter_severity_legend()}</legend>

                    <Radio
                        name="filtre-gravite"
                        value="toutes"
                        bind:group={severity}
                        class={RADIO_OVERLAY}
                        classes={{ label: filterPill( severity === "toutes" ) }}
                    >
                        {m.live_filter_all_severities()}
                    </Radio>

                    {#each SEVERITIES as config ( config.id )}
                        <Radio
                            name="filtre-gravite"
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
                        class="w-auto"
                        classes={{ select: "h-10 rounded-full py-1.5 ps-3.5 pe-8 text-xs font-medium" }}
                        aria-label={m.live_filter_tag_aria()}
                    >
                        <option value="toutes">{m.live_filter_all_tags()}</option>

                        {#each wiki.liveTags as item ( item )}
                            <option value={item}>{item}</option>
                        {/each}
                    </Select>
                {/if}
            </div>

            {#if filtered.length === 0}
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
                        pinned
                        items={pinned}
                        onedit={startEdit}
                        ondelete={( target ) =>
                        {
                            pendingDeletion = target;
                            deleteOpen = true;
                        }}
                    />
                {/if}

                {#each days as group ( group.day )}
                    <LiveFeedGroup
                        heading={formatLongDate( group.day )}
                        items={group.items}
                        onedit={startEdit}
                        ondelete={( target ) =>
                        {
                            pendingDeletion = target;
                            deleteOpen = true;
                        }}
                    />
                {/each}
            {/if}
        </div>

        <aside class="space-y-5 {composerOpen ? "max-lg:order-first" : ""}">
            {#if composerOpen}
                {#key editing?.id ?? "nouvelle"}
                    <div in:fly={{ y: -8, duration: 220, easing: cubicOut }}>
                        <LiveComposer
                            editing={editing ?? undefined}
                            onsaved={() => ( editing = null )}
                            oncancel={() => ( editing = null )}
                        />
                    </div>
                {/key}
            {:else}
                <div class="surface p-5">
                    <h2 class="text-ink-900 dark:text-paper-100 text-base font-semibold">
                        {m.live_how_it_works_heading()}
                    </h2>

                    <p class="text-ink-600 dark:text-paper-300 mt-2 text-sm leading-relaxed">
                        {m.live_how_it_works_p1()}
                    </p>

                    <p class="text-muted mt-2 text-sm leading-relaxed">
                        {m.live_how_it_works_p2()}
                    </p>
                </div>
            {/if}

            <div class="surface p-5">
                <h2 class="text-ink-900 dark:text-paper-100 text-base font-semibold">{m.live_storage_heading()}</h2>

                <p class="text-ink-600 dark:text-paper-300 mt-2 text-sm leading-relaxed">
                    {m.live_storage_description()}
                </p>
            </div>
        </aside>
    </div>
</div>

<ConfirmDialog
    bind:open={deleteOpen}
    title={m.live_delete_dialog_title()}
    message={m.live_delete_dialog_message()}
    confirmLabel={m.common_delete_action()}
    danger
    onconfirm={() =>
    {
        if ( pendingDeletion )
        {
            wiki.deleteLiveEntry( pendingDeletion.id );
            pendingDeletion = null;
        }
    }}
/>
