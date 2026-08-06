<script lang="ts">
    /**
     * Markdown editor, built on Milkdown Crepe.
     *
     * Crepe is a browser only, DOM heavy library, so it is imported dynamically
     * once the component is mounted. Only the structural stylesheet is imported:
     * the colour variables live in `app.css` and follow the site palette.
     *
     * The editor is initialised once from `value` and reports every change
     * through `onchange`. Later changes to `value` are deliberately not pushed
     * back into the editor, which would fight the caret.
     *
     * @author Claude
     */
    import "@milkdown/crepe/theme/common/style.css";
    import type { Crepe as CrepeEditor } from "@milkdown/crepe";
    import { onMount } from "svelte";
    import Icon from "$lib/components/Icon.svelte";
    import EntryPicker from "./EntryPicker.svelte";

    interface Props {
        /** Initial Markdown. */
        value: string;
        /** Called with the full Markdown on every change. */
        onchange: ( markdown: string ) => void;
        placeholder?: string;
    }

    let { value, onchange, placeholder = "Rédigez la fiche. Tapez / pour insérer un bloc." }: Props
        = $props();

    const LINK = "M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244";

    let host: HTMLDivElement;
    let crepe: CrepeEditor | null = null;
    let ready = $state( false );
    let pickerOpen = $state( false );

    onMount( () =>
    {
        let disposed = false;

        const boot = async (): Promise<void> =>
        {
            const { Crepe } = await import( "@milkdown/crepe" );

            const instance = new Crepe( {
                root: host,
                defaultValue: value,
                features: {
                    // Neither formulas nor an assistant belong in an offline fiction wiki.
                    [ Crepe.Feature.Latex ]: false,
                    [ Crepe.Feature.AI ]: false
                },
                featureConfigs: {
                    [ Crepe.Feature.Placeholder ]: { text: placeholder }
                }
            } );

            instance.on( ( api ) =>
            {
                api.markdownUpdated( ( _ctx, markdown ) =>
                {
                    onchange( markdown );
                } );
            } );

            await instance.create();

            if ( disposed )
            {
                await instance.destroy();
                return;
            }

            crepe = instance;
            ready = true;
        };

        void boot();

        return () =>
        {
            disposed = true;
            void crepe?.destroy();
            crepe = null;
        };
    } );

    /**
     * Inserts a link to an internal page at the caret, or turns the selection
     * into one.
     *
     * The link is built as a real ProseMirror mark rather than typed Markdown:
     * inserted text would be escaped on serialisation and the link would be
     * lost.
     *
     * @param slug Target page slug.
     * @param label Link text, used only when nothing is selected.
     * @author Claude
     */
    const insertPageLink = async ( slug: string, label: string ): Promise<void> =>
    {
        if ( !crepe )
        {
            return;
        }

        const [ { editorViewCtx }, { linkSchema } ] = await Promise.all( [
            import( "@milkdown/kit/core" ),
            import( "@milkdown/kit/preset/commonmark" )
        ] );

        crepe.editor.action( ( ctx ) =>
        {
            const view = ctx.get( editorViewCtx );
            const { state, dispatch } = view;
            const { from, to, empty } = state.selection;
            const mark = linkSchema.type( ctx ).create( { href: `/wiki/${ slug }` } );

            if ( empty )
            {
                dispatch( state.tr.replaceWith( from, to, state.schema.text( label, [ mark ] ) ).scrollIntoView() );
            }
            else
            {
                dispatch( state.tr.addMark( from, to, mark ).scrollIntoView() );
            }

            view.focus();
        } );
    };

    /**
     * Opens the page picker on Ctrl+L, the usual shortcut for a link.
     *
     * @param event Keyboard event from the editor frame.
     * @author Claude
     */
    const onKeydown = ( event: KeyboardEvent ): void =>
    {
        if ( ( event.ctrlKey || event.metaKey ) && event.key.toLowerCase() === "l" )
        {
            event.preventDefault();
            pickerOpen = true;
        }
    };
</script>

<div class="surface overflow-hidden" onkeydown={onKeydown} role="none">
    <div
        class="border-paper-200 dark:border-ink-800 dark:bg-ink-900/40 flex flex-wrap items-center gap-2 border-b bg-paper-100/60 px-3 py-2"
    >
        <button
            type="button"
            class="btn btn-outline px-3 py-1.5 text-xs"
            onclick={() => ( pickerOpen = true )}
            disabled={!ready}
        >
            <Icon path={LINK} class="h-3.5 w-3.5" />
            Lier une fiche
            <kbd class="border-paper-300 dark:border-ink-700 ml-1 rounded border px-1 py-0.5 text-[10px]">
                Ctrl L
            </kbd>
        </button>

        <p class="text-ink-400 ml-auto text-xs">
            Markdown. Tapez <kbd class="font-mono">/</kbd> pour un bloc, sélectionnez du texte pour la
            barre de mise en forme.
        </p>
    </div>

    <div bind:this={host} class="min-h-96"></div>

    {#if !ready}
        <p class="text-ink-400 px-6 py-4 text-sm">Chargement de l'éditeur...</p>
    {/if}
</div>

<EntryPicker
    bind:open={pickerOpen}
    onselect={( slug, label ) =>
    {
        void insertPageLink( slug, label );
    }}
/>
