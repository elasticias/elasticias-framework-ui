import { EfDetailToolbarAction } from './detail-toolbar-action.entity';

/**
 * Declarative custom action consumed by `ef-search-toolbar`'s
 * `[customActions]` input AND produced by
 * `AbstractSearchScreenV2.getCustomActions()` (when wired).
 *
 * Shape-identical to {@link EfDetailToolbarAction} — kept as a
 * distinct alias so the search-toolbar can diverge later (e.g.
 * bulk-only actions, selection-aware visibility) without churning
 * every detail-screen call site.
 */
export type EfSearchToolbarAction = EfDetailToolbarAction;
