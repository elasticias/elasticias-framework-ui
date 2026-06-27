/**
 * Canonical permission verbs (CRUD + capabilities) — the single source of
 * truth on the frontend. Kept name-identical to the backend `Permissions`
 * constants so a value like `Permissions.Create` greps the same on both sides.
 *
 * - `Read`   — view records (queries).
 * - `Create` — create new records.
 * - `Edit`   — modify existing records (update). Distinct from `Create`.
 * - `Delete` — remove records.
 * - `Duplicate` / `Print` / `Export` / `Import` — action capabilities.
 *
 * Permissions are matched as plain strings, so an app may grant custom
 * permission strings beyond this set — the enum is the standard vocabulary,
 * open for extension.
 */
export enum Permissions {
  Read = 'Read',
  Create = 'Create',
  Edit = 'Edit',
  Delete = 'Delete',
  Duplicate = 'Duplicate',
  Print = 'Print',
  Export = 'Export',
  Import = 'Import',
}

/** The standard verbs in their canonical (display/storage) order. */
export const PERMISSIONS: readonly Permissions[] = [
  Permissions.Read,
  Permissions.Create,
  Permissions.Edit,
  Permissions.Delete,
  Permissions.Duplicate,
  Permissions.Print,
  Permissions.Export,
  Permissions.Import,
];
