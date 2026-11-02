<script lang="ts">
    /**
     * Neutral stand in for a page whose content is not known yet.
     *
     * Shown by the root layout until the overlay has been read, in place of the
     * empty or missing state a page would otherwise claim for a split second. It
     * names nothing and promises nothing: a few quiet bars where a title, a lede
     * and a column of text will sit, and a status announcing the wait to a screen
     * reader. It never animates, so a fast read leaves no trace.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";

    const LINE_WIDTHS = [ "w-full", "w-11/12", "w-full", "w-4/5", "w-10/12", "w-3/5" ];
</script>

<div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14" aria-busy="true">
    <p class="sr-only" role="status">{m.layout_loading()}</p>

    <div aria-hidden="true">
        <div class="bg-paper-100 dark:bg-ink-800 h-3 w-40 rounded"></div>
        <div class="bg-paper-200 dark:bg-ink-800 mt-6 h-10 w-2/3 max-w-lg rounded-md"></div>
        <div class="bg-paper-100 dark:bg-ink-800 mt-6 h-4 w-full max-w-2xl rounded"></div>

        <div class="mt-10 max-w-[70ch] space-y-3">
            {#each LINE_WIDTHS as width, index ( index )}
                <div class="bg-paper-100 dark:bg-ink-900 h-3 rounded {width}"></div>
            {/each}
        </div>
    </div>
</div>
