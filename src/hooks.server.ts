import type { Handle } from "@sveltejs/kit/hooks";
import { getTextDirection } from "#lib/locales/runtime.js";
import { paraglideMiddleware } from "#lib/locales/server.js";

const handleParaglide: Handle = ( { event, resolve } ) =>
    paraglideMiddleware( event.request, ( { locale } ) =>
    {
        // `event.request` is read-only: the middleware's request is only a
        // clone with the same URL (no URL strategy), so the original is kept.
        return resolve( event, {
            transformPageChunk: ( { html } ) =>
                html.replace( "%paraglide.lang%", locale ).replace( "%paraglide.dir%", getTextDirection( locale ) )
        } );
    } );

export const handle: Handle = handleParaglide;
