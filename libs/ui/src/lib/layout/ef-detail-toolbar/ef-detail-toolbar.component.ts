import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ScreenContext } from '@elasticias/screens';
import { Permissions } from '@elasticias/types';
import { EfButtonComponent } from '../ef-button/ef-button.component';
import { EfDetailToolbarAction } from './ef-detail-toolbar.types';

/**
 * Sticky detail-screen toolbar. Two slots and an optional declarative
 * action API:
 *
 * - default       — entity identity (ref / name / status chip / meta).
 * - `[customActions]` input — declarative array of EfDetailToolbarAction;
 *                             rendered at the start of the right group,
 *                             before the standard actions.
 * - `[actions]` slot — full-template escape hatch (rendered after
 *                      `[customActions]`, before the separator).
 * - Standard actions — Print, Duplicate, Delete, Save (in that order),
 *                      shown via `[showPrintAction]` / `[showDuplicateAction]`
 *                      / `[showDeleteAction]` / `[showSaveAction]` and
 *                      gated by `[context]`'s permissions.
 *
 * Layout: `…identity (left) | …customActions  [actions]  | print  duplicate  delete  save…`
 *
 * ```html
 * <ef-detail-toolbar
 *   [customActions]="screenActions()"
 *   [context]="context"
 *   [showPrintAction]="editionState()"
 *   [showDuplicateAction]="editionState()"
 *   [showDeleteAction]="editionState()"
 *   [saving]="loading()"
 *   [saveLabelKey]="editionState() ? 'common_save' : 'common_create'"
 *   (print)="print()"
 *   (duplicate)="duplicate()"
 *   (delete)="delete()"
 *   (save)="save()"
 * >
 *   <span class="ref">{{ ref() }}</span>
 *   <ef-status-chip referenceKey="…" [code]="status()" />
 * </ef-detail-toolbar>
 * ```
 *
 * Custom actions can declare `permission` and `visible` like
 * `EfRowAction`. With `[context]` bound, the toolbar filters them
 * against `ScreenContext.isGranted()` automatically.
 */
@Component({
  selector: 'ef-detail-toolbar',
  standalone: true,
  imports: [CommonModule, TranslateModule, EfButtonComponent],
  templateUrl: './ef-detail-toolbar.component.html',
  host: { class: 'detail-toolbar' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfDetailToolbarComponent {
  /* ── Inputs ─────────────────────────────────────────────────── */

  /** Custom screen-specific actions, rendered before the standard
   *  set in the right group. Each one gets the same permission /
   *  visibility filtering used by EfRowAction. */
  readonly customActions = input<ReadonlyArray<EfDetailToolbarAction>>([]);

  /** Optional ScreenContext — when present, custom actions with a
   *  `permission` field and standard actions Print / Duplicate /
   *  Delete are filtered against `context.isGranted(...)`. */
  readonly context = input<ScreenContext | undefined>(undefined);

  /** Render the standard Print action (left of the standard group). */
  readonly showPrintAction = input(false, { transform: booleanAttribute });

  /** Render the standard Duplicate action. */
  readonly showDuplicateAction = input(false, { transform: booleanAttribute });

  /** Render the standard Delete action (danger-tinted). */
  readonly showDeleteAction = input(false, { transform: booleanAttribute });

  /** Render the standard Save action (rightmost, tenant-styled). */
  readonly showSaveAction = input(true, { transform: booleanAttribute });

  /** Disable Save while a save round-trip is in flight. */
  readonly saving = input(false, { transform: booleanAttribute });

  /** i18n key for the Save button label. Screens typically pass
   *  `'common_create'` in create mode and `'common_save'` in edit. */
  readonly saveLabelKey = input<string>('common_save');

  /* ── Outputs ────────────────────────────────────────────────── */

  /** Fired when a `customActions` button is clicked. The toast
   *  service or screen handler should consume `id`. The `command`
   *  callback on the action is also invoked. */
  readonly customAction = output<EfDetailToolbarAction>();

  readonly print = output<void>();
  readonly duplicate = output<void>();
  readonly delete = output<void>();
  readonly save = output<void>();

  /* ── Computed visibility ────────────────────────────────────── */

  /** Custom actions after permission + `visible` filtering. */
  readonly visibleCustomActions = computed<
    ReadonlyArray<EfDetailToolbarAction>
  >(() => {
    const ctx = this.context();
    return this.customActions().filter((a) => this.isCustomVisible(a, ctx));
  });

  readonly canPrint = computed(() =>
    this.checkStandard(this.showPrintAction(), Permissions.Print),
  );
  readonly canDuplicate = computed(() =>
    this.checkStandard(this.showDuplicateAction(), Permissions.Duplicate),
  );
  readonly canDelete = computed(() =>
    this.checkStandard(this.showDeleteAction(), Permissions.Delete),
  );
  readonly canSave = computed(() => this.showSaveAction());

  readonly hasStandardActions = computed(
    () =>
      this.canPrint() ||
      this.canDuplicate() ||
      this.canDelete() ||
      this.canSave(),
  );
  readonly hasCustomActions = computed(
    () => this.visibleCustomActions().length > 0,
  );

  /** Whether the `|` separator should render — both groups present. */
  readonly showSeparator = computed(
    () => this.hasCustomActions() && this.hasStandardActions(),
  );

  /* ── Click bridge ───────────────────────────────────────────── */

  onCustomClick(action: EfDetailToolbarAction): void {
    if (action.disabled) return;
    action.command?.();
    this.customAction.emit(action);
  }

  /* ── Internals ──────────────────────────────────────────────── */

  private isCustomVisible(
    action: EfDetailToolbarAction,
    ctx: ScreenContext | undefined,
  ): boolean {
    if (action.visible === false) return false;
    if (action.permission && ctx && !ctx.isGranted(action.permission))
      return false;
    return true;
  }

  /** Standard action visibility: `show*Action` flag AND permission
   *  granted by `context` (or no context bound). */
  private checkStandard(
    flag: boolean,
    perm:
      | Permissions.Duplicate
      | Permissions.Print
      | Permissions.Delete,
  ): boolean {
    if (!flag) return false;
    const ctx = this.context();
    if (!ctx) return true;
    switch (perm) {
      case Permissions.Print:
        return ctx.hasPrintPermission;
      case Permissions.Duplicate:
        return ctx.hasDuplicatePermission;
      case Permissions.Delete:
        return ctx.hasDeletePermission;
    }
  }

  /** Stable trackBy across renders. */
  trackByAction = (i: number, a: EfDetailToolbarAction): unknown =>
    a.id ?? a.labelKey ?? a.label ?? i;
}
