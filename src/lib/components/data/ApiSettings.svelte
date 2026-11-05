<script lang="ts">
    /**
     * Fields of a backup API, then what the person installing it has to set up.
     *
     * The fields and the test that proves them come first, in one column, since
     * they are all the reader has to do. The contract beside them is for whoever
     * installs the API: built from the address typed, it gives the exact urls the
     * site will call, and the CORS headers naming the origin this site is served from.
     *
     * @author Claude
     */
    import type { Snippet } from "svelte";
    import { FIELD } from "#lib/config/forms.ts";
    import * as m from "#lib/locales/messages.js";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import RemoteContract from "./RemoteContract.svelte";
    import { apiCorsHeaders, datasetEndpoint, isUsableBaseUrl, SECRET_HEADER } from "#lib/utilities/remote.ts";

    interface Props {
        baseUrl: string;
        secret: string;
        /** Origin this site is served from, empty until mounted. */
        origin: string;
        /** The test of the connection and its outcome, under the fields. */
        actions: Snippet;
    }

    let { baseUrl = $bindable(), secret = $bindable(), origin, actions }: Props = $props();

    const example = $derived( !isUsableBaseUrl( baseUrl ) );
    const endpoint = $derived( datasetEndpoint( example ? m.remote_backup_url_placeholder() : baseUrl ) );

    const documents = $derived(
        origin
            ? [
                {
                    title: m.remote_contract_api_cors_title(),
                    hint: m.remote_contract_api_cors_hint(),
                    code: apiCorsHeaders( origin )
                }
            ]
            : []
    );
</script>

<div class="grid gap-6 lg:grid-cols-2 lg:gap-0">
    <div class="min-w-0 space-y-4 lg:pr-8">
        <div>
            <Label for="remote-base-url" class="field-label">{m.remote_backup_url_label()}</Label>

            <Input
                id="remote-base-url"
                bind:value={baseUrl}
                type="url"
                class="{FIELD} font-mono text-xs"
                aria-describedby="remote-base-url-hint"
                placeholder={m.remote_backup_url_placeholder()}
                autocomplete="off"
            />

            <Helper id="remote-base-url-hint" class="mt-1.5 text-xs leading-relaxed">
                {m.remote_backup_url_hint()}
            </Helper>
        </div>

        <div>
            <Label for="remote-secret" class="field-label">{m.remote_backup_secret_label()}</Label>

            <Input
                class={FIELD}
                id="remote-secret"
                bind:value={secret}
                type="password"
                aria-describedby="remote-secret-hint"
                placeholder={m.remote_backup_secret_placeholder()}
                autocomplete="off"
            />

            <Helper id="remote-secret-hint" class="mt-1.5 text-xs leading-relaxed">
                {m.remote_backup_secret_hint()}
            </Helper>
        </div>

        {@render actions()}
    </div>

    <RemoteContract
        heading={m.remote_contract_api_heading()}
        intro={m.remote_contract_api_intro()}
        {example}
        {documents}
        rows={[
            { method: "GET", terms: [ endpoint ], description: m.remote_contract_api_get() },
            { method: "PUT", terms: [ endpoint ], description: m.remote_contract_api_put() },
            { terms: [ SECRET_HEADER ], description: m.remote_contract_api_secret() },
            { terms: [ "ETag", "If-Match" ], description: m.remote_contract_api_revision() }
        ]}
    />
</div>
