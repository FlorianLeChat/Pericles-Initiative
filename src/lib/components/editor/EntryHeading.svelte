<script lang="ts">
    /**
     * Title and summary of the page being written, set as the article sets them.
     *
     * The serif title, the red rule and the lede are typed where they will be
     * read rather than into labelled boxes above the page: the labels are still
     * there for assistive technology, the boxes only show once pointed at.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import Button from "flowbite-svelte/Button.svelte";

    /**
     * Length past which a summary stops being read whole where it is reused.
     *
     * The summary is what `PageMeta` hands to the description of the page, and a
     * search engine or a messaging application cuts that off around here. It is a
     * guide rather than a limit: nothing stops a longer one from being saved.
     */
    const SUMMARY_LENGTH = 160;

    interface Props {
        title: string;
        summary: string;
        /** Placeholder of the title, which the template of the page may set. */
        titlePlaceholder?: string;
        /** Placeholder of the summary, which the template of the page may set. */
        summaryPlaceholder?: string;
        /** Address the page will take, when the one it asks for is already taken. */
        settledSlug: string;
        /** Takes the settled address as the one asked for. */
        onsettle: () => void;
        /** Whether a save was refused for want of a title. */
        titleMissing?: boolean;
        /** The title field, handed back so a refused save can bring the writer to it. */
        titleField?: HTMLTextAreaElement;
    }

    let {
        title = $bindable(),
        summary = $bindable(),
        titleField = $bindable(),
        titleMissing = false,
        titlePlaceholder = m.entry_form_title_placeholder(),
        summaryPlaceholder = m.entry_form_summary_placeholder(),
        settledSlug,
        onsettle
    }: Props = $props();

    let summaryFocused = $state( false );
    let summaryField: HTMLTextAreaElement | undefined = $state();

    const overLength = $derived( summary.length > SUMMARY_LENGTH );

    /**
     * The count only matters while the summary is written, or once it runs long.
     *
     * Hidden rather than removed, so leaving the field does not lift everything
     * below it by a line under the pointer that is already on its way there.
     */
    const showLength = $derived( summaryFocused || overLength );

    const GHOST = `-mx-2 w-[calc(100%+1rem)] resize-none rounded-md border border-transparent bg-transparent px-2
                   placeholder:text-ink-400 dark:placeholder:text-paper-400/80 hover:border-control-edge
                   focus:border-field-edge aria-invalid:border-alert-500 forced-colors:border-[CanvasText]
                   transition-colors`;
</script>

<header>
    <label for="entry-title" class="sr-only">{m.entry_form_title_label()}</label>

    <textarea
        id="entry-title"
        bind:this={titleField}
        bind:value={title}
        aria-invalid={titleMissing}
        aria-describedby={titleMissing ? "entry-title-missing" : undefined}
        rows="1"
        class="{GHOST} field-display text-ink-900 dark:text-paper-100 field-sizing-content py-1 font-serif text-3xl leading-tight sm:text-4xl
               font-semibold tracking-tight"
        placeholder={titlePlaceholder}
        required
        onkeydown={( event ) =>
        {
            if ( event.key === "Enter" )
            {
                event.preventDefault();
                summaryField?.focus();
            }
        }}></textarea>

    <div class="title-rule my-3"></div>

    {#if titleMissing}
        <p id="entry-title-missing" class="text-alert-500 dark:text-dark-alert-500 mb-3 text-xs">
            {m.entry_form_title_missing()}
        </p>
    {/if}

    {#if settledSlug}
        <div id="entry-slug-taken" class="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <p class="text-alert-500 dark:text-dark-alert-500">{m.entry_form_slug_taken_hint( { slug: settledSlug } )}</p>

            <Button color="alternative" size="xs" class="rounded-full" onclick={onsettle}>
                {m.entry_form_slug_take_settled()}
            </Button>
        </div>
    {/if}

    <label for="entry-summary" class="sr-only">{m.entry_form_summary_label()}</label>

    <textarea
        id="entry-summary"
        bind:this={summaryField}
        bind:value={summary}
        rows="1"
        class="{GHOST} field-display text-ink-600 dark:text-paper-300 field-sizing-content max-w-[62ch] py-1 text-lg leading-relaxed
               sm:text-xl"
        placeholder={summaryPlaceholder}
        aria-describedby="entry-summary-length"
        onfocus={() => ( summaryFocused = true )}
        onblur={() => ( summaryFocused = false )}></textarea>

    <p
        id="entry-summary-length"
        class="mt-1 text-xs {overLength ? "text-alert-500 dark:text-dark-alert-500" : "text-muted"}"
        class:invisible={!showLength}
    >
        {m.entry_form_summary_length( { count: summary.length, limit: SUMMARY_LENGTH } )}
    </p>
</header>
