// Column types now live in @elasticias/screens so AbstractSearchScreenV2
// can return them from its `add*Column` builders without a circular
// dependency on @elasticias/ui. Re-exported here so consumers that
// already import from `@elasticias/ui` keep working unchanged.
export type {
    EfDataCardColumn,
    EfDataCardColumnType,
    EfDataCardColumnMobileRole,
    EfDataCardColumnAlign,
    EfDataCardSort,
    EfDataCardSortDirection,
    EfReferenceColumnOpts,
} from '@elasticias/screens';
