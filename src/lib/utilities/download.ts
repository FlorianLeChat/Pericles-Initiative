/**
 * Hands the reader a backup of the wiki as a file.
 *
 * @author Claude
 */

/** Name every backup is downloaded under, the one an import expects to be given back. */
const BACKUP_FILE_NAME = "wiki.json";

/**
 * Downloads an export as `wiki.json`, through a link clicked on the reader's behalf.
 *
 * Browser only: it creates an object url and an anchor, so it is called from an
 * event handler, never while rendering.
 *
 * @param json Export produced by `wiki.exportJson()`.
 * @author Claude
 */
export const downloadBackup = ( json: string ): void =>
{
    const blob = new Blob( [ json ], { type: "application/json" } );
    const url = URL.createObjectURL( blob );
    const link = document.createElement( "a" );

    link.href = url;
    link.download = BACKUP_FILE_NAME;
    link.click();
    URL.revokeObjectURL( url );
};
