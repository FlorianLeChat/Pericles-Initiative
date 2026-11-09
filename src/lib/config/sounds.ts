/**
 * Materials the interface sounds can be played in.
 *
 * `cuelume` carries the same fourteen cues in each of its themes, at the same
 * levels, so a material changes how the wiki sounds, never what a cue means.
 * The list is written here rather than read from the library, which is only
 * imported once sound is on: the settings page and the stored choice both need
 * it before that.
 *
 * @author Claude
 */

import type { ThemeName } from "cuelume";
import * as m from "#lib/locales/messages.js";

/** One material, with the name a reader picks it by. */
interface SoundTheme
{
    id: ThemeName;
    label: () => string;
}

/** The material a device plays until its reader picks another: glass, wood, air and soft mallets. */
export const DEFAULT_SOUND_THEME: ThemeName = "default";

/** Every material, in the order the settings offer them, the default first. */
export const SOUND_THEMES: readonly SoundTheme[] = [
    { id: "default", label: m.settings_form_sound_theme_default },
    { id: "mech", label: m.settings_form_sound_theme_mech },
    { id: "bubble", label: m.settings_form_sound_theme_bubble },
    { id: "press", label: m.settings_form_sound_theme_press }
];

/**
 * Reads a stored material, tolerating anything a former version or a hand wrote.
 *
 * @param value Stored value, or null when nothing is stored.
 * @returns The material it names, or the default one.
 * @author Claude
 */
export const soundThemeOf = ( value: string | null ): ThemeName =>
    SOUND_THEMES.find( ( theme ) => theme.id === value )?.id ?? DEFAULT_SOUND_THEME;
