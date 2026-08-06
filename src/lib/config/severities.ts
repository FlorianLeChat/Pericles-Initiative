/**
 * Urgency levels of the live feed.
 *
 * @author Claude
 */

import type { LiveSeverity } from "$lib/types";

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
        label: "Information",
        badge: "bg-paper-200 text-ink-600 dark:bg-ink-800 dark:text-paper-300",
        dot: "bg-ink-400",
        weight: 0
    },
    {
        id: "important",
        label: "Important",
        badge: "bg-accent-100 text-accent-700 dark:bg-accent-900/60 dark:text-accent-200",
        dot: "bg-accent-500",
        weight: 1
    },
    {
        id: "urgent",
        label: "Urgent",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",
        dot: "bg-signal-500",
        weight: 2
    },
    {
        id: "breaking",
        label: "Alerte",
        badge: "bg-alert-500 text-white",
        dot: "bg-alert-500",
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
