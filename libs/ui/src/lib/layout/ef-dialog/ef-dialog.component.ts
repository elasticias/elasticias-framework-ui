import {
  booleanAttribute,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfButtonComponent } from '../ef-button/ef-button.component';

/**
 * Dynamic action descriptor for `ef-dialog`. The dialog renders one
 * `<button class="btn …">` per entry, in array order (left → right);
 * the rightmost entry is the focused / "primary" by convention.
 *
 * When `command` returns a `Promise`, the button auto-toggles
 * `.is-loading` for the duration and the dialog closes when it
 * resolves (unless `dismiss === false`).
 */
export interface EfDialogAction {
  /** Direct label text. Use `labelKey` for i18n. */
  label?: string;
  /** Translation key for the label — takes precedence over `label`. */
  labelKey?: string;
  /** Visual severity (controls the .btn class). Default: `'ghost'`. */
  severity?: 'primary' | 'ghost' | 'tenant' | 'danger';
  /** PrimeNG icon class (e.g. `'pi pi-trash'`). Optional. */
  icon?: string;
  /** Extra class(es) appended to the footer button — for brand-tinted
   *  actions (e.g. `'btn-whatsapp'`) or layout helpers (`'btn-dialog-leading'`)
   *  beyond the four standard severities. */
  styleClass?: string;
  /** Click handler. Return a `Promise` to auto-toggle the loading
   *  spinner overlay on the button until it settles. */
  command?: () => void | Promise<void>;
  /** Close the dialog after the command resolves. Default: `true`. */
  dismiss?: boolean;
  /** Render the button as disabled. */
  disabled?: boolean;
  /** Render the button as loading (in-flight). Mutated automatically
   *  by the dialog when the command returns a Promise. */
  loading?: boolean;
}

export type EfDialogSeverity = 'default' | 'danger' | 'warn' | 'info' | 'success' | 'tenant';
export type EfDialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Comptoir dialog — wraps PrimeNG `p-dialog` and skins it against the
 * `.es-dialog` patterns lifted from the static prototype
 * (`docs/ux-ui/erp/screens/components.html` § Section 05).
 *
 * **Card design with two rules** — the header has a `border-bottom`,
 * the footer has a `border-top` (`1px var(--rule)`). Header layout:
 * optional severity-tinted icon · title + subtitle · close ✕.
 *
 * **Dynamic actions** — pass an `EfDialogAction[]` via `[actions]`
 * and the footer renders one button per entry, in order. The rightmost
 * is conventionally the primary action; consumers control severity
 * per-entry. Async commands flip the button to `.is-loading` until
 * resolved, then auto-dismiss (unless opted out).
 *
 * ```html
 * <ef-dialog
 *   [(visible)]="show"
 *   headerKey="orders.delete_confirm"
 *   subtitleKey="orders.delete_irreversible"
 *   severity="danger"
 *   size="md"
 *   [actions]="[
 *     { labelKey: 'common_cancel', severity: 'ghost' },
 *     { labelKey: 'common_delete', severity: 'danger',
 *       command: () => this.api.deleteOrder(this.id) }
 *   ]"
 * >
 *   <div class="es-dialog__highlight">
 *     <span class="av tenant">L</span>
 *     <div class="body">
 *       <div class="nm">SO-2026-198 · Leila Bennani</div>
 *       <div class="meta">07 mai · 1 132,00 MAD</div>
 *     </div>
 *   </div>
 *   <p>{{ 'orders.delete_warning' | translate }}</p>
 * </ef-dialog>
 * ```
 */
@Component({
  selector: 'ef-dialog',
  standalone: true,
  templateUrl: './ef-dialog.component.html',
  imports: [CommonModule, DialogModule, TranslateModule, EfButtonComponent],
})
export class EfDialogComponent {
  private readonly translate = inject(TranslateService);

  /* ── Identity (existing) ─────────────────────────────────── */

  /** Direct header text (not translated). */
  @Input() header?: string;
  /** Translation key — takes precedence over `header`. */
  @Input() headerKey?: string;

  /** Direct subtitle text. */
  @Input() subtitle?: string;
  /** Translation key — takes precedence over `subtitle`. */
  @Input() subtitleKey?: string;

  /* ── Visibility / behaviour (existing + 1 new) ──────────── */

  @Input({ transform: booleanAttribute }) visible = false;
  @Input({ transform: booleanAttribute }) modal = true;
  @Input({ transform: booleanAttribute }) closable = true;
  @Input({ transform: booleanAttribute }) draggable = false;
  @Input({ transform: booleanAttribute }) resizable = false;
  /** Close the dialog when the user clicks the backdrop mask. */
  @Input({ transform: booleanAttribute }) dismissableMask = false;
  /** Close the dialog on Escape (PrimeNG default = true). */
  @Input({ transform: booleanAttribute }) closeOnEscape = true;

  /* ── Visuals (new) ──────────────────────────────────────── */

  /** Severity drives the header icon tint (panel itself stays neutral).
   *  Pair with `[icon]` to override the default icon-class per severity. */
  @Input() severity: EfDialogSeverity = 'default';
  /** Header icon class (PrimeNG `pi pi-*`). Overrides the severity default. */
  @Input() icon?: string;
  /** Width preset: sm 380 / md 480 (default) / lg 640 / xl 880 / full. */
  @Input() size: EfDialogSize = 'md';

  /* ── Style hooks ────────────────────────────────────────── */

  @Input() style?: { [key: string]: string };
  @Input() styleClass?: string;

  @Input() position:
    | 'center' | 'top' | 'bottom' | 'left' | 'right'
    | 'topleft' | 'topright' | 'bottomleft' | 'bottomright' = 'center';
  @Input() appendTo?: string;

  /**
   * Render variant.
   * - `'comptoir'` (default) — applies the `.es-dialog` Comptoir skin,
   *   custom header (icon + title + subtitle + close), and dynamic-action
   *   footer.
   * - `'primeng'` — bare `p-dialog` with its native header (just the
   *   `[header]` text + PrimeNG's default close). Use for legacy screens
   *   or to dodge the Comptoir skin one-off.
   */
  @Input() variant: 'primeng' | 'comptoir' = 'comptoir';

  /* ── Dynamic actions (new) ──────────────────────────────── */

  /** Footer actions, rendered left → right. When set (non-empty),
   *  takes precedence over `defaultActions`. */
  @Input() actions?: EfDialogAction[];

  /* ── Default actions (existing — preserved verbatim) ───── */

  /**
   * Render a standard cancel + save action footer. Backward-compat
   * shortcut — for richer footers prefer `[actions]`. When false (and
   * no `[actions]` provided), the footer is omitted entirely.
   */
  @Input({ transform: booleanAttribute }) defaultActions = true;
  @Input() saveLabelKey = 'common_save';
  @Input() cancelLabelKey = 'common_cancel';
  @Input() saveLabel?: string;
  @Input() cancelLabel?: string;
  @Input() saveIcon = 'pi pi-check';
  @Input() cancelIcon?: string;
  @Input({ transform: booleanAttribute }) saveDisabled = false;
  @Input() saveStyleClass?: string;
  @Input() cancelStyleClass?: string;
  @Input() saveSeverity: 'primary' | 'tenant' | 'ghost' | 'danger' = 'primary';
  @Input() cancelSeverity: 'primary' | 'tenant' | 'ghost' | 'danger' = 'ghost';

  /* ── Outputs ────────────────────────────────────────────── */

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() showEvent = new EventEmitter<void>();
  @Output() hideEvent = new EventEmitter<void>();
  @Output() saveAction = new EventEmitter<void>();
  @Output() cancelAction = new EventEmitter<void>();
  /** Emits for every action in the dynamic `[actions]` footer. The
   *  payload includes the action object and its index. */
  @Output() actionClick = new EventEmitter<{ action: EfDialogAction; index: number }>();

  /** ViewChild ref to the default-action footer template — used in the
   *  `'primeng'` variant via [footerTemplate] input. */
  @ViewChild('defaultFooter', { static: true }) defaultFooterTpl?: TemplateRef<void>;

  /* ── Derived ────────────────────────────────────────────── */

  /** Severity → default header icon. Override per-instance with `[icon]`. */
  private static readonly SEV_ICONS: Record<EfDialogSeverity, string> = {
    danger:  'pi pi-trash',
    warn:    'pi pi-exclamation-triangle',
    info:    'pi pi-info-circle',
    success: 'pi pi-check',
    tenant:  'pi pi-bookmark-fill',
    default: '',
  };

  get effectiveStyleClass(): string {
    const parts: string[] = [];
    if (this.variant === 'comptoir') {
      parts.push('es-dialog', `es-dialog--${this.size}`);
      if (this.severity !== 'default') parts.push(`es-dialog--${this.severity}`);
    }
    if (this.styleClass) parts.push(this.styleClass);
    return parts.join(' ');
  }

  get effectiveTitle(): string {
    if (this.headerKey) return this.translate.instant(this.headerKey);
    return this.header ?? '';
  }

  get effectiveSubtitle(): string {
    if (this.subtitleKey) return this.translate.instant(this.subtitleKey);
    return this.subtitle ?? '';
  }

  get effectiveIcon(): string | null {
    if (this.icon) return this.icon;
    return EfDialogComponent.SEV_ICONS[this.severity] || null;
  }

  /** True when the dynamic `[actions]` path should render the footer. */
  get useDynamicActions(): boolean {
    return Array.isArray(this.actions) && this.actions.length > 0;
  }

  /** Whether any kind of footer should render at all. */
  get hasFooter(): boolean {
    return this.useDynamicActions || this.defaultActions;
  }

  actionLabel(a: EfDialogAction): string {
    if (a.labelKey) return this.translate.instant(a.labelKey);
    return a.label ?? '';
  }

  actionClass(a: EfDialogAction): string {
    const sev = a.severity ?? 'ghost';
    const variantClass = (
      sev === 'primary' ? 'btn-primary'
      : sev === 'tenant' ? 'btn-tenant'
      : sev === 'danger' ? 'btn-danger'
      : 'btn-ghost'
    );
    return `btn ${variantClass} btn-sm${a.loading ? ' is-loading' : ''}${a.styleClass ? ' ' + a.styleClass : ''}`;
  }

  /* ── Handlers ───────────────────────────────────────────── */

  handleActionClick(a: EfDialogAction, index: number): void {
    if (a.disabled || a.loading) return;
    this.actionClick.emit({ action: a, index });

    let result: unknown;
    try {
      result = a.command?.();
    } catch {
      // Consumer error handling lives in their `command`. Swallow here
      // so a throw doesn't leave the dialog wedged open.
    }

    const isThenable = result && typeof (result as Promise<unknown>).then === 'function';
    if (isThenable) {
      a.loading = true;
      (result as Promise<unknown>).finally(() => {
        a.loading = false;
        if (a.dismiss !== false) this.handleVisibleChange(false);
      });
    } else if (a.dismiss !== false) {
      this.handleVisibleChange(false);
    }
  }

  handleVisibleChange(value: boolean): void {
    this.visible = value;
    this.visibleChange.emit(value);
  }

  handleShow(): void { this.showEvent.emit(); }
  handleHide(): void { this.hideEvent.emit(); }

  /** Default cancel — emits and closes. */
  onDefaultCancel(): void {
    this.cancelAction.emit();
    this.handleVisibleChange(false);
  }

  /** Default save — emits only (consumer closes after success). */
  onDefaultSave(): void {
    if (this.saveDisabled) return;
    this.saveAction.emit();
  }
}
