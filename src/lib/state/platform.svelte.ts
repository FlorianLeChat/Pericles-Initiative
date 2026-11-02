/**
 * What the reader's device calls its shortcut modifier.
 *
 * Every shortcut of the site answers to Ctrl and to Cmd alike, but the keycap
 * printed beside it has to name the key the reader actually presses: «Ctrl K»
 * on a Mac sends them looking for a key that does nothing there.
 *
 * @author Claude
 */

import { browser } from "$app/env";

/** Apple platforms, whose shortcut modifier is Command. */
const APPLE_PLATFORM = /Mac|iPhone|iPad|iPod/;

class PlatformStore
{
    /**
     * True on a Mac, an iPhone or an iPad.
     *
     * False while prerendering and until `detect` has run, so the static HTML and
     * the first client render agree, and the keycap is corrected right after.
     */
    apple = $state( false );

    /**
     * Reads the platform from the browser.
     *
     * Called from the root layout once mounted, never during rendering.
     *
     * @author Claude
     */
    detect(): void
    {
        if ( !browser )
        {
            return;
        }

        this.apple = APPLE_PLATFORM.test( navigator.userAgent );
    }
}

export const platform = new PlatformStore();
