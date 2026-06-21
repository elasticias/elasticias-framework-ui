import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

/**
 * The shared inline "clear" affordance — a circular button with the canonical
 * stroke-✕ glyph. One component so every clearable control (ef-input-text,
 * ef-inputnumber, ef-select via its `#clearicon` template, ef-product-typeahead,
 * …) shows the exact same clear icon, hover circle, and hit area.
 *
 * Styling lives in `_patterns.scss` under `.ef-clear` (global, so the same
 * glyph is reachable from PrimeNG templates that can't import this component).
 *
 * `mousedown` is prevented so clicking the clear doesn't blur/commit the field
 * before the `clear` handler runs.
 */
@Component({
  selector: 'ef-clear-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="ef-clear"
      [attr.aria-label]="ariaLabel"
      [disabled]="disabled"
      (mousedown)="$event.preventDefault()"
      (click)="clear.emit($event)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  `,
})
export class EfClearButtonComponent {
  @Input() ariaLabel = 'Clear';
  @Input() disabled = false;
  @Output() clear = new EventEmitter<Event>();
}
