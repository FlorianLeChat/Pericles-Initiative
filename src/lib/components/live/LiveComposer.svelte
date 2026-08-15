<script lang="ts">
    /**
     * Publishes or edits an item of the live feed.
     *
     * The body is a plain textarea rather than Milkdown: these are one or two
     * sentences, and loading the whole editor here would cost a megabyte of
     * JavaScript on a reading page.
     *
     * @author Claude
     */
    import Button from "flowbite-svelte/Button.svelte";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Radio from "flowbite-svelte/Radio.svelte";
    import Select from "flowbite-svelte/Select.svelte";
    import Textarea from "flowbite-svelte/Textarea.svelte";
    import { untrack } from "svelte";
    import EntryPicker from "$lib/components/editor/EntryPicker.svelte";
    import ChipsInput from "$lib/components/editor/ChipsInput.svelte";
    import { RADIO_OVERLAY, SMALL_FIELD } from "$lib/config/forms";
    import { SEVERITIES } from "$lib/config/severities";
    import * as m from "$lib/locales/messages.js";
    import { wiki } from "$lib/state/wiki.svelte";
    import type { LiveEntry, LiveSeverity } from "$lib/types";
    import { fromDateTimeInput, toDateTimeInput } from "$lib/utilities/date";

    interface Props {
        /** Item being edited, absent when publishing a new one. */
        editing?: LiveEntry;
        /** Called once the item is stored. */
        onsaved?: () => void;
        /** Called when the user gives up editing. */
        oncancel?: () => void;
    }

    let { editing, onsaved, oncancel }: Props = $props();

    /** Seeded once from the props, the parent remounts on another item. */
    const initial = untrack( () => ( {
        title: editing?.title ?? "",
        body: editing?.body ?? "",
        severity: editing?.severity ?? ( "info" as LiveSeverity ),
        tags: [ ...( editing?.tags ?? [] ) ],
        entrySlug: editing?.entrySlug ?? "",
        source: editing?.source ?? "",
        pinned: editing?.pinned ?? false,
        publishedAt: toDateTimeInput( editing?.publishedAt ?? new Date().toISOString() )
    } ) );

    let title = $state( initial.title );
    let body = $state( initial.body );
    let severity = $state<LiveSeverity>( initial.severity );
    let tags = $state<string[]>( initial.tags );
    let entrySlug = $state( initial.entrySlug );
    let source = $state( initial.source );
    let pinned = $state( initial.pinned );
    let publishedAt = $state( initial.publishedAt );

    // Undefined rather than null: this is bound to the `elementRef` of a Flowbite
    // textarea, whose own binding starts out undefined.
    let bodyInput: HTMLTextAreaElement | undefined = $state( undefined );
    let pickerOpen = $state( false );

    const canPublish = $derived( title.trim().length > 0 );

    /**
     * Inserts a Markdown link to a page at the caret.
     *
     * @param slug Target page slug.
     * @param label Link text.
     * @author Claude
     */
    const insertLink = ( slug: string, label: string ): void =>
    {
        const markdown = `[${ label }](/wiki/${ slug })`;

        if ( !bodyInput )
        {
            body += markdown;
            return;
        }

        const start = bodyInput.selectionStart;
        const end = bodyInput.selectionEnd;
        body = body.slice( 0, start ) + markdown + body.slice( end );

        const caret = start + markdown.length;
        requestAnimationFrame( () =>
        {
            bodyInput?.focus();
            bodyInput?.setSelectionRange( caret, caret );
        } );
    };

    /**
     * Stores the item and resets the form.
     *
     * @author Claude
     */
    const publish = (): void =>
    {
        if ( !canPublish )
        {
            return;
        }

        wiki.saveLiveEntry( {
            id: editing?.id,
            title: title.trim(),
            body: body.trim(),
            severity,
            tags: [ ...tags ],
            entrySlug: entrySlug || null,
            source: source.trim() || null,
            pinned,
            publishedAt: fromDateTimeInput( publishedAt )
        } );

        if ( !editing )
        {
            title = "";
            body = "";
            severity = "info";
            tags = [];
            entrySlug = "";
            source = "";
            pinned = false;
            publishedAt = toDateTimeInput( new Date().toISOString() );
        }

        onsaved?.();
    };
</script>

<form
    class="surface p-5"
    onsubmit={( event ) =>
    {
        event.preventDefault();
        publish();
    }}
>
    <div class="flex flex-wrap items-baseline justify-between gap-2">
        <p class="text-muted text-xs tracking-wide uppercase">
            {editing ? m.live_composer_edit_heading() : m.live_composer_publish_heading()}
        </p>

        {#if editing}
            <button type="button" class="text-muted hover:text-accent-600 text-xs underline" onclick={oncancel}>
                {m.live_composer_cancel_edit()}
            </button>
        {/if}
    </div>

    <div class="mt-4 space-y-3">
        <div>
            <Label for="live-title" class="field-label">{m.live_composer_title_label()}</Label>

            <Input id="live-title" bind:value={title} type="text" placeholder={m.live_composer_title_placeholder()} required />
        </div>

        <div>
            <div class="flex items-baseline justify-between gap-2">
                <Label for="live-body" class="field-label">{m.live_composer_body_label()}</Label>

                <button
                    type="button"
                    class="text-accent-600 dark:text-accent-400 mb-1.5 text-xs underline"
                    onclick={() => ( pickerOpen = true )}
                >
                    {m.live_composer_link_button()}
                </button>
            </div>

            <Textarea
                id="live-body"
                bind:elementRef={bodyInput}
                bind:value={body}
                rows={3}
                class="w-full resize-y"
                placeholder={m.live_composer_body_placeholder()}
            />
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
            <fieldset>
                <legend class="field-label">{m.live_composer_severity_legend()}</legend>

                <div class="flex flex-wrap gap-1.5">
                    {#each SEVERITIES as config ( config.id )}
                        <Radio
                            name="live-severity"
                            value={config.id}
                            bind:group={severity}
                            class={RADIO_OVERLAY}
                            classes={{
                                label: `relative flex min-h-9 cursor-pointer items-center rounded-full px-2.5 text-xs
                                        font-medium transition has-[:focus-visible]:outline-2
                                        has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-500 ${
                                            severity === config.id
                                                ? `${ config.badge } ring-accent-500 ring-2 ring-offset-1`
                                                : "bg-paper-100 text-ink-500 dark:bg-ink-800 dark:text-paper-300"
                                        }`
                            }}
                        >
                            {config.label}
                        </Radio>
                    {/each}
                </div>
            </fieldset>

            <div>
                <Label for="live-date" class="field-label">{m.live_composer_timestamp_label()}</Label>

                <Input id="live-date" bind:value={publishedAt} type="datetime-local" size="sm" class={SMALL_FIELD} />
            </div>

            <div>
                <Label for="live-entry" class="field-label">{m.live_composer_entry_label()}</Label>

                <Select id="live-entry" bind:value={entrySlug} size="sm" placeholder="">
                    <option value="">{m.live_composer_entry_none()}</option>

                    {#each wiki.entries as entry ( entry.id )}
                        <option value={entry.slug}>{entry.title}</option>
                    {/each}
                </Select>
            </div>

            <div>
                <Label for="live-source" class="field-label">{m.live_composer_source_label()}</Label>

                <Input
                    id="live-source"
                    bind:value={source}
                    type="text"
                    size="sm"
                    class={SMALL_FIELD}
                    placeholder={m.live_composer_source_placeholder()}
                />
            </div>
        </div>

        <div>
            <Label for="live-tags" class="field-label">{m.live_composer_tags_label()}</Label>

            <ChipsInput bind:values={tags} id="live-tags" placeholder={m.live_composer_tags_placeholder()} />
        </div>

        <Checkbox bind:checked={pinned} classes={{ div: "flex min-h-9 items-center text-sm" }}>
            {m.live_composer_pin_checkbox()}
        </Checkbox>
    </div>

    <Button type="submit" color="primary" class="mt-4 w-full" disabled={!canPublish}>
        {editing ? m.common_save() : m.live_composer_publish_button()}
    </Button>
</form>

<EntryPicker bind:open={pickerOpen} onselect={insertLink} />
