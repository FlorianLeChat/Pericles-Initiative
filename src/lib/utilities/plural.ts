import { getLocale } from "$lib/locales/runtime";

/**
 * Picks between the `one` and `other` form of a counted noun, for whichever locale is
 * current.
 *
 * English and French disagree on which count takes the singular form: French keeps it
 * at zero as well as at one, «0 fiche», where English already reads "0 entries". The
 * message catalogue plugin backing `locales/en.json` and `locales/fr.json` does not parse
 * ICU pluralization itself, so each counted noun is written as two Paraglide messages,
 * `..._one` and `..._other`, and this function chooses between them through
 * `Intl.PluralRules`, which encodes exactly that per locale CLDR rule.
 *
 * @param count Number the noun follows.
 * @param forms The `one` and `other` Paraglide message functions to choose between,
 * both taking `{ count: number }`, e.g. `{ one: m.dashboard_stat_entries_one, other:
 * m.dashboard_stat_entries_other }`.
 * @returns The chosen message, called with `count`.
 * @author Claude
 */
export const pluralize = (
    count: number,
    forms: { one: ( inputs: { count: number } ) => string; other: ( inputs: { count: number } ) => string }
): string => ( new Intl.PluralRules( getLocale() ).select( count ) === "one" ? forms.one : forms.other )( { count } );
