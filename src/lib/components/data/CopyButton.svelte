<script lang="ts">
    /**
     * A pill copying a text to the clipboard, and saying whether it worked.
     *
     * The outcome shows on the button itself, a tick and «Copié», since the
     * reader is looking at it; a hidden live region says the same thing out loud,
     * naming what was copied. It stands 44px tall on a phone, like every other
     * target a thumb aims at, and settles to the pill height from `sm`.
     *
     * @author Claude
     */
    import Copy from "@lucide/svelte/icons/copy";
    import * as m from "#lib/locales/messages.js";
    import Check from "@lucide/svelte/icons/check";

    interface Props {
        /** Visible label of the button. */
        label: string;
        /** What is copied, named in the accessible label and in the announcement. */
        name: string;
        text: string;
        /** Id of a sentence describing what is copied. */
        describedby?: string;
    }

    let { label, name, text, describedby }: Props = $props();

    let copied = $state<boolean | null>( null );

    /**
     * Copies the text, and records whether the browser allowed it.
     *
     * @author Claude
     */
    const copy = async (): Promise<void> =>
    {
        try
        {
            await navigator.clipboard.writeText( text );
            copied = true;
        }
        catch
        {
            copied = false;
        }
    };
</script>

<button
    type="button"
    class="border-paper-200 text-ink-700 hover:border-paper-300 hover:bg-paper-100 dark:border-ink-700
           dark:text-paper-200 dark:hover:bg-ink-800 focus-visible:outline-accent-500 inline-flex min-h-11 shrink-0
           items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition focus-visible:outline-2
           focus-visible:outline-offset-2 sm:min-h-9"
    aria-label={m.remote_contract_copy_label( { action: copied ? m.remote_contract_copy_done() : label, name } )}
    aria-describedby={describedby}
    onclick={() => void copy()}
>
    {#if copied}
        <Check class="size-3.5" aria-hidden="true" />
        {m.remote_contract_copy_done()}
    {:else}
        <Copy class="size-3.5" aria-hidden="true" />
        {label}
    {/if}
</button>

<span class="sr-only" role="status">
    {#if copied === true}
        {m.remote_contract_copied( { name } )}
    {:else if copied === false}
        {m.remote_contract_copy_error()}
    {/if}
</span>

{#if copied === false}
    <span class="text-alert-500 basis-full text-xs">{m.remote_contract_copy_error()}</span>
{/if}
