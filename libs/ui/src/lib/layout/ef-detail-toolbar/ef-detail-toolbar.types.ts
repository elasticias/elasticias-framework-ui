// EfDetailToolbarAction now lives in @elasticias/screens so
// AbstractDetailScreenV2 can return arrays of it from
// `getCustomActions()` without a circular dep on @elasticias/ui.
// Re-exported here so consumers that already import from
// `@elasticias/ui` keep working unchanged.
export type { EfDetailToolbarAction } from '@elasticias/screens';
