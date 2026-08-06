import type { LayoutLoad } from "./$types";

/**
 * Every page is prerendered as static HTML. Routes that cannot be, such as the
 * editor, opt out individually.
 */
export const prerender = true;

/**
 * Loads the published dataset.
 *
 * The file is fetched rather than imported so that it can be replaced on the
 * server without rebuilding the site, or served by something else entirely
 * behind the same path.
 *
 * @returns The parsed content of `static/data/wiki.json`, or null when unreachable.
 * @author Claude
 */
export const load: LayoutLoad = async ( { fetch } ) =>
{
    const response = await fetch( "/data/wiki.json" );

    if ( !response.ok )
    {
        return { dataset: null as unknown };
    }

    return { dataset: ( await response.json() ) as unknown };
};
