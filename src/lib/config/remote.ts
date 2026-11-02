/**
 * What the reader is told about the optional backup service.
 *
 * @author Claude
 */

import * as m from "#lib/locales/messages.js";
import type { RemoteFailure, RemoteKind } from "#lib/types.ts";

/**
 * Sentence describing each documented failure, per destination, for a send or a restore the reader asked for.
 *
 * The transport only reports a machine readable cause, so the sentences live
 * here, shared by the data page and the reminders of the layout. Kept as
 * message functions rather than strings, so each one is rendered in the
 * locale active when it is shown, not the one active when this module loaded.
 *
 * Each one says what happened and what to try. The API's never name a
 * protocol: whoever set that API up can read the cause off the sentence, and
 * whoever did not is not helped by the word CORS. A bucket is different, since
 * the reader configures it themselves from the rule the form hands them, so its
 * sentences point at that rule by name.
 */
export const REMOTE_FAILURE_MESSAGE: Readonly<Record<RemoteKind, Readonly<Record<RemoteFailure, () => string>>>> = {
    api: {
        network: m.remote_backup_failure_network,
        refused: m.remote_backup_failure_refused,
        missing: m.remote_backup_failure_missing,
        unsupported: m.remote_backup_failure_unsupported,
        conflict: m.remote_backup_failure_conflict,
        unreadable: m.remote_backup_failure_unreadable,
        server: m.remote_backup_failure_server
    },
    s3: {
        network: m.remote_backup_s3_failure_network,
        refused: m.remote_backup_s3_failure_refused,
        missing: m.remote_backup_s3_failure_missing,
        unsupported: m.remote_backup_s3_failure_unsupported,
        conflict: m.remote_backup_s3_failure_conflict,
        unreadable: m.remote_backup_s3_failure_unreadable,
        server: m.remote_backup_s3_failure_server
    }
};
