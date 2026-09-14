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
  /**
   * Control height.
   *
   * - `'small'` — `--hit` (32px). Dense rows, toolbars, row actions. Default,
   *   because that is what every call site in the product already renders.
   * - `'base'` — `--hit-base` (40px). The height a comptoir input, select and
   *   datepicker render at, so this is the one to use for a button sitting in
   *   a form row: at `'small'` it is 8px shorter than the field beside it and
   *   the row reads as misaligned.
   * - `'large'` — retained alias for `'base'`; nothing in the product uses it.
   */
  @Input() size: 'small' | 'base' | 'large' = 'small';

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

  /** Direct tooltip text (not translated). Falls back to `label`
   *  when neither `tooltip` nor `tooltipKey` is set. */
  @Input() tooltip?: string;
  /** Translation key for tooltip — takes priority over `tooltip`.
   *  Falls back to `labelKey` when not provided, so buttons with
   *  visible labels still expose them to screen readers / mobile
   *  long-press once the label is hidden by responsive CSS. */
  @Input() tooltipKey?: string;
  @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

  /**
   * Take focus on load. Bound explicitly rather than left unset: PrimeNG's
   * AutoFocus directive tests `autofocus === false`, and the control declares
   * it with no initialiser, so an unbound instance arrives as `undefined`,
   * misses that check and has a real `autofocus` attribute written onto it.
   * Every such control on a page then becomes an autofocus candidate, and the
   * browser scrolls its container to whichever one it picks on load.
   */
  @Input({ transform: booleanAttribute })
  set autofocus(v: boolean) {
    this._autofocus = v;
    // Rebuilt rather than an inline object literal in the template: a fresh
    // object every change-detection pass would re-set the child's input on
    // every cycle for a value that almost never changes.
    this.pnButtonProps = { autofocus: v };
  }
  get autofocus(): boolean {
    return this._autofocus;
  }
  private _autofocus = false;

  /**
   * PrimeNG's Button resolves its focus flag as
   * `autofocus || buttonProps?.autofocus`. Passing `false` alone is therefore
   * not enough: `false || undefined` is `undefined`, which misses the
   * AutoFocus directive's `=== false` test and writes the attribute anyway.
   * Supplying the flag through `buttonProps` as well makes the expression
   * resolve to a real `false`.
   */
  protected pnButtonProps: { autofocus: boolean } = { autofocus: false };


  /** Resolved tooltip translation key — `tooltipKey` if provided,
   *  otherwise `labelKey`. Lets responsive icon-only buttons reuse
   *  their label as the tooltip without restating it at every call
   *  site. */
  get effectiveTooltipKey(): string | undefined {
    return this.tooltipKey ?? this.labelKey;
  }

  /** Resolved plain tooltip text — `tooltip` if provided, otherwise
   *  `label`. Used only when neither `tooltipKey` nor `labelKey` is
   *  set. */
  get effectiveTooltip(): string | undefined {
    return this.tooltip ?? this.label;
  }

  @Output() clickEvent = new EventEmitter<Event>();

  /**
   * Size as PrimeNG's Button understands it. Its own scale is only
   * `'small' | 'large'`, with the default (unset) being the normal height, so
   * `'base'` maps to `null` rather than being forwarded verbatim.
   */
  get pnSize(): 'small' | 'large' | null {
    return this.size === 'base' ? null : this.size;
  }

  /** Composed class string for the Comptoir variant —
   *  `btn btn-{severity} btn-sm` plus any caller-supplied `styleClass`. */
  get comptoirClass(): string {
    // 'danger' renders as ghost + danger-tint (applied as inline style
    // in the template); other severities map directly.
    const sevClass = this.severity === 'danger' ? 'btn-ghost' : `btn-${this.severity}`;
    // 'base' and 'large' both fall through to the bare `.btn`, which is --hit-base.
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
