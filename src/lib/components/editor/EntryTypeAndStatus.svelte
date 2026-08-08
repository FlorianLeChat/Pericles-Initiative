<script lang="ts">
    /**
     * Nature and status pickers of the entry form.
     *
     * @author Claude
     */
    import { ENTRY_TYPES } from "$lib/config/entry-types";
    import type { EntryStatus, EntryType } from "$lib/types";

    interface Props {
        type: EntryType;
        status: EntryStatus;
    }

    let { type = $bindable(), status = $bindable() }: Props = $props();
</script>

<fieldset class="surface p-5">
    <legend class="text-muted mb-3 text-xs tracking-wide uppercase">Nature</legend>

    <div class="grid grid-cols-2 gap-1.5">
        {#each ENTRY_TYPES as config ( config.id )}
            <button
                type="button"
                class="rounded-xl px-2.5 py-2 text-xs font-medium transition {type === config.id
                    ? "bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900"
                    : "bg-paper-100 text-ink-600 dark:bg-ink-800 dark:text-paper-300"}"
                onclick={() => ( type = config.id )}
            >
                {config.label}
            </button>
        {/each}
    </div>
</fieldset>

<fieldset class="surface mt-5 p-5">
    <legend class="text-muted mb-3 text-xs tracking-wide uppercase">Statut</legend>

    <div class="flex gap-1.5">
        <button
            type="button"
            class="flex-1 rounded-xl px-3 py-2 text-xs font-medium transition {status === "publie"
                ? "bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900"
                : "bg-paper-100 text-ink-600 dark:bg-ink-800 dark:text-paper-300"}"
            onclick={() => ( status = "publie" )}
        >
            Publiée
        </button>

        <button
            type="button"
            class="flex-1 rounded-xl px-3 py-2 text-xs font-medium transition {status === "brouillon"
                ? "bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900"
                : "bg-paper-100 text-ink-600 dark:bg-ink-800 dark:text-paper-300"}"
            onclick={() => ( status = "brouillon" )}
        >
            Brouillon
        </button>
    </div>
</fieldset>
