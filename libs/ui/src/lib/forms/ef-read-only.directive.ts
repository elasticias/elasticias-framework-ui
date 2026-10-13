import { booleanAttribute, Directive, input } from '@angular/core';

/**
 * Scopes a read-only state to every descendant `ef-*` form control.
 *
 * Drop it on the container that wraps a form and bind whether the current
 * user lacks write access; descendant controls fold it into their effective
 * disabled state, so no per-field `[disabled]` binding is needed:
 *
 * ```html
 * <div class="detail-grid" [efReadOnly]="!canWrite()">
 *   <ef-input-text name="companyName" ... />
 *   <ef-select     name="clientType"  ... />
 * </div>
 * ```
 *
 * The input is a signal, so toggling it re-enables the controls under
 * zoneless change detection (controls read it through `isDisabled`).
 */
@Directive({
  selector: '[efReadOnly]',
  standalone: true,
})
export class EfReadOnlyDirective {
  /** When true, every descendant ef-* control renders disabled. */
  readonly readOnly = input(false, { alias: 'efReadOnly', transform: booleanAttribute });
}
