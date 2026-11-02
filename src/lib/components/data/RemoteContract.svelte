<script lang="ts">
    /**
     * What a destination has to accept, written for whoever sets it up rather than for the reader.
     *
     * The person filling the form only needs the fields; the person installing
     * the API or configuring the bucket needs the urls, the headers and the
     * documents to paste. So the contract is a single line by default, with one
     * button copying all of it as plain instructions to hand over, and the detail
     * folded underneath for whoever wants to read it here.
     *
     * Everything is built from the fields as they are typed. A url still made of
     * the placeholders is drawn muted: it shows the shape the request will take,
     * not one the site is about to send.
     *
     * @author Claude
     */
    import CopyButton from "./CopyButton.svelte";
    import * as m from "#lib/locales/messages.js";
    import CodeSnippet from "./CodeSnippet.svelte";
    import ChevronRight from "@lucide/svelte/icons/chevron-right";

    /** One line of the contract: a request, or a header the destination reads or sends. */
    interface ContractRow {
        /** Method of a request, absent for a header. */
        method?: "GET" | "PUT";
        /** The url of the request, or the names of the headers, as machine strings. */
        terms: string[];
        description: string;
    }

    /** A document to paste on the other side, a CORS rule or a policy. */
    interface ContractDocument {
        title: string;
        hint: string;
        code: string;
    }

    interface Props {
        heading: string;
        intro: string;
        rows: ContractRow[];
        documents: ContractDocument[];
        /** True while the url is built from placeholders rather than from the fields. */
        example: boolean;
    }

    let { heading, intro, rows, documents, example }: Props = $props();

    const headingId = $props.id();
    const introId = `${ headingId }-intro`;

    /**
     * Writes one row as two lines of plain text, its terms then their description.
     *
     * @param row Request or header of the contract.
     * @returns The row, as it reads in the copied instructions.
     * @author Claude
     */
    const rowText = ( row: ContractRow ): string =>
    {
        const terms = row.terms.join( ", " );
        const line = row.method ? `${ row.method } ${ terms }` : terms;

        return `${ line }\n${ row.description }`;
    };

    /** The whole contract as plain text, in the order it reads on screen. */
    const instructions = $derived(
        [
            heading,
            intro,
            ...rows.map( rowText ),
            ...documents.map( ( document ) => `${ document.title }\n${ document.hint }\n\n${ document.code }` )
        ].join( "\n\n" )
    );
</script>

<aside
    class="border-paper-200 dark:border-ink-700 min-w-0 border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8"
    aria-labelledby={headingId}
>
    <h3 id={headingId} class="text-ink-900 dark:text-paper-100 text-sm font-semibold">{heading}</h3>

    <p id={introId} class="text-muted mt-1 text-sm leading-relaxed text-pretty">{intro}</p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
        <CopyButton label={m.remote_contract_copy_all()} name={heading} text={instructions} describedby={introId} />
    </div>

    <details class="group mt-2">
        <summary
            class="text-accent-700 dark:text-accent-300 flex min-h-11 w-fit cursor-pointer items-center text-sm
                   font-medium sm:min-h-9"
        >
            <ChevronRight
                class="mr-1 size-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
                aria-hidden="true"
            />
            {m.remote_contract_details()}
        </summary>

        <dl class="divide-paper-200 dark:divide-ink-700 mt-2 divide-y">
            {#each rows as row ( row.terms.join( " " ) + ( row.method ?? "" ) )}
                <div class="py-3 first:pt-0">
                    <dt class="flex items-baseline gap-2">
                        {#if row.method}
                            <span
                                class="bg-paper-100 text-ink-800 dark:bg-ink-800 dark:text-paper-100 shrink-0 rounded-md
                                       px-1.5 py-0.5 font-mono text-xs"
                            >
                                {row.method}
                            </span>
                        {/if}

                        <span
                            class={[
                                "min-w-0 font-mono text-xs wrap-anywhere",
                                row.method && example
                                    ? "text-ink-400 dark:text-paper-400"
                                    : "text-ink-900 dark:text-paper-100"
                            ]}
                        >
                            {row.terms.join( ", " )}
                        </span>
                    </dt>

                    <dd class="text-muted mt-1 text-xs leading-relaxed text-pretty">{row.description}</dd>
                </div>
            {/each}
        </dl>

        {#if documents.length > 0}
            <div class="border-paper-200 dark:border-ink-700 mt-3 space-y-5 border-t pt-5">
                {#each documents as document ( document.title )}
                    <CodeSnippet title={document.title} hint={document.hint} code={document.code} />
                {/each}
            </div>
        {/if}
    </details>
</aside>
