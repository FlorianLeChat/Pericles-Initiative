/**
 * The hierarchy of the categories, read out of their `parent` field.
 *
 * Nothing guarantees that field points somewhere sensible: a parent may have been
 * deleted or renamed since, and an imported file may describe a loop. Every
 * helper here therefore degrades rather than throws: a category whose parent is
 * missing, or whose chain of parents comes back to itself, stands at the top of
 * the tree, so it is always listed somewhere.
 *
 * @author Claude
 */

import { pluralize } from "./plural";
import * as m from "#lib/locales/messages.js";
import type { Category, Entry } from "#lib/types.ts";

/**
 * Lists the ancestors of a category, the closest last.
 *
 * @param slug Slug of the category whose ancestors are wanted.
 * @param bySlug Every category, keyed by slug.
 * @returns The chain of existing parents from the root down, empty for a root or a category caught in a loop.
 * @author Claude
 */
export const categoryAncestors = ( slug: string, bySlug: Map<string, Category> ): Category[] =>
{
    const chain: Category[] = [];
    const seen = new Set( [ slug ] );
    let parentSlug = bySlug.get( slug )?.parent ?? null;

    while ( parentSlug !== null )
    {
        const parent = bySlug.get( parentSlug );
        const loops = seen.has( parentSlug );

        if ( !parent || loops )
        {
            // A loop leaves no root to hang the chain from, so the category is read as one.
            return loops ? [] : chain.reverse();
        }

        seen.add( parentSlug );
        chain.push( parent );
        parentSlug = parent.parent;
    }

    return chain.reverse();
};

/**
 * Groups the categories under the parent they actually hang from.
 *
 * @param categories Every category, in the order they should be listed.
 * @returns The children of each category by slug, and the top level under `null`.
 * @author Claude
 */
export const categoryChildren = ( categories: Category[] ): Map<string | null, Category[]> =>
{
    const bySlug = new Map( categories.map( ( category ) => [ category.slug, category ] ) );
    const children = new Map<string | null, Category[]>();

    for ( const category of categories )
    {
        const ancestors = categoryAncestors( category.slug, bySlug );
        const parent = ancestors.at( -1 )?.slug ?? null;
        const siblings = children.get( parent ) ?? [];

        siblings.push( category );
        children.set( parent, siblings );
    }

    return children;
};

/**
 * Collects every category standing beneath a given one, at any depth.
 *
 * @param slug Slug of the category at the top.
 * @param children The tree, as `categoryChildren` returns it.
 * @returns The slugs of its descendants, without its own.
 * @author Claude
 */
export const categoryDescendants = ( slug: string, children: Map<string | null, Category[]> ): Set<string> =>
{
    const found = new Set<string>();
    const pending = [ slug ];

    while ( pending.length > 0 )
    {
        const current = pending.pop() ?? "";

        for ( const child of children.get( current ) ?? [] )
        {
            if ( !found.has( child.slug ) )
            {
                found.add( child.slug );
                pending.push( child.slug );
            }
        }
    }

    return found;
};

/**
 * Spells out how many pages a category holds, naming the drafts among them.
 *
 * Reader pages, the home and `/categories`, count published pages only and call
 * `pluralize` directly. Wherever drafts are counted as well, the management page
 * and a category's own page, which lists its drafts, the count goes through
 * here, so a figure that holds drafts always says how many. The dashboard bars
 * say it under each bar instead, since their figure stands alone.
 *
 * @param entries Every page counted, drafts included.
 * @returns «4 fiches», or «4 fiches, dont 1 en brouillon» when drafts are counted.
 * @author Claude
 */
export const pageCountWithDrafts = ( entries: readonly Entry[] ): string =>
{
    const drafts = entries.filter( ( entry ) => entry.status !== "publie" ).length;
    const pages = pluralize( entries.length, { one: m.common_count_fiche_one, other: m.common_count_fiche_other } );

    return drafts > 0 ? m.common_count_with_drafts( { pages, count: drafts } ) : pages;
};
