/**
 * Whether the search palette is open.
 *
 * The palette is mounted once, by the root layout, but more than one place opens
 * it: the header, the Ctrl+K shortcut and the search field of the home page. A
 * single flag held here keeps them from each owning a copy of that state.
 *
 * @author Claude
 */

class SearchStore
{
    /** True while the palette is shown. */
    open = $state( false );
}

export const search = new SearchStore();
