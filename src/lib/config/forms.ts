/**
 * Shared appearance of the form controls the site styles itself.
 *
 * @author Claude
 */

/**
 * Class stretching a Flowbite `Radio` over the pill that labels it.
 *
 * Every single choice on this site, a status, a severity, a colour, reads as a
 * row of pills rather than as a column of dots, so the radio is invisible and
 * the label carries the appearance. Left where Flowbite puts it,
 * the control would be a sixteen pixel square in the corner of the pill, and only
 * that square would answer a click; stretched, the whole pill does.
 *
 * `opacity-0` rather than `sr-only`, which is what Flowbite's `custom` variant
 * applies: `sr-only` clips the input to nothing, and a clipped element takes no
 * pointer event, so the pill would only ever be reachable through its label.
 */
export const RADIO_OVERLAY = "absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0";

/**
 * Shape of a filter pill, whichever value it carries.
 *
 * It stands a notch taller below `sm`, where the row is what a thumb aims at
 * rather than what a pointer clicks, and where the pills are the one filter that
 * is not a full width menu.
 */
const PILL_BASE = `relative flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium
                   transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
                   has-[:focus-visible]:outline-accent-500 sm:min-h-9`;

/** Colours of the pill whose value the listing is currently narrowed to. */
const PILL_CHOSEN = "bg-ink-800 text-paper-100 dark:bg-paper-200 dark:text-ink-900";

/** Colours of a pill the reader may still choose. */
const PILL_OFFERED = "bg-paper-200 text-ink-600 dark:bg-ink-800 dark:text-paper-300";

/**
 * Appearance of one pill of a filter row, chosen or not.
 *
 * Kept apart from the class it wraps so a filter row gains a new pill, the
 * gravity of a live entry today, without writing the same class out again.
 *
 * @param chosen True when the pill carries the selected value.
 * @returns Classes for the label wrapping the radio.
 * @author Claude
 */
export const filterPill = ( chosen: boolean ): string => `${ PILL_BASE } ${ chosen ? PILL_CHOSEN : PILL_OFFERED }`;

/**
 * Appearance of a pill offering a colour, chosen or not.
 *
 * The colour of a category and the accent of the wiki are the same control on two
 * pages, and neither can mark its selection the way `filterPill` does: the pill
 * wears the colour being offered, so painting the chosen one in ink would hide
 * the very thing the reader is picking. A ring around it says as much without
 * touching the surface.
 *
 * The pill left alone carries no ring class at all, and the chosen one no offset.
 * Neither is a shortcut: `ring-0` is not the absence of a ring but a ring of
 * `calc(0px + var(--tw-ring-offset-width))`, drawn in `currentcolor` for want of a
 * ring colour, and `ring-offset-1` paints a second hairline behind it in the
 * initial value of its own colour, plain white. Together they outlined every pill
 * in its own text colour and left a white gap around the selected one.
 *
 * @param chosen True when the pill carries the selected colour.
 * @returns Classes for the label wrapping the radio, completed by the caller with
 *          the colours of the pill itself.
 * @author Claude
 */
export const colorPill = ( chosen: boolean ): string => ( chosen ? `${ PILL_BASE } ring-accent-500 ring-2` : PILL_BASE );

/**
 * Class laying out the actions of a page or of a panel.
 *
 * A phone gets one action per line, each spanning the full width, and a screen
 * from `sm` up gets the natural row. Left as a plain wrapping row, two buttons
 * on a phone stand side by side at whatever width their French labels happen to
 * need, so the pair reads as one long control and one short one, and the shorter
 * of the two is the smaller target although it is often the primary action.
 *
 * The column direction is what stretches them: `align-items` defaults to
 * `stretch`, so nothing has to be said on the buttons themselves.
 */
export const ACTION_ROW = "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3";

/**
 * Class giving a lone action the width it would have inside an `ACTION_ROW`.
 *
 * For the single button of a panel, which would otherwise be the one control on
 * the site that stops short of the edge on a phone.
 */
export const ACTION_BUTTON = "w-full sm:w-auto";

/**
 * Class splitting two actions evenly over one line on a phone.
 *
 * The exception to `ACTION_ROW`, for the two pairs whose labels are short and
 * whose meaning is the choice between them rather than either one on its own:
 * the «Annuler» and «Enregistrer» of the editor, and the two answers of a
 * confirmation dialog. Stacking those two reads as two unrelated actions, and
 * costs the height of a button in a bar that follows the reader down the page.
 */
export const PAIRED_ACTION = "flex-1 sm:flex-none";

/**
 * Class bringing a small Flowbite `Input` to the height of a small `Select`.
 *
 * The library does not agree with itself on what `size="sm"` means: an input gets
 * `py-1` and a select `py-2.5`, so a field and a menu on the same row of a grid
 * stand twelve pixels apart, the label of one hanging above the middle of the
 * other. The select is the one worth matching, since twenty six pixels is a small
 * target for a thumb and every pill on this site is at least thirty six.
 */
export const SMALL_FIELD = "py-2.5";
