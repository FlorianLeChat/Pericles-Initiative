/**
 * Vocabulary suggested when dating a page.
 *
 * Nothing here is imposed, and nothing validates against it: a date carries the
 * intitulé its author typed, and the fiction is free to date a page by «Première
 * crue» or by «Nuit du reflux». The list exists because a page carries no type
 * that could guess what dating it means, so the editor has to offer the usual
 * answers rather than leave an empty field and a placeholder.
 *
 * Ordered by how often a wiki needs them rather than alphabetically, since a
 * `datalist` shows the first matches of what is being typed and, on an empty
 * field, simply the head of the list.
 *
 * @author Claude
 */

import * as m from "#lib/locales/messages.js";
import { locales } from "#lib/locales/runtime.js";

export const DATE_LABELS: readonly string[] = [
    m.dates_birth(),
    m.dates_death(),
    m.dates_foundation(),
    m.dates_dissolution(),
    m.dates_occurrence(),
    m.dates_start(),
    m.dates_end(),
    m.dates_signature(),
    m.dates_entry_into_force(),
    m.dates_repeal(),
    m.dates_discovery(),
    m.dates_commissioning(),
    m.dates_publication()
];

/**
 * Intitulés that mark a birth, in every language of the interface, lowercased.
 *
 * A page is dated in whatever language its author wrote it, so a «Birth» typed
 * under the English interface is as much a birth as a «Naissance».
 */
export const BIRTH_LABELS: readonly string[] = locales.map( ( locale ) => m.dates_birth( {}, { locale } ).toLowerCase() );

/** Intitulés that mark a death, in every language of the interface, lowercased. */
export const DEATH_LABELS: readonly string[] = locales.map( ( locale ) => m.dates_death( {}, { locale } ).toLowerCase() );
