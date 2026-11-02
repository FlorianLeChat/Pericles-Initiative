/**
 * Urgency levels of the live feed.
 *
 * @author Claude
 */

import * as m from "#lib/locales/messages.js";
import type { LiveSeverity } from "#lib/types.ts";

export interface SeverityConfig {
    id: LiveSeverity;
    label: string;
    /** Tailwind classes of the badge, light and dark. */
    badge: string;
    /** Classes of the marker shown on the feed timeline. */
    dot: string;
    /** Higher means more urgent, used for filtering and banners. */
    weight: number;
}

export const SEVERITIES: readonly SeverityConfig[] = [
    {
        id: "info",
        label: m.severities_info(),
        badge: "bg-paper-200 text-ink-600 dark:bg-ink-800 dark:text-paper-300",
        dot: "bg-ink-400",
        weight: 0
    },
    {
        id: "important",
        label: m.severities_important(),
        badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
        dot: "bg-blue-600",
        weight: 1
    },
    {
        id: "urgent",
        label: m.severities_urgent(),
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",
        dot: "bg-signal-500",
        weight: 2
    },
    {
        id: "breaking",
        label: m.severities_breaking(),
        badge: "bg-alert-600 text-white",
        dot: "bg-alert-600",
        weight: 3
    }
];

const FALLBACK: SeverityConfig = SEVERITIES[ 0 ];

export const SEVERITY_IDS: readonly LiveSeverity[] = SEVERITIES.map( ( severity ) => severity.id );

/**
 * Resolves the presentation config of a severity.
 *
 * @param id Severity identifier, possibly unknown.
 * @returns The matching config, or the least urgent one.
 * @author Claude
 */
export const severityConfig = ( id: string ): SeverityConfig =>
    SEVERITIES.find( ( candidate ) => candidate.id === id ) ?? FALLBACK;
