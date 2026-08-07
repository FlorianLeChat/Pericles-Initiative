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
    import { untrack } from "svelte";
    import EntryPicker from "$lib/components/editor/EntryPicker.svelte";
    import ChipsInput from "$lib/components/editor/ChipsInput.svelte";
    import { SEVERITIES } from "$lib/config/severities";
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

    let bodyInput: HTMLTextAreaElement | null = $state( null );
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
        <p class="text-ink-400 text-xs tracking-wide uppercase">
            {editing ? "Modifier une entrée" : "Publier dans le fil"}
        </p>

        {#if editing}
            <button type="button" class="text-ink-400 hover:text-accent-600 text-xs underline" onclick={oncancel}>
                Abandonner la modification
            </button>
        {/if}
    </div>

    <div class="mt-4 space-y-3">
        <div>
            <label class="field-label" for="live-title">Titre</label>

            <input
                id="live-title"
                bind:value={title}
                type="text"
                class="field"
                placeholder="Ce qui vient de se produire"
                required
            />
        </div>

        <div>
            <div class="flex items-baseline justify-between gap-2">
                <label class="field-label" for="live-body">Corps</label>

                <button
                    type="button"
                    class="text-accent-600 dark:text-accent-400 mb-1.5 text-xs underline"
                    onclick={() => ( pickerOpen = true )}
                >
                    Lier une fiche
                </button>
            </div>

            <textarea
                id="live-body"
                bind:this={bodyInput}
                bind:value={body}
                rows="3"
                class="field resize-y"
                placeholder="Une ou deux phrases. Markdown accepté."
            ></textarea>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
            <div>
                <p class="field-label" id="live-severity-label">Gravité</p>

                <div class="flex flex-wrap gap-1.5" role="group" aria-labelledby="live-severity-label">
                    {#each SEVERITIES as config ( config.id )}
                        <button
                            type="button"
                            class="rounded-full px-2.5 py-1 text-xs font-medium transition {severity === config.id
                                ? config.badge + " ring-2 ring-accent-500 ring-offset-1"
                                : "bg-paper-100 text-ink-500 dark:bg-ink-800 dark:text-paper-300"}"
                            onclick={() => ( severity = config.id )}
                            aria-label="Gravité {config.label}"
                            aria-pressed={severity === config.id}
                        >
                            {config.label}
                        </button>
                    {/each}
                </div>
            </div>

            <div>
                <label class="field-label" for="live-date">Horodatage</label>

                <input id="live-date" bind:value={publishedAt} type="datetime-local" class="field py-2" />
            </div>

            <div>
                <label class="field-label" for="live-entry">Fiche détaillée</label>

                <select id="live-entry" bind:value={entrySlug} class="field py-2">
                    <option value="">Aucune</option>

                    {#each wiki.entries as entry ( entry.id )}
                        <option value={entry.slug}>{entry.title}</option>
                    {/each}
                </select>
            </div>

            <div>
                <label class="field-label" for="live-source">Source</label>

                <input
                    id="live-source"
                    bind:value={source}
                    type="text"
                    class="field py-2"
                    placeholder="Conseil des parties"
                />
            </div>
        </div>

        <div>
            <label class="field-label" for="live-tags">Étiquettes</label>

            <ChipsInput bind:values={tags} id="live-tags" placeholder="Étiquette, puis Entrée" />
        </div>

        <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" class="accent-accent-600 h-4 w-4" bind:checked={pinned} />
            Épingler en tête du fil
        </label>
    </div>

    <button type="submit" class="btn btn-primary mt-4 w-full" disabled={!canPublish}>
        {editing ? "Enregistrer" : "Publier"}
    </button>
</form>

<EntryPicker bind:open={pickerOpen} onselect={insertLink} />
