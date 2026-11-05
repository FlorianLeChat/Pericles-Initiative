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
    import { onMount } from "svelte";
    import Link from "@lucide/svelte/icons/link";
    import Kbd from "flowbite-svelte/Kbd.svelte";
    import * as m from "#lib/locales/messages.js";
    import EntryPicker from "./EntryPicker.svelte";
    import Button from "flowbite-svelte/Button.svelte";
    import Sparkles from "@lucide/svelte/icons/sparkles";
    import GeneratorDialog from "./GeneratorDialog.svelte";
    import { IMAGE_MAX_SIDE } from "#lib/config/images.ts";
    import { platform } from "#lib/state/platform.svelte.ts";
    import ImageImportDialog from "./ImageImportDialog.svelte";
    import type { Crepe as CrepeEditor } from "@milkdown/crepe";
    import type { GeneratorKind } from "#lib/config/generator.ts";
    import { dataUrlBlob, pastedImage } from "#lib/utilities/image.ts";

    interface Props {
        /** Initial Markdown. */
        value: string;
        /** Called with the full Markdown on every change. */
        onchange: ( markdown: string ) => void;
        placeholder?: string;
        /** Accessible name of the editing area. */
        label?: string;
        /** Kind of name the generator offers first. */
        generatorKind?: GeneratorKind;
    }

    let {
        value,
        onchange,
        placeholder = m.markdown_editor_placeholder(),
        label = m.markdown_editor_label(),
        generatorKind = "fullName"
    }: Props = $props();

    /** Gap kept between the block menu and whatever bounds it, in pixels. */
    const MENU_MARGIN = 8;

    /** Distance between the caret and the block menu, Crepe’s own. */
    const MENU_OFFSET = 10;

    /** Height the list of the block menu never exceeds, Crepe’s own, nor shrinks under. */
    const MENU_LIST_MAX = 420;
    const MENU_LIST_MIN = 120;

    /**
     * Space the block menu has to stay clear of, on each side of the window.
     *
     * The top is wherever the bars pinned there end, the header and the save
     * bar, which both mark themselves `data-sticky-top`: they sit above the
     * menu, so a menu flipped above the caret slid under them and lost its
     * first entries. Measured on every placement, since a phone wraps the bars.
     *
     * @returns Padding for the placement of the menu.
     * @author Claude
     */
    const menuPadding = (): { top: number; bottom: number; left: number; right: number } =>
    {
        const bottoms = [ ...document.querySelectorAll( "[data-sticky-top]" ) ]
            .map( ( element ) => element.getBoundingClientRect().bottom );

        return { top: Math.max( 0, ...bottoms ) + MENU_MARGIN, bottom: MENU_MARGIN, left: MENU_MARGIN, right: MENU_MARGIN };
    };

    let host: HTMLDivElement;
    let importer: ImageImportDialog | undefined = $state();
    let crepe: CrepeEditor | null = null;
    let ready = $state( false );
    let pickerOpen = $state( false );
    let generatorOpen = $state( false );

    onMount( () =>
    {
        let disposed = false;

        const boot = async (): Promise<void> =>
        {
            const [ { Crepe }, { flip, offset, size }, { imageBlockWithAlt } ] = await Promise.all( [
                import( "@milkdown/crepe" ),
                import( "@floating-ui/dom" ),
                import( "#lib/utilities/image-block.ts" )
            ] );

            const menuPlacement = [
                offset( MENU_OFFSET ),
                flip( () => ( { padding: menuPadding() } ) ),
                size( () => ( {
                    padding: menuPadding(),
                    apply: ( { availableHeight, elements } ) =>
                    {
                        const list = elements.floating.querySelector<HTMLElement>( ".menu-groups" );
                        const tabs = elements.floating.querySelector<HTMLElement>( ".tab-group" )?.offsetHeight ?? 0;
                        const room = Math.min( MENU_LIST_MAX, availableHeight - tabs );

                        list?.style.setProperty( "max-height", `${ Math.max( MENU_LIST_MIN, room ) }px` );
                    }
                } ) )
            ];

            const instance = new Crepe( {
                root: host,
                defaultValue: value,
                features: {
                    [ Crepe.Feature.Latex ]: false,
                    [ Crepe.Feature.AI ]: false
                },
                featureConfigs: {
                    [ Crepe.Feature.Placeholder ]: { text: placeholder },
                    [ Crepe.Feature.BlockEdit ]: {
                        slashMenu: { floatingUIOptions: { middleware: menuPlacement } },
                        textGroup: {
                            label: m.crepe_block_text_group(),
                            text: { label: m.crepe_block_text() },
                            h1: null,
                            h2: { label: m.crepe_block_h2() },
                            h3: { label: m.crepe_block_h3() },
                            h4: { label: m.crepe_block_h4() },
                            h5: null,
                            h6: null,
                            quote: { label: m.crepe_block_quote() },
                            divider: { label: m.crepe_block_divider() }
                        },
                        listGroup: {
                            label: m.crepe_block_list_group(),
                            bulletList: { label: m.crepe_block_bullet_list() },
                            orderedList: { label: m.crepe_block_ordered_list() },
                            taskList: { label: m.crepe_block_task_list() }
                        },
                        advancedGroup: {
                            label: m.crepe_block_advanced_group(),
                            image: { label: m.crepe_block_image() },
                            codeBlock: { label: m.crepe_block_code() },
                            table: { label: m.crepe_block_table() },
                            math: null
                        }
                    },
                    [ Crepe.Feature.Toolbar ]: {
                        boldLabel: m.crepe_toolbar_bold(),
                        italicLabel: m.crepe_toolbar_italic(),
                        strikethroughLabel: m.crepe_toolbar_strikethrough(),
                        codeLabel: m.crepe_toolbar_code(),
                        linkLabel: m.crepe_toolbar_link()
                    },
                    [ Crepe.Feature.LinkTooltip ]: { inputPlaceholder: m.crepe_link_placeholder() },
                    [ Crepe.Feature.ImageBlock ]: {
                        onUpload: async ( file: File ) => ( await importer?.pick( file ) ) ?? "",
                        inlineUploadButton: m.crepe_image_upload(),
                        inlineUploadPlaceholderText: m.crepe_image_paste_link(),
                        blockUploadButton: m.crepe_image_upload_file(),
                        blockUploadPlaceholderText: m.crepe_image_paste_link(),
                        blockCaptionPlaceholderText: m.crepe_image_caption(),
                        blockConfirmButton: m.crepe_image_confirm()
                    },
                    [ Crepe.Feature.CodeMirror ]: {
                        searchPlaceholder: m.crepe_code_search(),
                        noResultText: m.crepe_code_no_result(),
                        copyText: m.crepe_code_copy(),
                        previewToggleText: ( previewOnly: boolean ) =>
                            previewOnly ? m.crepe_code_preview_edit() : m.crepe_code_preview_hide()
                    }
                }
            } );

            instance.editor.use( imageBlockWithAlt );

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

            // Crepe builds its own `role="textbox"` and gives it no name, so a
            // screen reader announces the body of a page as an unlabelled edit
            // area. The element only exists once the editor is created, which is
            // why the label is put on afterwards rather than declared in markup.
            host.querySelector( ".ProseMirror" )?.setAttribute( "aria-label", label );

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
            const mark = linkSchema.type( ctx ).create( { href: `/entries/${ slug }` } );

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
     * Writes plain text at the caret, replacing the selection when there is one.
     *
     * @param value Text to write.
     * @author Claude
     */
    const insertText = async ( value: string ): Promise<void> =>
    {
        if ( !crepe )
        {
            return;
        }

        const { editorViewCtx } = await import( "@milkdown/kit/core" );

        crepe.editor.action( ( ctx ) =>
        {
            const view = ctx.get( editorViewCtx );
            const { state, dispatch } = view;

            dispatch( state.tr.insertText( value ).scrollIntoView() );
            view.focus();
        } );
    };

    /**
     * Imports base64 pasted into the link field of an image block, and confirms
     * the reduced image the way Enter does in that field.
     *
     * @param field Link field of the image block.
     * @param data Data url of the pasted image.
     * @author Claude
     */
    const importIntoBlock = async ( field: HTMLInputElement, data: string ): Promise<void> =>
    {
        const url = await importer?.pick( await dataUrlBlob( data ) );

        if ( !url )
        {
            return;
        }

        field.value = url;
        field.dispatchEvent( new Event( "input", { bubbles: true } ) );
        field.dispatchEvent( new KeyboardEvent( "keydown", { key: "Enter", bubbles: true } ) );
    };

    /**
     * Sends base64 pasted into the link field of an image block through the
     * import dialog, rather than letting Crepe store it at full size.
     *
     * @param event Paste anywhere in the editor frame.
     * @author Claude
     */
    const onPaste = ( event: ClipboardEvent ): void =>
    {
        const field = event.target;

        if ( !( field instanceof HTMLInputElement ) || field.closest( ".image-edit" ) === null )
        {
            return;
        }

        const data = pastedImage( event.clipboardData?.getData( "text/plain" ) ?? "" );

        if ( data )
        {
            event.preventDefault();
            void importIntoBlock( field, data );
        }
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

<div class="surface" onkeydown={onKeydown} onpastecapture={onPaste} role="none">
    <div
        class="border-paper-200 dark:border-ink-700 dark:bg-ink-900/40 flex flex-wrap items-center gap-2 rounded-t-xl border-b bg-paper-100/60 px-3 py-2"
    >
        <Button
            color="alternative"
            size="xs"
            class="gap-2 rounded-full"
            onclick={() => ( pickerOpen = true )}
            disabled={!ready}
        >
            <Link class="h-3.5 w-3.5" />
            {m.markdown_editor_link_button()}
            <Kbd class="pointer-coarse:hidden ml-1 px-1 py-0.5 text-xs font-normal">{platform.apple ? m.markdown_editor_link_shortcut_apple() : m.markdown_editor_link_shortcut()}</Kbd>
        </Button>

        <Button
            color="alternative"
            size="xs"
            class="gap-2 rounded-full"
            onclick={() => ( generatorOpen = true )}
            disabled={!ready}
        >
            <Sparkles class="h-3.5 w-3.5" />
            {m.markdown_editor_generate_button()}
        </Button>

        <p class="text-muted ml-auto hidden text-xs sm:block">{m.markdown_editor_format_hint()}</p>
    </div>

    <div bind:this={host} class="min-h-96 rounded-b-xl"></div>

    {#if !ready}
        <p class="text-muted px-6 py-4 text-sm">{m.markdown_editor_loading()}</p>
    {/if}
</div>

<EntryPicker
    bind:open={pickerOpen}
    onselect={( slug, label ) =>
    {
        void insertPageLink( slug, label );
    }}
/>

<GeneratorDialog
    bind:open={generatorOpen}
    initialKind={generatorKind}
    oninsert={( value ) =>
    {
        void insertText( value );
    }}
/>

<ImageImportDialog bind:this={importer} maxSide={IMAGE_MAX_SIDE.illustration} />
