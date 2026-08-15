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
    import { wiki } from "$lib/state/wiki.svelte";
    import type { EntryFilterState } from "$lib/types";
    import { counted } from "$lib/utilities/plural";

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

    const summary = $derived( active > 0 ? `${ counted( shown, "fiche" ) } sur ${ total }` : counted( shown, "fiche" ) );
</script>

<section class="surface p-4 sm:p-5" aria-label="Filtres">
    <Search
        bind:value={filters.query}
        size="md"
        classes={{ input: "pe-3" }}
        placeholder="Filtrer par titre ou par résumé"
        aria-label="Filtrer les fiches"
    />

    <Button
        color="alternative"
        class="mt-3 w-full gap-2 sm:hidden"
        aria-expanded={expanded}
        aria-controls="filtres-fiches"
        onclick={() => ( expanded = !expanded )}
    >
        <SlidersHorizontal class="h-4 w-4" aria-hidden="true" />

        Filtres

        {#if active > 0}
            <span class="bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900 rounded-full px-1.5 text-xs">
                {active}
            </span>
        {/if}
    </Button>

    <div id="filtres-fiches" class="mt-4 space-y-4 {expanded ? "block" : "hidden"} sm:block">
        <div class="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <div>
                <Label for="filtre-categorie" class="field-label">Catégorie</Label>

                <Select id="filtre-categorie" bind:value={filters.category} placeholder="">
                    <option value="toutes">Toutes</option>

                    {#each wiki.categories as item ( item.slug )}
                        <option value={item.slug}>{item.name}</option>
                    {/each}
                </Select>
            </div>

            <div>
                <Label for="filtre-statut" class="field-label">Statut</Label>

                <Select id="filtre-statut" bind:value={filters.status} placeholder="">
                    <option value="tous">Tous</option>
                    <option value="publie">Publiées</option>
                    <option value="brouillon">Brouillons</option>
                </Select>
            </div>

            <div>
                <Label for="filtre-tri" class="field-label">Tri</Label>

                <Select id="filtre-tri" bind:value={filters.sort} placeholder="">
                    <option value="alphabetique">Alphabétique</option>
                    <option value="recent">Modifiées récemment</option>
                    <option value="chronologique">Chronologique</option>
                </Select>
            </div>
        </div>
    </div>

    <div
        class="border-paper-200 dark:border-ink-800 mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
    >
        <p class="text-muted text-sm" role="status" aria-live="polite">{summary}</p>

        {#if active > 0}
            <Button color="alternative" size="sm" onclick={onreset}>Réinitialiser les filtres</Button>
        {/if}
    </div>
</section>
