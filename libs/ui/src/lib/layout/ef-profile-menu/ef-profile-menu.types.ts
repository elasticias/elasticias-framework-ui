/**
 * One row in `ef-profile-menu`.
 *
 * Navigation is a `command` like everything else: a host that wants to
 * route passes `command: () => this.router.navigate([...])`, which keeps
 * the lib free of `RouterModule`.
 */
export interface EfProfileMenuItem {
  /** Stable identifier, used for tracking and for expansion state. */
  id: string;

  /** Translation key for the row label. */
  labelKey: string;

  /** PrimeIcons class, e.g. `'pi pi-user'`. */
  icon?: string;

  /** Trailing count pill. `0` renders; `undefined` and `null` do not. */
  badge?: string | number;

  /** `'danger'` tints the row, for log out and other one-way actions. */
  severity?: 'default' | 'danger';

  /** Draw a separating rule above this row. */
  groupStart?: boolean;

  /** Rows shown when this one is expanded. A row with children never
   *  runs its own `command`; choosing it toggles the group. */
  children?: EfProfileMenuItem[];

  /** What choosing the row does. */
  command?: () => void;
}
