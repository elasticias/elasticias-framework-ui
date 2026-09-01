import { booleanAttribute, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Comptoir form label — renders a `<label>` with the design-system
 * typography (uppercase Manrope 11px / 700 / `--text-mute`,
 * 0.06em letter-spacing) defined under `.ef-label` in
 * `@elasticias/ui/styles/patterns`.
 *
 * - `[labelKey]` — translation key (preferred). Falls back to
 *   `[label]` when missing. The `feedback_i18n_keys` memory says
 *   always use `*Key` on shared `ef-*` components.
 * - `[for]` — DOM id of the input the label labels. Mapped through
 *   `[attr.for]` so an empty value renders no attribute (the input
 *   doesn't end up with a broken `for=""`).
 * - `[required]` — toggles a red asterisk via
 *   `.ef-label.is-required::after`.
 * - `[styleClass]` — caller-supplied extra class. Defaults to
 *   `'form-label'` for v1 back-compat. The `.ef-label` Comptoir
 *   class is always applied on top.
 */
@Component({
  selector: 'ef-label',
  standalone: true,
  template: `
    <label
      [attr.for]="for || null"
      [class]="resolvedClass"
    >{{ labelKey ? (labelKey | translate) : label }}</label>
  `,
  styles: [`:host { display: contents; }`],
  imports: [TranslateModule],
})
export class EfLabelComponent {
  /** Direct label text — use `labelKey` for i18n. */
  @Input() label?: string;
  /** Translation key — preferred. */
  @Input() labelKey?: string;
  /** DOM id of the labelled input. Empty / unset → no `for` attr. */
  @Input() for?: string;
  /** Caller-supplied extra class. The Comptoir `.ef-label` class is
   *  always applied; this stacks on top. Defaults to `'form-label'`
   *  for v1 back-compat. */
  @Input() styleClass = 'form-label';
  /** Show the required-asterisk modifier. */
  @Input({ transform: booleanAttribute }) required = false;

  /** Composes `'ef-label'` + `styleClass` + the `'is-required'`
   *  modifier into a single class string. Angular's `[class]`
   *  binding replaces (doesn't merge) so we do the joining here. */
  get resolvedClass(): string {
    const parts = ['ef-label'];
    if (this.styleClass) parts.push(this.styleClass);
    if (this.required) parts.push('is-required');
    return parts.join(' ');
  }
}
