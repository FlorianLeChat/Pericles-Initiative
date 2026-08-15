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

export const DATE_LABELS: readonly string[] = [
    "Naissance",
    "Décès",
    "Fondation",
    "Dissolution",
    "Survenue",
    "Début",
    "Fin",
    "Signature",
    "Entrée en vigueur",
    "Abrogation",
    "Découverte",
    "Mise en service",
    "Publication"
];
