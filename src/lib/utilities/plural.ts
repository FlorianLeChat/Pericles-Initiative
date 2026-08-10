/**
 * Agreement of a counted noun.
 *
 * French keeps the singular at zero as well as at one, «0 fiche», which is what
 * a plain `count === 1` test gets wrong: every listing on the site announced «0
 * fiches», and an empty wiki is the ordinary state here rather than an edge case,
 * so that form was on screen more often than any other.
 *
 * Nothing more elaborate is needed. The nouns being counted are all regular, and
 * the two that are not, «élément enregistré» and «entrée enregistrée», carry an
 * adjective that agrees the same way and can simply be passed whole.
 *
 * @author Claude
 */

/**
 * Picks the form of a noun to write after a number.
 *
 * @param count Number the noun follows.
 * @param singular Form used at zero and at one.
 * @param many Form used from two upwards, the singular plus an `s` by default.
 * @returns The form to write.
 * @author Claude
 */
export const plural = ( count: number, singular: string, many?: string ): string =>
    Math.abs( count ) < 2 ? singular : many ?? `${ singular }s`;

/**
 * Writes a number and its noun together, agreed.
 *
 * @param count Number to write.
 * @param singular Form used at zero and at one.
 * @param many Form used from two upwards, the singular plus an `s` by default.
 * @returns The number followed by the right form, such as `3 fiches`.
 * @author Claude
 */
export const counted = ( count: number, singular: string, many?: string ): string =>
    `${ count } ${ plural( count, singular, many ) }`;
