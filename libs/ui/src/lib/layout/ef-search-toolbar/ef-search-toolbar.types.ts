// EfSearchToolbarAction lives in @elasticias/screens so
// AbstractSearchScreenV2 can return arrays of it from a future
// `getCustomActions()` without a circular dep on @elasticias/ui.
// Re-exported here so consumers that already import from
// `@elasticias/ui` keep working unchanged.
export type { EfSearchToolbarAction } from '@elasticias/screens';
