<script lang="ts">
    /**
     * A document the reader copies into another service, with its caption and a copy button.
     *
     * The text wraps rather than scrolls: a scrolling block would have to be made
     * reachable from the keyboard, and long urls and resource names read fine broken
     * over two lines.
     *
     * @author Claude
     */
    import CopyButton from "./CopyButton.svelte";
    import * as m from "#lib/locales/messages.js";

    interface Props {
        /** Name of the document, shown above it and repeated in the button's accessible name. */
        title: string;
        /** What to do with it, under the title. */
        hint: string;
        /** The document itself, copied as it is shown. */
        code: string;
    }

    let { title, hint, code }: Props = $props();

    const hintId = $props.id();
</script>

<figure class="min-w-0">
    <figcaption class="flex flex-wrap items-start justify-between gap-3">
        <span class="min-w-0 flex-1">
            <span class="text-ink-900 dark:text-paper-100 block text-sm font-medium">{title}</span>
            <span id={hintId} class="text-muted mt-0.5 block text-xs leading-relaxed">{hint}</span>
        </span>

        <CopyButton label={m.remote_contract_copy()} name={title} text={code} describedby={hintId} />
    </figcaption>

    <pre
        class="border-paper-200 bg-paper-50 text-ink-700 dark:border-ink-700 dark:bg-ink-950 dark:text-paper-200 mt-2.5
               rounded-xl border p-3 font-mono text-xs leading-relaxed wrap-anywhere whitespace-pre-wrap"><code
            >{code}</code
        ></pre>
</figure>
