/**
 * Red links in the editor: a link to a page that does not exist is drawn red
 * while it is being written, as it will be once published.
 *
 * Writing is where a red link is worth seeing, the moment an author can still
 * decide to write the page or point the link elsewhere. The editor drew every
 * link in the same blue, so the invitations only showed up after saving.
 *
 * The marking is a ProseMirror decoration, not an attribute written onto the
 * links: decorations are part of what the editor renders, so its own DOM
 * observer never sees them as edits to undo or to serialise, and the Markdown
 * it writes back stays untouched.
 *
 * Browser only, and heavy: imported along with Crepe, never on the reading path.
 *
 * @author Claude
 */

import { $prose } from "@milkdown/kit/utils";
import type { Node } from "@milkdown/kit/prose/model";
import { internalSlug } from "#lib/utilities/markdown.ts";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { Plugin, PluginKey, type EditorState } from "@milkdown/kit/prose/state";

/**
 * Key of the plugin. A transaction carrying the slugs of the wiki as its meta
 * under this key has the marking computed again against them, for when the
 * pages of the wiki change rather than the text.
 */
export const RED_LINKS = new PluginKey<DecorationSet>( "pericles-red-links" );

/**
 * Marks every stretch of text linked to a page that does not exist.
 *
 * One pass over the document per change. A body is a page of prose, a few
 * hundred nodes at most, so recomputing is cheaper to reason about than
 * mapping the old marking through each step.
 *
 * @param doc Document of the editor.
 * @param known Slugs of the pages that exist.
 * @returns The decorations to draw.
 * @author Claude
 */
const decorate = ( doc: Node, known: ReadonlySet<string> ): DecorationSet =>
{
    const decorations: Decoration[] = [];

    doc.descendants( ( node, position ) =>
    {
        const link = node.isText ? node.marks.find( ( mark ) => mark.type.name === "link" ) : undefined;
        const slug = link ? internalSlug( String( link.attrs.href ) ) : null;
        const missing = slug !== null && !known.has( slug );

        if ( missing )
        {
            decorations.push( Decoration.inline( position, position + node.nodeSize, { class: "wiki-link-missing" } ) );
        }
    } );

    return DecorationSet.create( doc, decorations );
};

/**
 * Builds the Milkdown plugin drawing red links.
 *
 * @param known Reads the slugs of the pages that exist, at the moment of asking.
 * @returns The plugin, to hand to `editor.use`.
 * @author Claude
 */
export const redLinks = ( known: () => ReadonlySet<string> ): ReturnType<typeof $prose> =>
    $prose( () => new Plugin<DecorationSet>( {
        key: RED_LINKS,
        state: {
            init: ( _config, state: EditorState ) => decorate( state.doc, known() ),
            apply: ( transaction, previous ) =>
            {
                const refreshed = transaction.getMeta( RED_LINKS ) as ReadonlySet<string> | undefined;

                if ( refreshed )
                {
                    return decorate( transaction.doc, refreshed );
                }

                return transaction.docChanged ? decorate( transaction.doc, known() ) : previous;
            }
        },
        props: {
            decorations: ( state ) => RED_LINKS.getState( state )
        }
    } ) );
