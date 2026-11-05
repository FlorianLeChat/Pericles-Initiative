<script lang="ts">
    /**
     * Row of templates a new page can start from, over its title.
     *
     * One choice among several, so a radio group drawn as pills like every other
     * single choice of the site. The parent decides what a change does, since
     * replacing what was already written has to be confirmed first: the group is
     * therefore driven by `chosen` and reports `onchoose`, rather than bound.
     *
     * @author Claude
     */
    import * as m from "#lib/locales/messages.js";
    import Radio from "flowbite-svelte/Radio.svelte";
    import { filterPill, RADIO_OVERLAY } from "#lib/config/forms.ts";
    import { PAGE_TEMPLATES, type PageTemplate } from "#lib/config/templates.ts";

    interface Props {
        /** Identifier of the template currently applied. */
        chosen: PageTemplate[ "id" ];
        /** Called with the template the writer picked. */
        onchoose: ( template: PageTemplate ) => void;
    }

    let { chosen, onchoose }: Props = $props();
</script>

<fieldset class="mb-6 flex flex-wrap items-center gap-1.5">
    <legend class="text-muted float-left mr-1.5 text-xs">{m.template_legend()}</legend>

    {#each PAGE_TEMPLATES as template ( template.id )}
        <Radio
            name="entry-template"
            value={template.id}
            group={chosen}
            onchange={() => onchoose( template )}
            class={RADIO_OVERLAY}
            classes={{ label: filterPill( chosen === template.id ) }}
        >
            <template.icon class="h-3.5 w-3.5 max-sm:hidden" aria-hidden="true" />
            {template.label()}
        </Radio>
    {/each}
</fieldset>
