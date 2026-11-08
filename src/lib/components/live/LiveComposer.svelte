<script lang="ts">
    /**
     * Publishes or edits an item of the live feed.
     *
     * The body is a plain textarea rather than Milkdown: these are one or two
     * sentences, and loading the whole editor here would cost a megabyte of
     * JavaScript on a reading page.
     *
     * An entry is written mid-session, between two turns of play, so only what
     * every entry needs is on show: a title, a sentence or two and a gravity.
     * The rest, the time it is dated at, the page it points to, its source, its
     * tags and its pin, is folded under «Plus de précisions», which opens on its
     * own when the entry being edited already uses one of them. Folded there,
     * the time is also given the whole width: a `datetime-local` field cut in
     * half by the narrow column it used to share used to lose its minutes.
     *
     * The one consequence of a choice that reaches past the feed, the site wide
     * banner an «Alerte» raises for a day, is said under the gravity while that
     * gravity is picked, at the moment it matters, rather than in a card beside
     * the feed that every reader had to scroll past.
     *
     * The form closes itself through its own secondary button, beside the one
     * that publishes, so the primary action of the page is never spent on
     * putting the form away.
     *
     * @author Claude
     */
    import { untrack } from "svelte";
    import * as m from "#lib/locales/messages.js";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Radio from "flowbite-svelte/Radio.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import Select from "flowbite-svelte/Select.svelte";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import Textarea from "flowbite-svelte/Textarea.svelte";
    import { SEVERITIES } from "#lib/config/severities.ts";
    import type { LiveEntry, LiveSeverity } from "#lib/types.ts";
    import ChipsInput from "#lib/components/editor/ChipsInput.svelte";
    import EntryPicker from "#lib/components/editor/EntryPicker.svelte";
    import ChevronRight from "@lucide/svelte/icons/chevron-right";
    import { fromDateTimeInput, toDateTimeInput } from "#lib/utilities/date.ts";
    import { FIELD, RADIO_OVERLAY, SMALL_FIELD, TOUCH_HEIGHT } from "#lib/config/forms.ts";

    interface Props {
        /** Item being edited, absent when publishing a new one. */
        editing?: LiveEntry;
        /** Called once the item is stored. */
        onsaved?: () => void;
        /** Called when the reader closes the form, giving up what it holds. */
        oncancel?: () => void;
    }

    let { editing, onsaved, oncancel }: Props = $props();

    /** Sentence telling what the «Alerte» gravity does, shown while it is picked. */
    const BREAKING_HINT_ID = "live-breaking-hint";

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

    /** Whether the details open folded: they do unless the entry edited already uses one. */
    const detailed = untrack( () =>
        Boolean( editing && ( editing.entrySlug || editing.source || editing.tags.length > 0 || editing.pinned ) )
    );

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
        const markdown = `[${ label }](/entries/${ slug })`;

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
    <h2 class="text-ink-900 dark:text-paper-100 text-base font-semibold">
        {editing ? m.live_composer_edit_heading() : m.live_composer_publish_heading()}
    </h2>

    <div class="mt-4 space-y-3">
        <div>
            <Label for="live-title" class="field-label">{m.live_composer_title_label()}</Label>

            <Input class={FIELD} id="live-title" bind:value={title} type="text" placeholder={m.live_composer_title_placeholder()} required />
        </div>

        <div>
            <div class="flex items-baseline justify-between gap-2">
                <Label for="live-body" class="field-label">{m.live_composer_body_label()}</Label>

                <button
                    type="button"
                    class="text-accent-600 dark:text-accent-400 mb-1.5 inline-flex items-center text-xs underline {TOUCH_HEIGHT}"
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
                class="{FIELD} w-full resize-y"
                placeholder={m.live_composer_body_placeholder()}
            />
        </div>

        <fieldset aria-describedby={severity === "breaking" ? BREAKING_HINT_ID : undefined}>
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

            {#if severity === "breaking"}
                <p id={BREAKING_HINT_ID} class="text-muted mt-2 text-xs leading-relaxed">
                    {m.live_composer_breaking_hint()}
                </p>
            {/if}
        </fieldset>

        <details class="group" open={detailed}>
            <summary
                class="text-accent-700 dark:text-accent-300 flex min-h-11 w-fit cursor-pointer items-center text-sm
                       font-medium sm:min-h-9"
            >
                <ChevronRight
                    class="mr-1 size-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
                    aria-hidden="true"
                />
                {m.live_composer_more()}
            </summary>

            <div class="mt-2 space-y-3">
                <div>
                    <Label for="live-date" class="field-label">{m.live_composer_timestamp_label()}</Label>

                    <Input
                        id="live-date"
                        bind:value={publishedAt}
                        type="datetime-local"
                        size="sm"
                        class="{FIELD} {SMALL_FIELD} w-full"
                    />
                </div>

                <div>
                    <Label for="live-entry" class="field-label">{m.live_composer_entry_label()}</Label>

                    <Select classes={{ select: FIELD }} id="live-entry" bind:value={entrySlug} size="sm" placeholder="">
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
                        class="{FIELD} {SMALL_FIELD}"
                        placeholder={m.live_composer_source_placeholder()}
                    />
                </div>

                <div>
                    <Label for="live-tags" class="field-label">{m.live_composer_tags_label()}</Label>

                    <ChipsInput bind:values={tags} id="live-tags" placeholder={m.live_composer_tags_placeholder()} />
                </div>

                <Checkbox bind:checked={pinned} classes={{ div: "flex min-h-9 items-center text-sm" }}>
                    {m.live_composer_pin_checkbox()}
                </Checkbox>
            </div>
        </details>
    </div>

    <div class="mt-4 flex gap-2">
        <Button color="alternative" class="flex-1" onclick={oncancel}>{m.live_composer_close()}</Button>

        <Button type="submit" color="primary" class="flex-1" disabled={!canPublish}>
            {editing ? m.common_save() : m.live_composer_publish_button()}
        </Button>
    </div>
</form>

<EntryPicker bind:open={pickerOpen} onselect={insertLink} />
