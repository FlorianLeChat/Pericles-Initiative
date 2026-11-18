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
     * A link to a page that does not exist is drawn as a red link while it is
     * written (`red-links.ts`), and drawn again when a page appears or goes
     * elsewhere in the wiki, so the invitations show where they can be acted on.
     *
     * A pair of pills switches the body between the formatted view and its raw
     * Markdown, written in a plain textarea for what Crepe cannot author or would
     * rewrite. Crepe stays mounted, hidden, while the raw text is shown, and is
     * handed the text back on the way out only when it changed, since Crepe
     * settles any Markdown its own way and would otherwise report a body nobody
     * touched as edited. The link picker and the name generator write at the caret
     * of whichever view is shown.
     *
     * @author Claude
     */
    import "@milkdown/crepe/theme/common/style.css";
    import { onMount } from "svelte";
    import Link from "@lucide/svelte/icons/link";
    import Kbd from "flowbite-svelte/Kbd.svelte";
    import * as m from "#lib/locales/messages.js";
    import EntryPicker from "./EntryPicker.svelte";
    import { wiki } from "#lib/state/wiki.svelte.ts";
    import Button from "flowbite-svelte/Button.svelte";
    import Sparkles from "@lucide/svelte/icons/sparkles";
    import GeneratorDialog from "./GeneratorDialog.svelte";
    import { IMAGE_MAX_SIDE } from "#lib/config/images.ts";
    import { platform } from "#lib/state/platform.svelte.ts";
    import ImageImportDialog from "./ImageImportDialog.svelte";
    import type { PluginKey } from "@milkdown/kit/prose/state";
    import type { Crepe as CrepeEditor } from "@milkdown/crepe";
    import type { GeneratorKind } from "#lib/config/generator.ts";
    import { filterPill, TOUCH_HEIGHT } from "#lib/config/forms.ts";
    import { dataUrlBlob, pastedImage } from "#lib/utilities/image.ts";

    interface Props {
        /** Initial Markdown. */
        value: string;
        /** Called with the full Markdown on every change. */
        onchange: ( markdown: string ) => void;
        /**
         * Called once the editor is created, with the Markdown it would write for
         * the document it was given. That is rarely `value` itself: Crepe writes
         * a list with `*` and settles the blank lines its own way, so a body
         * that nobody touched would otherwise compare as changed.
         */
        onready?: ( markdown: string ) => void;
        placeholder?: string;
        /** Accessible name of the editing area. */
        label?: string;
        /** Kind of name the generator offers first. */
        generatorKind?: GeneratorKind;
    }

    let {
        value,
        onchange,
        onready,
        placeholder = m.markdown_editor_placeholder(),
        label = m.markdown_editor_label(),
        generatorKind = "fullName"
    }: Props = $props();

    /** Gap kept between the block menu and whatever bounds it, in pixels. */
    const MENU_MARGIN = 8;

    /** Distance between the caret and the block menu, Crepe's own. */
    const MENU_OFFSET = 10;

    /** Height the list of the block menu never exceeds, Crepe's own, nor shrinks under. */
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
    let redLinksKey: PluginKey | null = null;
    let ready = $state( false );
    let pickerOpen = $state( false );
    let generatorOpen = $state( false );
    let rawField: HTMLTextAreaElement | undefined = $state();
    let raw = $state<string | null>( null );
    let rawOrigin = "";

    /** True while the body is shown as raw Markdown rather than formatted. */
    const showingRaw = $derived( raw !== null );

    onMount( () =>
    {
        let disposed = false;

        const boot = async (): Promise<void> =>
        {
            const [ { Crepe }, { flip, offset, size }, { imageBlockWithAlt }, links ] = await Promise.all( [
                import( "@milkdown/crepe" ),
                import( "@floating-ui/dom" ),
                import( "#lib/utilities/image-block.ts" ),
                import( "#lib/utilities/red-links.ts" )
            ] );

            redLinksKey = links.RED_LINKS;

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

            instance.editor.use( imageBlockWithAlt ).use( links.redLinks( () => wiki.slugs ) );

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

            onready?.( instance.getMarkdown() );

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

    $effect( () =>
    {
        const known = wiki.slugs;
        const key = redLinksKey;

        if ( !ready || !crepe || !key )
        {
            return;
        }

        void redrawRedLinks( crepe, key, known );
    } );

    /**
     * Draws the red links again against the pages of the wiki, for when a page is
     * created or removed while this one is being written, rather than waiting for
     * the next keystroke.
     *
     * @param editor Editor to redraw.
     * @param key Key of the red link plugin.
     * @param known Slugs of the pages that exist now.
     * @returns Resolves once the transaction is dispatched.
     * @author Claude
     */
    const redrawRedLinks = async ( editor: CrepeEditor, key: PluginKey, known: ReadonlySet<string> ): Promise<void> =>
    {
        const { editorViewCtx } = await import( "@milkdown/kit/core" );

        editor.editor.action( ( ctx ) =>
        {
            const view = ctx.get( editorViewCtx );

            view.dispatch( view.state.tr.setMeta( key, known ) );
        } );
    };

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
        if ( rawField && showingRaw )
        {
            const { selectionStart, selectionEnd, value: text } = rawField;
            const selected = text.slice( selectionStart, selectionEnd );
            const linkText = selected === "" ? label : selected;

            writeRaw( `[${ linkText }](/entries/${ slug })` );
            return;
        }

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
        if ( showingRaw )
        {
            writeRaw( value );
            return;
        }

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
     * Shows the body as raw Markdown, taken from the editor as it would be stored.
     *
     * @author Claude
     */
    const showRaw = (): void =>
    {
        if ( !crepe || showingRaw )
        {
            return;
        }

        rawOrigin = crepe.getMarkdown();
        raw = rawOrigin;
    };

    /**
     * Shows the body formatted again, handing the raw text back to the editor when
     * it was changed.
     *
     * @author Claude
     */
    const showRich = async (): Promise<void> =>
    {
        if ( !crepe || raw === null )
        {
            return;
        }

        const written = raw;

        raw = null;

        if ( written === rawOrigin )
        {
            return;
        }

        const { replaceAll } = await import( "@milkdown/kit/utils" );

        crepe.editor.action( replaceAll( written ) );
    };

    /**
     * Writes text at the caret of the raw view, replacing the selection, and
     * reports the new body.
     *
     * @param text Text to write.
     * @author Claude
     */
    const writeRaw = ( text: string ): void =>
    {
        if ( !rawField )
        {
            return;
        }

        rawField.setRangeText( text, rawField.selectionStart, rawField.selectionEnd, "end" );
        rawField.focus();
        onRawInput();
    };

    /**
     * Reports the raw text as the body on every keystroke of the raw view.
     *
     * @author Claude
     */
    const onRawInput = (): void =>
    {
        if ( !rawField )
        {
            return;
        }

        raw = rawField.value;
        onchange( raw );
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
            class="gap-2 rounded-full {TOUCH_HEIGHT}"
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
            class="gap-2 rounded-full {TOUCH_HEIGHT}"
            onclick={() => ( generatorOpen = true )}
            disabled={!ready}
        >
            <Sparkles class="h-3.5 w-3.5" />
            {m.markdown_editor_generate_button()}
        </Button>

        <div class="ml-auto flex items-center gap-3">
            <p class="text-muted hidden text-xs sm:block">
                {showingRaw ? m.markdown_editor_raw_hint() : m.markdown_editor_format_hint()}
            </p>

            <div class="flex gap-1" role="group" aria-label={m.markdown_editor_view_legend()}>
                <button
                    type="button"
                    class={filterPill( !showingRaw )}
                    aria-pressed={!showingRaw}
                    disabled={!ready}
                    data-cuelume-select
                    onclick={() =>
                    {
                        void showRich();
                    }}
                >
                    {m.markdown_editor_view_rich()}
                </button>

                <button
                    type="button"
                    class="{filterPill( showingRaw )} font-mono"
                    aria-pressed={showingRaw}
                    disabled={!ready}
                    data-cuelume-select
                    onclick={showRaw}
                >
                    {m.markdown_editor_view_raw()}
                </button>
            </div>
        </div>
    </div>

    <div bind:this={host} class="min-h-96 rounded-b-xl" class:hidden={showingRaw}></div>

    {#if raw !== null}
        <textarea
            bind:this={rawField}
            class="text-ink-800 dark:text-paper-200 field-sizing-content block min-h-96 w-full resize-y rounded-b-xl
                   border-0 bg-transparent px-4 pt-4 pb-12 font-mono text-sm leading-relaxed focus:ring-0
                   focus:outline-2 focus:-outline-offset-2 focus:outline-accent-500 sm:pt-5 sm:pr-8 sm:pl-14"
            value={raw}
            oninput={onRawInput}
            aria-label={m.markdown_editor_raw_label()}
        ></textarea>
    {/if}

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
