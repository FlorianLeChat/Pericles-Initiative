<script lang="ts">
    /**
     * One group of the settings page: what it is about on the left, its controls on the right.
     *
     * The groups are divided by a hairline rather than boxed in cards. Stacked as
     * cards of equal weight, the identity, the featured pages, the language and the
     * reset read as four forms of the same importance, and the eye had nothing to
     * scan down; a column of headings does that job. The heading column sticks
     * beside the long identity group, so its name stays in view while its fields
     * scroll past.
     *
     * @author Claude
     */
    import type { Snippet } from "svelte";

    interface Props {
        heading: string;
        /** A sentence saying what the group governs, under its heading. */
        description: string;
        /** Extra classes on the section, such as dropping the hairline of the first one. */
        class?: string;
        children: Snippet;
    }

    let { heading, description, class: frame = "", children }: Props = $props();

    const headingId = $props.id();
</script>

<section class="settings-section {frame}" aria-labelledby={headingId}>
    <div class="md:sticky md:top-24 md:self-start">
        <h2 id={headingId} class="section-heading">{heading}</h2>

        <p class="text-muted mt-1.5 text-sm leading-relaxed text-pretty">{description}</p>
    </div>

    <div class="min-w-0">
        {@render children()}
    </div>
</section>
