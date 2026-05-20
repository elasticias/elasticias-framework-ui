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
import { PermissionsEnum } from '@elasticias/types';
import { EfButtonComponent } from '../ef-button/ef-button.component';
import { EfSearchToolbarAction } from './ef-search-toolbar.types';

/**
 * Page-level toolbar for list / search screens. Mirrors the
 * {@link EfDetailToolbarComponent} concept — two slots and a
 * declarative action API — but ships with the search-screen
 * default actions instead of the detail-screen ones.
 *
 * - default       — page identity (title / meta / status pills).
 * - `[customActions]` input — declarative array of
 *                             EfSearchToolbarAction; rendered at the
 *                             start of the right group, before the
 *                             standard actions.
 * - `[actions]` slot — full-template escape hatch (rendered after
 *                      `[customActions]`, before the separator).
 * - Standard actions — Export, Add (in that order), shown via
 *                      `[showExportAction]` / `[showAddAction]` and
 *                      gated by `[context]`'s permissions.
 *
 * Search / Clear deliberately do **not** live here — those belong
 * to `ef-smart-bar` (its built-in `(search)` / `(clear)` outputs).
 * This toolbar owns the page-level actions, not the filter actions.
 *
 * Layout: `…title (left) | …customActions  [actions]  | export  add`
 *
 * ```html
 * <ef-search-toolbar
 *   [context]="context"
 *   [customActions]="screenActions()"
 *   showExportAction
 *   (export)="exportItems()"
 *   (add)="add()"
 * >
 *   <div class="title-meta">
 *     <h1>{{ 'catalog_products_title' | translate }}</h1>
 *     <p class="meta">{{ totalCount() }} items</p>
 *   </div>
 * </ef-search-toolbar>
 * ```
 *
 * Custom actions can declare `permission` and `visible` like
 * `EfRowAction`. With `[context]` bound, the toolbar filters them
 * against `ScreenContext.isGranted()` automatically.
 */
@Component({
  selector: 'ef-search-toolbar',
  standalone: true,
  imports: [CommonModule, TranslateModule, EfButtonComponent],
  templateUrl: './ef-search-toolbar.component.html',
  host: { class: 'search-toolbar' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfSearchToolbarComponent {
  /* ── Inputs ─────────────────────────────────────────────────── */

  /** Custom screen-specific actions, rendered before the standard
   *  set in the right group. Each one gets the same permission /
   *  visibility filtering used by EfRowAction. */
  readonly customActions = input<ReadonlyArray<EfSearchToolbarAction>>([]);

  /** Optional ScreenContext — when present, custom actions with a
   *  `permission` field and standard actions Export / Add are
   *  filtered against `context.isGranted(...)`. */
  readonly context = input<ScreenContext | undefined>(undefined);

  /** Render the standard Export action (left of the standard group). */
  readonly showExportAction = input(false, { transform: booleanAttribute });

  /** Render the standard Add action (rightmost, tenant-styled). */
  readonly showAddAction = input(true, { transform: booleanAttribute });

  /** Disable Add while a navigation / fetch is in flight. */
  readonly busy = input(false, { transform: booleanAttribute });

  /** i18n key for the Add button label. Screens typically pass
   *  `'common_new'` (default) or a screen-specific
   *  `'catalog_products_new'`. */
  readonly addLabelKey = input<string>('common_new');

  /** i18n key for the Export button label. */
  readonly exportLabelKey = input<string>('common_export');

  /* ── Outputs ────────────────────────────────────────────────── */

  /** Fired when a `customActions` button is clicked. The toast
   *  service or screen handler should consume `id`. The `command`
   *  callback on the action is also invoked. */
  readonly customAction = output<EfSearchToolbarAction>();

  readonly export = output<void>();
  readonly add = output<void>();

  /* ── Computed visibility ────────────────────────────────────── */

  /** Custom actions after permission + `visible` filtering. */
  readonly visibleCustomActions = computed<
    ReadonlyArray<EfSearchToolbarAction>
  >(() => {
    const ctx = this.context();
    return this.customActions().filter((a) => this.isCustomVisible(a, ctx));
  });

  readonly canExport = computed(() =>
    this.checkStandard(this.showExportAction(), PermissionsEnum.Export),
  );
  readonly canAdd = computed(() =>
    this.checkStandard(this.showAddAction(), PermissionsEnum.Write),
  );

  readonly hasStandardActions = computed(
    () => this.canExport() || this.canAdd(),
  );
  readonly hasCustomActions = computed(
    () => this.visibleCustomActions().length > 0,
  );

  /** Whether the `|` separator should render — both groups present. */
  readonly showSeparator = computed(
    () => this.hasCustomActions() && this.hasStandardActions(),
  );

  /* ── Click bridge ───────────────────────────────────────────── */

  onCustomClick(action: EfSearchToolbarAction): void {
    if (action.disabled) return;
    action.command?.();
    this.customAction.emit(action);
  }

  /* ── Internals ──────────────────────────────────────────────── */

  private isCustomVisible(
    action: EfSearchToolbarAction,
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
    perm: PermissionsEnum.Export | PermissionsEnum.Write,
  ): boolean {
    if (!flag) return false;
    const ctx = this.context();
    if (!ctx) return true;
    switch (perm) {
      case PermissionsEnum.Export:
        return ctx.hasExportPermission;
      case PermissionsEnum.Write:
        return ctx.hasWritePermission;
    }
  }

  /** Stable trackBy across renders. */
  trackByAction = (i: number, a: EfSearchToolbarAction): unknown =>
    a.id ?? a.labelKey ?? a.label ?? i;
}
