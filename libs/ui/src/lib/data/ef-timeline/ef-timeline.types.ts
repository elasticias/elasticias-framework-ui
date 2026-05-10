export type EfTimelineState = 'done' | 'now' | 'upcoming';

/**
 * One step in a vertical timeline.
 */
export interface EfTimelineItem {
    /** Stable id for trackBy / template references. */
    id?: string | number;

    labelKey?: string;
    label?: string;

    /** Small grey meta line below the label (e.g. `'Karim · 12 mai 14:30'`). */
    metaKey?: string;
    meta?: string;

    /**
     * Step state — drives the dot styling:
     * - `'done'`     → filled with `--st-delivered-fg`
     * - `'now'`      → filled with `--module` + halo
     * - `'upcoming'` → outlined `--ink-300` (default)
     */
    state?: EfTimelineState;
}
