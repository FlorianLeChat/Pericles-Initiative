<script lang="ts">
    /**
     * The infobox of the page being written, edited where the article shows it.
     *
     * The editor used to hand the illustration, the dates, the rows and the
     * categories to four closed panels of an accordion, each a form of its own,
     * none of them looking like what it produced. They are one card now, laid
     * out as the infobox beside an article: the illustration on top, the title in
     * the serif, the dates then the rows, the categories at the foot. Every field
     * is written in place, so a filled card reads like the finished one.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import DatesEditor from "./DatesEditor.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import InfoboxEditor from "./InfoboxEditor.svelte";
    import { ageAtDeath } from "#lib/utilities/date.ts";
    import CategoryPicker from "./CategoryPicker.svelte";
    import { pluralize } from "#lib/utilities/plural.ts";
    import EntryImageFields from "./EntryImageFields.svelte";
    import { callNumber } from "#lib/utilities/catalogue.ts";
    import type { EntryDate, InfoboxField } from "#lib/types.ts";

    interface Props {
        /** Title of the page, mirrored in the head of the card. */
        title: string;
        imageSrc: string;
        imageAlt: string;
        imageCaption: string;
        dates: EntryDate[];
        infobox: InfoboxField[];
        categories: string[];
    }

    let {
        title,
        imageSrc = $bindable(),
        imageAlt = $bindable(),
        imageCaption = $bindable(),
        dates = $bindable(),
        infobox = $bindable(),
        categories = $bindable()
    }: Props = $props();

    const age = $derived( ageAtDeath( dates ) );
    const shownTitle = $derived( title.trim() );

    const reference = $derived( callNumber( { title, dates }, wiki.categoriesBySlug.get( categories[ 0 ] ) ) );
</script>

<aside class="surface overflow-hidden" aria-label={m.entry_form_infobox_label()}>
    <EntryImageFields bind:src={imageSrc} bind:alt={imageAlt} bind:caption={imageCaption} />

    <div class="space-y-5 p-4">
        <div>
            <p
                class="font-serif text-lg leading-snug font-semibold
                       {shownTitle ? "text-ink-900 dark:text-paper-100" : "text-muted"}"
                aria-hidden="true"
            >
                {shownTitle || m.entry_form_untitled()}
            </p>

            {#if reference}
                <p class="call-number mt-1">{reference}</p>
            {/if}
        </div>

        <section aria-labelledby="entry-dates-heading">
            <h2 id="entry-dates-heading" class="text-muted mb-1 px-2 text-xs">{m.entry_form_dates_label()}</h2>

            <DatesEditor bind:dates />

            {#if age !== null}
                <p class="text-muted mt-2 px-2 text-xs">
                    {m.entry_form_age( { age: pluralize( age, { one: m.infobox_age_one, other: m.infobox_age_other } ) } )}
                </p>
            {/if}
        </section>

        <section aria-labelledby="entry-facts-heading">
            <h2 id="entry-facts-heading" class="text-muted mb-1 px-2 text-xs">{m.entry_form_facts_label()}</h2>

            <InfoboxEditor bind:fields={infobox} />
        </section>

        <div class="border-paper-200 dark:border-ink-700 border-t px-2 pt-4">
            <CategoryPicker bind:categories />
        </div>
    </div>
</aside>
