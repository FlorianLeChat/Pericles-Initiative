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

/**
 * Colours of the chosen pill: inverted rather than one more grey, so a hover is
 * never mistaken for a choice. It still answers the pointer, a step towards the
 * page, and a border under forced colours, where every fill is dropped, keeps
 * the choice from vanishing into the row.
 */
const PILL_CHOSEN = `bg-ink-800 text-paper-100 hover:bg-ink-700 dark:bg-paper-200 dark:text-ink-900
                     dark:hover:bg-paper-100 forced-colors:border-2`;

/**
 * Colours of a pill the reader may still choose: the rest, hover and pressed
 * steps of a control. Pressed is what a phone shows, having no hover; its text is
 * the secondary colour, which holds four and a half to one on all three.
 */
const PILL_OFFERED = `bg-control text-ink-600 hover:bg-control-hover active:bg-control-pressed dark:text-paper-300
                      forced-colors:border`;

/**
 * Colours of one option of a single choice, chosen or not, apart from its shape.
 *
 * @param chosen True when the option carries the selected value.
 * @returns Classes for the label wrapping the radio.
 * @author Claude
 */
export const choiceColors = ( chosen: boolean ): string => ( chosen ? PILL_CHOSEN : PILL_OFFERED );

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
export const filterPill = ( chosen: boolean ): string => `${ PILL_BASE } ${ choiceColors( chosen ) }`;

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
 * the «Fermer» and «Enregistrer» of the editor, and the two answers of a
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

/**
 * Class giving a Flowbite field its own fill and edge, in both themes.
 *
 * Flowbite paints a field and the hover of a secondary button with the same
 * `gray-700` in the dark theme, and their edges with the same `gray-600`, so
 * the two could never differ: a field took the colour of a button, and a button
 * hovered back into the card. Those stops now follow the button, and every
 * field passes this, which the library merges over its own classes. The field
 * sits inset, at the colour of the page, behind an edge at three to one, and a
 * field marked `aria-invalid` draws that edge in catalogue red: the state is
 * read from the attribute assistive technology already announces, rather than
 * from a colour prop that could drift from it.
 */
export const FIELD = `bg-field dark:bg-field border-field-edge dark:border-field-edge aria-invalid:border-alert-500
                      dark:aria-invalid:border-alert-500`;

/**
 * Class giving every button a pressed state, the one feedback a phone gets.
 *
 * A finger has no hover, so a button that only changed under the pointer gave a
 * phone nothing at all between the tap and its result. Pressing takes the fill
 * one step further along the ladder of `app.css`, darker in the light theme and
 * lighter in the dark one, whatever the colour of the button: a brightness
 * applied over the hover step lands where `control-pressed` sits for a
 * secondary button, and a notch past the hover of a primary or destructive one.
 * `not-disabled` rather than `enabled`, since a button with an `href` is an
 * anchor, which is never `:enabled`.
 */
export const PRESSED = "active:not-disabled:brightness-90 dark:active:not-disabled:brightness-125";

/**
 * Theme handed to Flowbite at the root of the site, appended to every one of its buttons.
 *
 * Flowbite's own route to a class shared by every instance, rather than a
 * stylesheet rule guessing which buttons are its own from their classes.
 */
export const FLOWBITE_THEME = { button: { base: PRESSED } };
