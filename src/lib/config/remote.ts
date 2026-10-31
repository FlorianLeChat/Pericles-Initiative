/**
 * What the reader is told about the optional backup service.
 *
 * @author Claude
 */

import * as m from "$lib/locales/messages.js";
import type { RemoteFailure } from "$lib/types";

/**
 * Sentence describing each documented failure, for a send or a restore the reader asked for.
 *
 * The transport only reports a machine readable cause, so the sentences live
 * here, shared by the data page and the reminders of the layout. Kept as
 * message functions rather than strings, so each one is rendered in the
 * locale active when it is shown, not the one active when this module loaded.
 *
 * Each one says what happened and what to try, and none of them names a
 * protocol. Whoever set this server up can read the cause off the sentence,
 * and whoever did not is not helped by the word CORS.
 */
export const REMOTE_FAILURE_MESSAGE: Readonly<Record<RemoteFailure, () => string>> = {
    network: m.remote_backup_failure_network,
    refused: m.remote_backup_failure_refused,
    missing: m.remote_backup_failure_missing,
    unsupported: m.remote_backup_failure_unsupported,
    conflict: m.remote_backup_failure_conflict,
    unreadable: m.remote_backup_failure_unreadable,
    server: m.remote_backup_failure_server
};
