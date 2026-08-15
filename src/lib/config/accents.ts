/**
 * Named accents the wiki can be painted in.
 *
 * The accent is the one colour of the palette the author chooses. It draws the
 * links of an article, the primary button of every page, the monogram of the
 * header and the focus ring, so it is stored with the identity of the wiki, in
 * `meta`, and travels through the export like the rest of it.
 *
 * Only the key lives here: the ramps themselves are declared in `src/app.css`,
 * one `[data-accent]` block per key, so a colour is written once and the dark
 * theme keeps its own retouch through the usual variant. `src/app.html` carries
 * `DEFAULT_ACCENT` on the root element, so a stop is never undefined, not even on
 * the first paint of the prerendered shell.
 *
 * The accent reaches everything the stylesheet draws, and nothing else. The chrome
 * of an installed site, the `theme_color` of the manifest and the favicon, stays
 * the blue it was authored in: both are static files, and no build step may write
 * into `static/`.
 *
 * The vocabulary is deliberately the one of `src/lib/config/palette.ts`, which
 * names the colour of a category. The two lists mean different things, a chip
 * against a whole site, and neither derives from the other, but a reader should
 * not have to learn «cyan» twice. «Pierre» is the one palette colour missing
 * here: an accent carries links and buttons, and a grey one leaves them looking
 * disabled.
 *
 * @author Claude
 */

import * as m from "$lib/locales/messages.js";

export interface Accent {
    key: string;
    label: string;
}

export const ACCENTS: readonly Accent[] = [
    { key: "bleu", label: m.accents_blue() },
    { key: "vert", label: m.accents_green() },
    { key: "ambre", label: m.accents_amber() },
    { key: "violet", label: m.accents_violet() },
    { key: "rose", label: m.accents_pink() },
    { key: "cyan", label: m.accents_cyan() }
];

/** Accent of a wiki that never chose one, and the one `app.html` starts from. */
export const DEFAULT_ACCENT = "bleu";

export const ACCENT_KEYS: readonly string[] = ACCENTS.map( ( accent ) => accent.key );
