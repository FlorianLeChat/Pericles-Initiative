/**
 * Whether this device only reads the wiki.
 *
 * Half of the audience never writes: the players consult the wiki at the table,
 * often on a phone, and every surface opening on «Nouvelle fiche», «Publier une
 * entrée» or a pencil beside each dispatch put a back office between them and
 * the world. A device set to read only hides the controls that create, edit or
 * delete content, and its tools leave out the dashboard, the author's
 * workbench; the backups and `/settings` stay, so the wiki can still be
 * received and the choice taken back from where it was made.
 *
 * It is a preference of the device, not of the wiki: it never enters the
 * overlay, never leaves with an export, and holds no authority. Anyone reaching
 * an editor by its url still edits, since there is no notion of user here.
 *
 * Empty states keep their invitation to write even on a reading device: a wiki
 * with nothing in it is being set up, and hiding the one way forward would leave
 * the page with nothing at all to offer.
 *
 * @author Claude
 */

import { browser } from "$app/env";

/** Key of `localStorage` remembering the choice, absent while the device writes. */
const STORAGE_KEY = "pericles:mode";

/** Stored value marking a device that only reads. */
const READING_VALUE = "lecture";

class ReadingStore
{
    /**
     * True when this device only reads.
     *
     * False while prerendering and until `load` has run, so the static HTML and
     * the first client render agree; the authoring controls leave right after.
     */
    enabled = $state( false );

    /**
     * Reads the stored choice.
     *
     * Called from the root layout once mounted, never during rendering.
     *
     * @author Claude
     */
    load(): void
    {
        if ( !browser )
        {
            return;
        }

        try
        {
            this.enabled = localStorage.getItem( STORAGE_KEY ) === READING_VALUE;
        }
        catch
        {
            this.enabled = false;
        }
    }

    /**
     * Applies a choice at once and remembers it.
     *
     * @param enabled True to only read on this device, false to write again.
     * @author Claude
     */
    set( enabled: boolean ): void
    {
        this.enabled = enabled;

        try
        {
            if ( enabled )
            {
                localStorage.setItem( STORAGE_KEY, READING_VALUE );
            }
            else
            {
                localStorage.removeItem( STORAGE_KEY );
            }
        }
        catch
        {
            /* storage unavailable, the choice holds until the page is left */
        }
    }
}

export const reading = new ReadingStore();
