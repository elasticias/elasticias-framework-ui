import {
  booleanAttribute,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';

/** PrimeNG severity vocabulary (v1's default). */
export type EfButtonPrimeNGSeverity =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'help'
  | 'contrast';

/** Comptoir severity vocabulary — maps to `.btn-{name}` rules in
 *  `@elasticias/ui/styles/patterns`. `'danger'` renders as
 *  `.btn-ghost` with the cancelled-fg tint applied inline. */
export type EfButtonComptoirSeverity = 'primary' | 'tenant' | 'ghost' | 'danger';

export type EfButtonSeverity = EfButtonPrimeNGSeverity | EfButtonComptoirSeverity;

/**
 * Wrapper button for both v1 (PrimeNG-themed) and V2 (Comptoir-themed)
 * surfaces. `[variant]` picks the rendering path:
 *
 * - `'primeng'` (default) — wraps `<p-button>` with PrimeNG severities
 *   (`primary / success / danger / …`). Keeps v1 imports working
 *   unchanged.
 *
 * - `'comptoir'` — renders a native `<button class="btn btn-{severity}
 *   btn-sm">` against the Comptoir `.btn` pattern. Severities are
 *   `'primary' | 'tenant' | 'ghost' | 'danger'`; `'danger'` falls back
 *   to `.btn-ghost` with the `--st-cancelled-fg` tint applied inline,
 *   matching the prototype's Delete-button styling.
 *
 * Both variants honour `labelKey` (i18n preferred), `icon`,
 * `disabled`, `loading`, `pTooltip` (via `tooltipKey`), and emit the
 * same `clickEvent`.
 */
@Component({
  selector: 'ef-button',
  standalone: true,
  templateUrl: './ef-button.component.html',
  imports: [ButtonModule, TooltipModule, TranslateModule],
})
export class EfButtonComponent {
  /** Direct label text (not translated). */
  @Input() label?: string;
  /** Translation key — takes priority over `label`. */
  @Input() labelKey?: string;

  @Input() icon?: string;

  /**
   * Which rendering surface to use. Default `'primeng'` keeps v1
   * consumers unchanged. V2 detail/list screens pass `'comptoir'`
   * to opt into the Comptoir `.btn` styling.
   */
  @Input() variant: 'primeng' | 'comptoir' = 'primeng';

  @Input() severity: EfButtonSeverity = 'primary';
  @Input() size: 'small' | 'large' = 'small';

  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) rounded = false;
  @Input({ transform: booleanAttribute }) outlined = false;
  @Input({ transform: booleanAttribute }) raised = false;
  @Input({ transform: booleanAttribute }) text = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input() styleClass?: string;
  @Input() type: 'button' | 'submit' = 'button';
  @Input() badge?: string;
  @Input() badgeSeverity?:
    | 'success'
    | 'info'
    | 'warn'
    | 'danger'
    | 'help'
    | 'primary'
    | 'secondary'
    | 'contrast';

  /** Direct tooltip text (not translated). */
  @Input() tooltip?: string;
  /** Translation key for tooltip — takes priority over `tooltip`. */
  @Input() tooltipKey?: string;
  @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

  @Output() clickEvent = new EventEmitter<Event>();

  /** Composed class string for the Comptoir variant —
   *  `btn btn-{severity} btn-sm` plus any caller-supplied `styleClass`. */
  get comptoirClass(): string {
    // 'danger' renders as ghost + danger-tint (applied as inline style
    // in the template); other severities map directly.
    const sevClass = this.severity === 'danger' ? 'btn-ghost' : `btn-${this.severity}`;
    const sizeClass = this.size === 'small' ? 'btn-sm' : '';
    return ['btn', sevClass, sizeClass, this.styleClass ?? '']
      .filter(Boolean)
      .join(' ');
  }

  /** Inline danger tint for the `severity="danger"` Comptoir variant. */
  get comptoirInlineColor(): string | null {
    return this.severity === 'danger' ? 'var(--st-cancelled-fg)' : null;
  }

  handleClick(event: Event): void {
    if (this.disabled || this.loading) return;
    this.clickEvent.emit(event);
  }
}
