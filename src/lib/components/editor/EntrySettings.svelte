<script lang="ts">
    /**
     * Settings of a page that are not part of what it reads: status, address,
     * other names, and its deletion.
     *
     * They used to sit above the body and down the side of the editor, between
     * the writer and the page. They are folded here, under the infobox card, with
     * a one line summary of what they hold so nothing has to be unfolded to be
     * checked. The one setting that cannot wait, an address already taken, is
     * announced under the title instead.
     *
     * @author Claude
     */
    import ChipsInput from "./ChipsInput.svelte";
    import { FIELD } from "#lib/config/forms.ts";
    import * as m from "#lib/locales/messages.js";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import type { EntryStatus } from "#lib/types.ts";
    import StatusPicker from "./StatusPicker.svelte";
    import { slugify } from "#lib/utilities/slug.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import ChevronDown from "@lucide/svelte/icons/chevron-down";

    interface Props {
        status: EntryStatus;
        slug: string;
        /** False while the address still follows the title. */
        slugLocked: boolean;
        aliases: string[];
        /** Whether the pages citing the old address are rewritten on save. */
        relink: boolean;
        /** Number of pages citing the address the page is leaving, 0 when it stays. */
        citations: number;
        /** Label of the rewrite box, already counted. */
        relinkLabel: string;
        /** Whether another page holds the address typed. */
        slugTaken: boolean;
        /** Called to delete the page, absent while it was never saved. */
        ondelete?: () => void;
    }

    let {
        status = $bindable(),
        slug = $bindable(),
        slugLocked = $bindable(),
        aliases = $bindable(),
        relink = $bindable(),
        citations,
        relinkLabel,
        slugTaken,
        ondelete
    }: Props = $props();

    let open = $state( false );

    const statusLabel = $derived( status === "brouillon" ? m.status_picker_draft() : m.status_picker_published() );
    const path = $derived( `/entries/${ slug.trim() || m.entry_form_slug_placeholder() }` );
</script>

<section class="surface">
    <h2>
        <button
            type="button"
            class="hover:bg-paper-100/60 dark:hover:bg-ink-800/40 flex min-h-12 w-full items-center gap-3 rounded-xl
                   px-4 py-2 text-left transition-colors"
            aria-expanded={open}
            aria-controls="entry-settings"
            onclick={() => ( open = !open )}
        >
            <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium">{m.entry_settings_title()}</span>
                <span class="text-muted block truncate text-xs">
                    {statusLabel} · <span class="font-mono">{path}</span>
                </span>
            </span>

            <ChevronDown class="text-muted h-4 w-4 shrink-0 transition-transform {open ? "rotate-180" : ""}" />
        </button>
    </h2>

    {#if open}
        <div id="entry-settings" class="border-paper-200 dark:border-ink-700 space-y-5 border-t px-4 pt-4 pb-5">
            <StatusPicker bind:status />

            <div>
                <Label for="entry-slug" class="field-label">
                    {m.entry_form_slug_label()}
                    {#if !slugLocked}
                        <span class="text-muted font-normal">{m.entry_form_slug_follows_title()}</span>
                    {/if}
                </Label>

                <div class="flex items-center gap-1.5">
                    <span class="text-muted shrink-0 font-mono text-xs">/entries/</span>

                    <Input
                        id="entry-slug"
                        bind:value={slug}
                        oninput={() => ( slugLocked = true )}
                        onblur={() => ( slug = slug.trim() ? slugify( slug ) : "" )}
                        type="text"
                        size="sm"
                        class="{FIELD} py-2.5 font-mono"
                        aria-invalid={slugTaken}
                        aria-describedby={slugTaken ? "entry-slug-taken" : undefined}
                        placeholder={m.entry_form_slug_placeholder()}
                    />
                </div>

                {#if citations > 0}
                    <Checkbox data-cuelume-toggle bind:checked={relink} classes={{ div: "mt-2 flex min-h-9 items-center text-sm" }}>
                        {relinkLabel}
                    </Checkbox>

                    <Helper class="text-xs leading-relaxed">{m.entry_form_relink_hint()}</Helper>
                {/if}
            </div>

            <div>
                <Label for="entry-aliases" class="field-label">{m.entry_form_aliases_label()}</Label>

                <ChipsInput bind:values={aliases} id="entry-aliases" placeholder={m.entry_form_aliases_placeholder()} />

                <p class="text-muted mt-2 text-xs leading-relaxed">{m.entry_form_aliases_hint()}</p>
            </div>

            {#if ondelete}
                <div class="border-paper-200 dark:border-ink-700 border-t pt-4">
                    <Button color="red" size="sm" class="w-full" onclick={ondelete}>
                        {m.entry_settings_delete()}
                    </Button>
                </div>
            {/if}
        </div>
    {/if}
</section>
