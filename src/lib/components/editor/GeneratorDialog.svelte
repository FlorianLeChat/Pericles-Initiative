<script lang="ts">
    /**
     * Proposes invented names, places and dates to drop into a page.
     *
     * A wiki of fiction spends a lot of its time naming things that only need to
     * be plausible: the third harbour master, the street a scene happens in, the
     * year a treaty was signed. Faker knows how to invent those, in French as in
     * English, and proposes rather than decides: a handful of candidates is
     * offered and one of them is written at the caret.
     *
     * The library is imported dynamically, per locale, the same way Crepe is: it
     * is a dictionary rather than code, it weighs accordingly, and nothing of it
     * is fetched until this dialog is opened for the first time.
     *
     * @author Claude
     */
    import RefreshCw from "@lucide/svelte/icons/refresh-cw";
    import Button from "flowbite-svelte/Button.svelte";
    import Modal from "flowbite-svelte/Modal.svelte";
    import type { Faker } from "@faker-js/faker";
    import { MODAL_MOBILE_FULLSCREEN } from "$lib/config/dialogs";
    import { filterPill } from "$lib/config/forms";
    import * as m from "$lib/locales/messages.js";
    import { getLocale } from "$lib/locales/runtime";

    interface Props {
        open: boolean;
        /** Called with the chosen text. */
        oninsert: ( value: string ) => void;
    }

    let { open = $bindable( false ), oninsert }: Props = $props();

    /** How many candidates are offered at a time. */
    const SAMPLE_COUNT = 6;

    /** What can be invented, in the order the panel offers it. */
    const KINDS = [ "fullName", "firstName", "lastName", "city", "country", "street", "organisation", "job", "date" ] as const;

    type Kind = ( typeof KINDS )[ number ];

    let kind = $state<Kind>( "fullName" );

    /**
     * What is currently offered, for every kind at once.
     *
     * Drawn once per opening rather than per kind: a candidate that changed
     * under the reader as they walked from «Ville» to «Pays» and back would make
     * the one they had already half chosen unfindable. Nothing here moves until
     * the reader asks for another draw.
     */
    let pools = $state<Partial<Record<Kind, string[]>>>( {} );

    let faker: Faker | null = null;

    const samples = $derived( pools[ kind ] ?? [] );

    /**
     * Names one kind of invention for the pill offering it.
     *
     * @param value Kind being offered.
     * @returns Its label, in the reader's language.
     * @author Claude
     */
    const kindLabel = ( value: Kind ): string =>
    {
        switch ( value )
        {
            case "fullName":
                return m.generator_kind_full_name();
            case "firstName":
                return m.generator_kind_first_name();
            case "lastName":
                return m.generator_kind_last_name();
            case "city":
                return m.generator_kind_city();
            case "country":
                return m.generator_kind_country();
            case "street":
                return m.generator_kind_street();
            case "organisation":
                return m.generator_kind_organisation();
            case "job":
                return m.generator_kind_job();
            case "date":
                return m.generator_kind_date();
        }
    };

    /**
     * Invents one value of the chosen kind.
     *
     * @param source Loaded Faker instance.
     * @param value Kind to invent.
     * @returns The invented text.
     * @author Claude
     */
    const invent = ( source: Faker, value: Kind ): string =>
    {
        switch ( value )
        {
            case "fullName":
                return source.person.fullName();
            case "firstName":
                return source.person.firstName();
            case "lastName":
                return source.person.lastName();
            case "city":
                return source.location.city();
            case "country":
                return source.location.country();
            case "street":
                return source.location.streetAddress();
            case "organisation":
                return source.company.name();
            case "job":
                return source.person.jobTitle();
            case "date":
                // The chronology reads an ISO date, and reads free text as it stands,
                // so the one shape it can sort by is the one worth proposing.
                return source.date.past( { years: 60 } ).toISOString().slice( 0, 10 );
        }
    };

    /**
     * Loads the dictionary of the current language, once per editing session.
     *
     * @returns The Faker instance for that language.
     * @author Claude
     */
    const load = async (): Promise<Faker> =>
    {
        if ( faker )
        {
            return faker;
        }

        const module = getLocale() === "fr"
            ? await import( "@faker-js/faker/locale/fr" )
            : await import( "@faker-js/faker/locale/en" );

        faker = module.faker;

        return faker;
    };

    /**
     * Draws a set of candidates of one kind.
     *
     * @param source Loaded Faker instance.
     * @param value Kind to draw.
     * @returns The candidates, without the repetitions a small dictionary gives.
     * @author Claude
     */
    const drawn = ( source: Faker, value: Kind ): string[] =>
        [ ...new Set( Array.from( { length: SAMPLE_COUNT }, () => invent( source, value ) ) ) ];

    /**
     * Fills every pool, which is what an opening and a redraw both ask for.
     *
     * Every kind is drawn rather than only the one on show, so that walking from
     * one pill to the next reads as looking through what was drawn rather than
     * as drawing again. Nine short lists cost nothing next to the dictionary
     * they come from.
     *
     * @author Claude
     */
    const draw = async (): Promise<void> =>
    {
        const source = await load();

        pools = Object.fromEntries( KINDS.map( ( value ) => [ value, drawn( source, value ) ] ) ) as Record<Kind, string[]>;
    };

    // Drawn once on opening, and dropped on the way out so the next opening does
    // not offer the names of the previous page.
    $effect( () =>
    {
        if ( open )
        {
            void draw();
        }
        else
        {
            pools = {};
        }
    } );

    /**
     * Writes a candidate into the page and closes the dialog.
     *
     * @param value Chosen text.
     * @author Claude
     */
    const choose = ( value: string ): void =>
    {
        oninsert( value );
        open = false;
    };
</script>

<Modal
    bind:open
    title={m.generator_title()}
    size="sm"
    dismissable={false}
    transitionParams={{ duration: 0 }}
    class="border-paper-200 text-ink-800 dark:border-ink-800 dark:bg-ink-900 dark:text-paper-200 mt-[8dvh]
           max-h-[80dvh] rounded-2xl border {MODAL_MOBILE_FULLSCREEN}"
    classes={{
        header: "border-paper-200 dark:border-ink-800 text-ink-900 dark:text-paper-100 font-serif",
        body: "space-y-4"
    }}
    aria-label={m.generator_title()}
>
    <div class="flex flex-wrap gap-1.5" role="group" aria-label={m.generator_kinds_legend()}>
        {#each KINDS as offered ( offered )}
            <button
                type="button"
                class={filterPill( offered === kind )}
                aria-pressed={offered === kind}
                onclick={() => ( kind = offered )}
            >
                {kindLabel( offered )}
            </button>
        {/each}
    </div>

    <ul class="space-y-1">
        {#each samples as sample ( sample )}
            <li>
                <button
                    type="button"
                    class="hover:bg-paper-100 dark:hover:bg-ink-800 w-full rounded-xl px-3 py-2.5 text-left
                           text-sm transition"
                    onclick={() => choose( sample )}
                >
                    {sample}
                </button>
            </li>
        {/each}

        {#if samples.length === 0}
            <li class="text-muted px-3 py-6 text-center text-sm">{m.generator_loading()}</li>
        {/if}
    </ul>

    <div class="flex items-center justify-between gap-3">
        <p class="text-muted text-xs">{m.generator_hint()}</p>

        <Button color="alternative" size="xs" class="shrink-0 gap-2 rounded-full" onclick={() => void draw()}>
            <RefreshCw class="h-3.5 w-3.5" />
            {m.generator_redraw()}
        </Button>
    </div>
</Modal>
