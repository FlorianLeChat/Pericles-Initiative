/**
 * What the name generator of the editor can invent.
 *
 * Declared here rather than in the dialog because the templates of a page say
 * which kind they want offered first: a character asks for a full name, a place
 * for a city.
 *
 * @author Claude
 */

/** What can be invented, in the order the panel offers it. */
export const GENERATOR_KINDS = [
    "fullName",
    "firstName",
    "lastName",
    "city",
    "country",
    "street",
    "organisation",
    "job",
    "date"
] as const;

/** One kind of invention. */
export type GeneratorKind = ( typeof GENERATOR_KINDS )[ number ];
