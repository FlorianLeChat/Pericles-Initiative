<script lang="ts">
    /**
     * Filter panel of the encyclopedia index: what to search, keep and order by.
     *
     * The panel is laid out around what a phone can show. The field stays on
     * screen, since typing a title is what a reader reaches for first, while the
     * three menus fold behind a «Filtres» button that carries the number of
     * filters currently narrowing the listing. Everything was on screen at once
     * before, which cost half the viewport before a single card appeared.
     *
     * That folding is CSS, not a viewport read: the region is `hidden sm:block`
     * and the button `sm:hidden`, so the markup is the same one the server
     * renders, and a screen wide enough never has a collapsed panel to reopen.
     *
     * The count of results and the reset sit under both, outside the region, so a
     * folded panel still says how many pages answer and still offers the way out.
     *
     * @author Claude
     */
    import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
    import Button from "flowbite-svelte/Button.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Search from "flowbite-svelte/Search.svelte";
    import Select from "flowbite-svelte/Select.svelte";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { EntryFilterState } from "$lib/types";
    import { pluralize } from "$lib/utilities/plural";

    interface Props {
        filters: EntryFilterState;
        /** How many pages the filters keep, which only the listing knows. */
        shown: number;
        /** Clears every filter, the ordering aside. */
        onreset: () => void;
    }

    let { filters = $bindable(), shown, onreset }: Props = $props();

    let expanded = $state( false );

    const total = $derived( wiki.entries.length );

    /**
     * How many filters are narrowing the listing.
     *
     * The ordering is deliberately not one of them: it changes what comes first,
     * never what is there, so counting it would announce a filter the reader
     * cannot see the effect of in the number of results.
     */
    const active = $derived(
        [
            filters.query.trim().length > 0,
            filters.category !== "toutes",
            filters.status !== "tous"
        ].filter( ( on ) => on ).length
    );

    const shownCount = $derived( pluralize( shown, { one: m.common_count_fiche_one, other: m.common_count_fiche_other } ) );
    const summary = $derived(
        active > 0 ? m.entry_filters_count_of_total( { count: shownCount, total } ) : shownCount
    );
</script>

<section class="surface p-4 sm:p-5" aria-label={m.entry_filters_section_aria()}>
    <Search
        bind:value={filters.query}
        size="md"
        classes={{ input: "pe-3" }}
        placeholder={m.entry_filters_search_placeholder()}
        aria-label={m.entry_filters_search_aria()}
    />

    <Button
        color="alternative"
        class="mt-3 w-full gap-2 sm:hidden"
        aria-expanded={expanded}
        aria-controls="filtres-fiches"
        onclick={() => ( expanded = !expanded )}
    >
        <SlidersHorizontal class="h-4 w-4" aria-hidden="true" />

        {m.entry_filters_toggle_label()}

        {#if active > 0}
            <span class="bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900 rounded-full px-1.5 text-xs">
                {active}
            </span>
        {/if}
    </Button>

    <div id="filtres-fiches" class="mt-4 space-y-4 {expanded ? "block" : "hidden"} sm:block">
        <div class="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <div>
                <Label for="filtre-categorie" class="field-label">{m.entry_filters_category_label()}</Label>

                <Select id="filtre-categorie" bind:value={filters.category} placeholder="">
                    <option value="toutes">{m.entry_filters_category_all()}</option>

                    {#each wiki.categories as item ( item.slug )}
                        <option value={item.slug}>{item.name}</option>
                    {/each}
                </Select>
            </div>

            <div>
                <Label for="filtre-statut" class="field-label">{m.entry_filters_status_label()}</Label>

                <Select id="filtre-statut" bind:value={filters.status} placeholder="">
                    <option value="tous">{m.entry_filters_status_all()}</option>
                    <option value="publie">{m.entry_filters_status_published()}</option>
                    <option value="brouillon">{m.entry_filters_status_draft()}</option>
                </Select>
            </div>

            <div>
                <Label for="filtre-tri" class="field-label">{m.entry_filters_sort_label()}</Label>

                <Select id="filtre-tri" bind:value={filters.sort} placeholder="">
                    <option value="alphabetique">{m.entry_filters_sort_alphabetical()}</option>
                    <option value="recent">{m.entry_filters_sort_recent()}</option>
                    <option value="chronologique">{m.entry_filters_sort_chronological()}</option>
                </Select>
            </div>
        </div>
    </div>

    <div
        class="border-paper-200 dark:border-ink-800 mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
    >
        <p class="text-muted text-sm" role="status" aria-live="polite">{summary}</p>

        {#if active > 0}
            <Button color="alternative" size="sm" onclick={onreset}>{m.entry_filters_reset()}</Button>
        {/if}
    </div>
</section>
