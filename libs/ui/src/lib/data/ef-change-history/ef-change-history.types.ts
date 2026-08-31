/**
 * Presentational shapes for {@link EfChangeHistoryComponent}. Structurally
 * compatible with the backend `ChangeHistoryEntryDto` / `FieldChangeDto` that
 * the NSwag client returns, so a screen can pass them straight through without
 * mapping. Kept lib-local so `@elasticias/ui` stays decoupled from any app's
 * generated API client.
 */
export interface EfChangeHistoryFieldChange {
    field?: string;
    oldValue?: string | null;
    newValue?: string | null;
}

// Fields are optional to stay structurally assignable from the NSwag-generated
// `ChangeHistoryEntryDto` (whose properties are all optional). The component
// guards for missing values.
export interface EfChangeHistoryEntry {
    /** Standardized operation code: created | updated | status_changed | deleted | note. */
    operation?: string;
    occurredAt?: string | Date | null;
    userId?: string | null;
    userName?: string | null;
    changes?: EfChangeHistoryFieldChange[] | null;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
}
