<script lang="ts" module>
    import * as m from "#lib/locales/messages.js";
    import type { EntrySort } from "#lib/types.ts";

    /**
     * Every ordering of the index, with the label its menu shows.
     *
     * Exported because the index also reads an ordering from its address, and
     * must recognise exactly the values this menu offers.
     */
    export const ENTRY_SORTS: readonly { value: EntrySort; label: () => string }[] = [
        { value: "alphabetique", label: m.entry_filters_sort_alphabetical },
        { value: "recent", label: m.entry_filters_sort_recent },
        { value: "chronologique", label: m.entry_filters_sort_chronological }
    ];
</script>

<script lang="ts">
    /**
     * Filter bar of the encyclopedia index: what to search, keep and order by.
     *
     * The bar is laid out around what a phone can show. The field stays on
     * screen, since typing a title is what a reader reaches for first, while the
     * three menus fold behind a «Filtres» button that carries the number of
     * filters currently narrowing the listing. Everything was on screen at once
     * before, which cost half the viewport before a single row appeared.
     *
     * That folding is CSS, not a viewport read: the group is `hidden sm:flex`
     * and the button `sm:hidden`, so the markup is the same one the server
     * renders, and a screen wide enough never has a collapsed panel to reopen.
     *
     * The count of results and the reset sit under both, outside the group, so a
     * folded bar still says how many pages answer and still offers the way out.
     *
     * @author Claude
     */
    import Label from "flowbite-svelte/Label.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import Search from "flowbite-svelte/Search.svelte";
    import Select from "flowbite-svelte/Select.svelte";
    import { SMALL_FIELD } from "#lib/config/forms.ts";
    import { pluralize } from "#lib/utilities/plural.ts";
    import type { EntryFilterState } from "#lib/types.ts";
    import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";

    interface Props {
        filters: EntryFilterState;
        /** How many pages the filters keep, which only the listing knows. */
        shown: number;
        /** Clears every filter, the ordering aside. */
        onreset: () => void;
    }

    let { filters = $bindable(), shown, onreset }: Props = $props();

    /** The field wears the pill of the search button in the header, so the two read as one family. */
    const SEARCH_FIELD = "bg-paper-100 dark:bg-ink-900 h-10 rounded-full border-transparent dark:border-transparent";

    /** The menus stay small and round, quieter than the listing they order. */
    const MENU_FIELD = `${ SMALL_FIELD } rounded-full ps-3.5 pe-8 text-sm`;

    const MENU_LABEL = "text-muted w-20 shrink-0 text-sm font-normal sm:w-auto";

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

<section class="border-paper-200 dark:border-ink-800 border-b pb-3" aria-label={m.entry_filters_section_aria()}>
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <Search
            bind:value={filters.query}
            size="md"
            class="lg:max-w-xs lg:shrink-0"
            classes={{ input: SEARCH_FIELD }}
            placeholder={m.entry_filters_search_placeholder()}
            aria-label={m.entry_filters_search_aria()}
        />

        <Button
            color="alternative"
            class="w-full gap-2 rounded-full sm:hidden"
            aria-expanded={expanded}
            aria-controls="entry-filters"
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

        <div
            id="entry-filters"
            class="{expanded ? "flex" : "hidden"} flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-5 lg:flex-nowrap
                   lg:gap-4"
        >
            <div class="flex items-center gap-2">
                <Label for="filter-category" class={MENU_LABEL}>{m.entry_filters_category_label()}</Label>

                <Select
                    id="filter-category"
                    bind:value={filters.category}
                    size="sm"
                    class="sm:w-auto"
                    classes={{ select: MENU_FIELD }}
                    placeholder=""
                >
                    <option value="toutes">{m.entry_filters_category_all()}</option>

                    {#each wiki.categories as item ( item.slug )}
                        <option value={item.slug}>{item.name}</option>
                    {/each}
                </Select>
            </div>

            <div class="flex items-center gap-2">
                <Label for="filter-status" class={MENU_LABEL}>{m.entry_filters_status_label()}</Label>

                <Select
                    id="filter-status"
                    bind:value={filters.status}
                    size="sm"
                    class="sm:w-auto"
                    classes={{ select: MENU_FIELD }}
                    placeholder=""
                >
                    <option value="tous">{m.entry_filters_status_all()}</option>
                    <option value="publie">{m.entry_filters_status_published()}</option>
                    <option value="brouillon">{m.entry_filters_status_draft()}</option>
                </Select>
            </div>

            <div class="flex items-center gap-2">
                <Label for="filter-sort" class={MENU_LABEL}>{m.entry_filters_sort_label()}</Label>

                <Select
                    id="filter-sort"
                    bind:value={filters.sort}
                    size="sm"
                    class="sm:w-auto"
                    classes={{ select: MENU_FIELD }}
                    placeholder=""
                >
                    {#each ENTRY_SORTS as option ( option.value )}
                        <option value={option.value}>{option.label()}</option>
                    {/each}
                </Select>
            </div>
        </div>
    </div>

    <div class="mt-3 flex min-h-8 flex-wrap items-center justify-between gap-3">
        <p class="text-muted text-sm" role="status" aria-live="polite">{summary}</p>

        {#if active > 0}
            <Button color="alternative" size="xs" class="rounded-full" onclick={onreset}>
                {m.entry_filters_reset()}
            </Button>
        {/if}
    </div>
</section>
