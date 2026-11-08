/**
 * The image block of Crepe, made to keep the alternative text of a figure.
 *
 * Crepe reads the alt of an image standing alone in its paragraph as the
 * ratio its block was resized to, and writes that ratio back in its place:
 * `![Plan des quais](…)` came out of the editor as `![1.00](…)`, and a screen
 * reader then announced «1.00» on the article. This extension gives the block
 * an alt of its own. A bare number is still read as a ratio, so a body Crepe
 * already wrote loads as before; anything else is kept as the alt, and written
 * back as such. Failing an alt, the caption stands in for it, since it is the
 * one description the block lets a writer type. The ratio is no longer written:
 * the article ignores it, and it was the reason the alt got lost.
 *
 * Browser only, and heavy: imported along with Crepe, never on the reading path.
 *
 * @author Claude
 */

import { imageBlockSchema } from "@milkdown/kit/component/image-block";

/** An alt made of a number alone, which is how Crepe wrote the ratio of a resized block. */
const RATIO_ALT = /^\d+(?:\.\d+)?$/;

/**
 * Splits what Markdown calls the alt of an image block into a ratio and a real alt.
 *
 * @param raw Alt read from the Markdown, possibly missing.
 * @returns The ratio of the block and its alternative text.
 * @author Claude
 */
const readAlt = ( raw: unknown ): { ratio: number; alt: string } =>
{
    const text = typeof raw === "string" ? raw.trim() : "";

    if ( !RATIO_ALT.test( text ) )
    {
        return { ratio: 1, alt: text };
    }

    const ratio = Number( text );

    return { ratio: ratio > 0 ? ratio : 1, alt: "" };
};

/** The image block schema of Crepe, with an alt of its own. Used after Crepe's own, which it replaces. */
export const imageBlockWithAlt = imageBlockSchema.extendSchema( ( previous ) => ( ctx ) =>
{
    const base = previous( ctx );

    return {
        ...base,
        attrs: {
            ...base.attrs,
            alt: { default: "", validate: "string" }
        },
        parseDOM: [
            {
                tag: "img[data-type=\"image-block\"]",
                getAttrs: ( dom ) =>
                {
                    const element = dom as HTMLElement;

                    return {
                        src: element.getAttribute( "src" ) ?? "",
                        caption: element.getAttribute( "caption" ) ?? "",
                        ratio: Number( element.getAttribute( "ratio" ) ?? 1 ),
                        alt: element.getAttribute( "alt" ) ?? ""
                    };
                }
            }
        ],
        parseMarkdown: {
            match: ( { type } ) => type === "image-block",
            runner: ( state, node, type ) =>
            {
                const { ratio, alt } = readAlt( node.alt );

                state.addNode( type, {
                    src: node.url as string,
                    caption: ( node.title as string | null ) ?? "",
                    ratio,
                    alt
                } );
            }
        },
        toMarkdown: {
            match: ( node ) => node.type.name === "image-block",
            runner: ( state, node ) =>
            {
                const alt = ( node.attrs.alt as string ) || ( node.attrs.caption as string );

                state.openNode( "paragraph" );
                state.addNode( "image", undefined, undefined, {
                    title: node.attrs.caption as string,
                    url: node.attrs.src as string,
                    alt
                } );
                state.closeNode();
            }
        }
    };
} );
