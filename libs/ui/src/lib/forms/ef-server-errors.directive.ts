import { Directive, input } from '@angular/core';

/**
 * Scopes a map of server/validation errors to its descendant `ef-*` form
 * controls, which auto-link by their `name` — no per-field `[errors]`
 * binding needed.
 *
 * Drop it on any container that wraps the form fields and bind the screen's
 * `serverErrors()` signal once:
 *
 * ```html
 * <div class="detail-grid" [efServerErrors]="serverErrors()">
 *   <ef-input-text name="companyName" ... />   <!-- picks up errors['companyName'] -->
 *   <ef-select     name="clientType"  ... />   <!-- picks up errors['clientType']  -->
 * </div>
 * ```
 *
 * Each control resolves its messages via `AbstractEfFormControl`
 * (`resolvedExternalErrors`): an explicit `[errors]` input still wins when
 * present, otherwise the control falls back to this scope keyed by `name`.
 * Keys must match the control `name` (camelCase) — `AbstractScreenComponent.setServerErrors`
 * already normalizes the backend's PascalCase keys, so the map is camelCase.
 *
 * The input is a signal, so updates propagate to controls under zoneless
 * change detection (controls read it through a `computed`).
 */
@Directive({
  selector: '[efServerErrors]',
  standalone: true,
})
export class EfServerErrorsDirective {
  /** Field-name → messages map (camelCase keys, matching control `name`). */
  readonly errors = input<{ [key: string]: string[] } | null>(null, {
    alias: 'efServerErrors',
  });

  /** Messages for a control by its `name`, or `null` when none. */
  errorsFor(name: string | undefined | null): string[] | null {
    const map = this.errors();
    if (!name || !map) return null;
    return map[name] ?? null;
  }
}

/**
 * Resolves a form control's external (server) errors: the explicit `[errors]`
 * input wins, otherwise fall back to the enclosing `[efServerErrors]` scope
 * keyed by `name`. Shared by `AbstractEfFormControl` and the standalone
 * controls that don't extend it (ef-password, ef-datepicker, …), so the
 * precedence stays identical everywhere.
 *
 * Call from a `computed(() => resolveExternalErrors(this.errors(), this.serverErrorsScope, this.name))`
 * so the read tracks both signal sources under zoneless change detection.
 */
export function resolveExternalErrors(
  explicit: string[] | null | undefined,
  scope: EfServerErrorsDirective | null,
  name: string | undefined | null,
): string[] | null {
  if (explicit && explicit.length) return explicit;
  return scope?.errorsFor(name) ?? null;
}
