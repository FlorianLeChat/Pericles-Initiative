<script lang="ts">
    /**
     * Every way of keeping a copy of the wiki, behind one choice of destination: a
     * file on this device, a backup API, or an S3 compatible bucket.
     *
     * The three are one question asked once, «where does the copy live», so they
     * share a row of tiles rather than two panels the reader has to compare. The
     * file is offered first, and chosen until an online destination has been
     * stored, since it needs nothing set up and fires no request.
     *
     * Both bodies stay mounted and are only hidden, so an address half typed or
     * a backup pasted but not yet restored survives a look at another tile. Each
     * keeps its own feedback, since a file and a server fail for unrelated reasons.
     *
     * @author Claude
     */
    import FileBackup from "./FileBackup.svelte";
    import * as m from "#lib/locales/messages.js";
    import Cloud from "@lucide/svelte/icons/cloud";
    import type { RemoteKind } from "#lib/types.ts";
    import Server from "@lucide/svelte/icons/server";
    import Radio from "flowbite-svelte/Radio.svelte";
    import RemoteBackup from "./RemoteBackup.svelte";
    import { RADIO_OVERLAY } from "#lib/config/forms.ts";
    import { remote } from "#lib/state/remote.svelte.ts";
    import HardDrive from "@lucide/svelte/icons/hard-drive";

    type Destination = "file" | RemoteKind;

    /** The tiles, in the order a reader should consider them: the one needing nothing set up first. */
    const DESTINATIONS: { value: Destination; icon: typeof Cloud; title: () => string; hint: () => string }[] = [
        { value: "file", icon: HardDrive, title: m.backup_destination_file, hint: m.backup_destination_file_hint },
        { value: "api", icon: Server, title: m.backup_destination_api, hint: m.backup_destination_api_hint },
        { value: "s3", icon: Cloud, title: m.backup_destination_s3, hint: m.backup_destination_s3_hint }
    ];

    /** Shape shared by the destination tiles, the radio stretched over each. */
    const DESTINATION_TILE = `relative flex flex-col items-start gap-1 rounded-xl border p-3 text-sm transition
                              cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
                              has-[:focus-visible]:outline-accent-500`;

    /** Border of the tile carrying the destination on screen. */
    const TILE_CHOSEN = "border-ink-800 dark:border-paper-200";

    /** Border of a tile the reader may still switch to. */
    const TILE_OFFERED = "border-paper-200 hover:border-paper-300 dark:border-ink-700 dark:hover:border-ink-600";

    let destination = $state<Destination>( "file" );
    let seeded = $state( false );

    // The stored destination is read from `localStorage`, so the prerendered page
    // always opens on the file, and a reader who set one up is moved to it once,
    // after mounting. The guard keeps a later choice of tile from being undone.
    $effect( () =>
    {
        remote.loadConfig();

        if ( remote.loaded && !seeded )
        {
            destination = remote.configured ? remote.config.kind : "file";
            seeded = true;
        }
    } );

    // While the file is on screen, the hidden online form keeps showing the
    // destination it would come back to, so its draft does not jump tiles.
    const remoteKind = $derived<RemoteKind>( destination === "file" ? remote.config.kind : destination );
</script>

<section class="surface mt-6 p-6" aria-labelledby="backup-heading">
    <h2 id="backup-heading" class="section-heading">{m.backup_heading()}</h2>

    <p class="text-muted mt-1.5 text-sm">{m.backup_intro()}</p>

    <fieldset class="mt-5">
        <legend class="field-label">{m.backup_destination_legend()}</legend>

        <div class="grid gap-2 sm:grid-cols-3">
            {#each DESTINATIONS as tile ( tile.value )}
                <Radio
                    name="backup-destination"
                    value={tile.value}
                    bind:group={destination}
                    class={RADIO_OVERLAY}
                    classes={{
                        label: `${ DESTINATION_TILE } ${ destination === tile.value ? TILE_CHOSEN : TILE_OFFERED }`
                    }}
                >
                    <span class="text-ink-900 dark:text-paper-100 flex items-center gap-2 font-medium">
                        <tile.icon class="text-ink-400 dark:text-paper-400 size-4 shrink-0" aria-hidden="true" />
                        {tile.title()}
                    </span>

                    <span class="text-muted text-xs leading-relaxed">{tile.hint()}</span>
                </Radio>
            {/each}
        </div>
    </fieldset>

    <div class="border-paper-200 dark:border-ink-800 mt-6 border-t pt-6">
        <div hidden={destination !== "file"}>
            <FileBackup />
        </div>

        <div hidden={destination === "file"}>
            <RemoteBackup kind={remoteKind} />
        </div>
    </div>
</section>
