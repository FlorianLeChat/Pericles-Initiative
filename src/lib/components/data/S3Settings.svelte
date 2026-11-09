<script lang="ts">
    /**
     * Fields of an S3 compatible bucket, then what the bucket and the key have to allow.
     *
     * The location and the key are two groups, since they are set up in two
     * different places of the provider's console, and the test that proves them
     * follows them in the same column. The contract beside them, for whoever
     * configures the bucket, gives
     * the url of the object as the site will sign it, then the two documents to
     * paste on the other side: the CORS rule of the bucket, naming this site's
     * origin, and a policy restricting the key to this one object. Both follow the
     * fields as they are typed, placeholders standing in for what is still empty.
     *
     * @author Claude
     */
    import type { Snippet } from "svelte";
    import { FIELD } from "#lib/config/forms.ts";
    import * as m from "#lib/locales/messages.js";
    import type { S3Config } from "#lib/types.ts";
    import Input from "flowbite-svelte/Input.svelte";
    import Label from "flowbite-svelte/Label.svelte";
    import Helper from "flowbite-svelte/Helper.svelte";
    import RemoteContract from "./RemoteContract.svelte";
    import Checkbox from "flowbite-svelte/Checkbox.svelte";
    import { DEFAULT_S3_KEY, isUsableS3Config, s3AccessPolicy, s3CorsRule, s3ObjectUrl } from "#lib/utilities/s3.ts";

    interface Props {
        config: S3Config;
        /** Origin this site is served from, empty until mounted. */
        origin: string;
        /** The test of the connection and its outcome, under the fields. */
        actions: Snippet;
    }

    let { config = $bindable(), origin, actions }: Props = $props();

    /** The location as typed, every empty field replaced by its placeholder. */
    const shown = $derived<S3Config>( {
        ...config,
        region: config.region.trim() || m.remote_backup_s3_region_placeholder(),
        bucket: config.bucket.trim() || m.remote_backup_s3_bucket_placeholder()
    } );

    const objectUrl = $derived( s3ObjectUrl( shown ) );
    const example = $derived( !isUsableS3Config( config ) );

    const documents = $derived( [
        ...( origin
            ? [
                {
                    title: m.remote_contract_s3_cors_title(),
                    hint: m.remote_contract_s3_cors_hint(),
                    code: s3CorsRule( origin )
                }
            ]
            : [] ),
        {
            title: m.remote_contract_s3_policy_title(),
            hint: m.remote_contract_s3_policy_hint(),
            code: s3AccessPolicy( shown )
        }
    ] );
</script>

<div class="grid gap-6 lg:grid-cols-2 lg:gap-0">
    <div class="min-w-0 space-y-6 lg:pr-8">
        <fieldset class="space-y-4">
            <legend class="text-ink-900 dark:text-paper-100 mb-3 text-base font-semibold">
                {m.remote_backup_s3_location_legend()}
            </legend>

            <div>
                <Label for="remote-s3-endpoint" class="field-label">{m.remote_backup_s3_endpoint_label()}</Label>

                <Input
                    id="remote-s3-endpoint"
                    bind:value={config.endpoint}
                    type="url"
                    class="{FIELD} font-mono text-xs"
                    aria-describedby="remote-s3-endpoint-hint"
                    placeholder={m.remote_backup_s3_endpoint_placeholder()}
                    autocomplete="off"
                />

                <Helper id="remote-s3-endpoint-hint" class="mt-1.5 text-xs leading-relaxed">
                    {m.remote_backup_s3_endpoint_hint()}
                </Helper>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
                <div>
                    <Label for="remote-s3-region" class="field-label">{m.remote_backup_s3_region_label()}</Label>

                    <Input
                        id="remote-s3-region"
                        bind:value={config.region}
                        class="{FIELD} font-mono text-xs"
                        aria-describedby="remote-s3-region-hint"
                        placeholder={m.remote_backup_s3_region_placeholder()}
                        autocomplete="off"
                        spellcheck="false"
                    />

                    <Helper id="remote-s3-region-hint" class="mt-1.5 text-xs leading-relaxed">
                        {m.remote_backup_s3_region_hint()}
                    </Helper>
                </div>

                <div>
                    <Label for="remote-s3-bucket" class="field-label">{m.remote_backup_s3_bucket_label()}</Label>

                    <Input
                        id="remote-s3-bucket"
                        bind:value={config.bucket}
                        class="{FIELD} font-mono text-xs"
                        placeholder={m.remote_backup_s3_bucket_placeholder()}
                        autocomplete="off"
                        spellcheck="false"
                    />
                </div>
            </div>

            <div>
                <Label for="remote-s3-key" class="field-label">{m.remote_backup_s3_key_label()}</Label>

                <Input
                    id="remote-s3-key"
                    bind:value={config.key}
                    class="{FIELD} font-mono text-xs"
                    aria-describedby="remote-s3-key-hint"
                    placeholder={DEFAULT_S3_KEY}
                    autocomplete="off"
                    spellcheck="false"
                />

                <Helper id="remote-s3-key-hint" class="mt-1.5 text-xs leading-relaxed">
                    {m.remote_backup_s3_key_hint()}
                </Helper>
            </div>

            <Checkbox
                data-cuelume-toggle
                bind:checked={config.pathStyle}
                classes={{ div: "flex items-start text-sm" }}
                class="mt-0.5 shrink-0"
                aria-describedby="remote-s3-path-style-hint"
            >
                <span class="block">
                    {m.remote_backup_s3_path_style_label()}

                    <span id="remote-s3-path-style-hint" class="text-muted mt-1 block text-xs leading-relaxed">
                        {m.remote_backup_s3_path_style_hint()}
                    </span>
                </span>
            </Checkbox>
        </fieldset>

        <div class="border-paper-200 dark:border-ink-700 border-t pt-6">
            <fieldset class="space-y-4">
                <legend class="text-ink-900 dark:text-paper-100 mb-3 text-base font-semibold">
                    {m.remote_backup_s3_credentials_legend()}
                </legend>

                <div>
                    <Label for="remote-s3-access-key" class="field-label">
                        {m.remote_backup_s3_access_key_label()}
                    </Label>

                    <Input
                        id="remote-s3-access-key"
                        bind:value={config.accessKeyId}
                        class="{FIELD} font-mono text-xs"
                        autocomplete="off"
                        spellcheck="false"
                    />
                </div>

                <div>
                    <Label for="remote-s3-secret-key" class="field-label">
                        {m.remote_backup_s3_secret_key_label()}
                    </Label>

                    <Input
                        class={FIELD}
                        id="remote-s3-secret-key"
                        bind:value={config.secretAccessKey}
                        type="password"
                        aria-describedby="remote-s3-secret-key-hint"
                        autocomplete="off"
                    />

                    <Helper id="remote-s3-secret-key-hint" class="mt-1.5 text-xs leading-relaxed">
                        {m.remote_backup_s3_secret_key_hint()}
                    </Helper>
                </div>
            </fieldset>
        </div>

        {@render actions()}
    </div>

    <RemoteContract
        heading={m.remote_contract_s3_heading()}
        intro={m.remote_contract_s3_intro()}
        {example}
        {documents}
        rows={[
            { method: "GET", terms: [ objectUrl ], description: m.remote_contract_s3_get() },
            { method: "PUT", terms: [ objectUrl ], description: m.remote_contract_s3_put() }
        ]}
    />
</div>
