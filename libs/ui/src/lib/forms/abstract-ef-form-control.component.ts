import { booleanAttribute, Component, Input, computed, inject, input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { EfServerErrorsDirective, resolveExternalErrors } from './ef-server-errors.directive';

/**
 * Shared base for every Comptoir form control (`ef-input-text`,
 * `ef-textarea`, `ef-select`, `ef-input-number`, `ef-checkbox`, …).
 *
 * Hoists the cross-cutting concerns that every form control wants
 * to handle the same way:
 *
 * - **Identity** — `inputId` / `name` plus an auto-generated id
 *   (`ef-ctrl-<n>`) so the `<label for>` ↔ `<input id>` binding
 *   always works for screen readers + click-to-focus, even when
 *   the consumer didn't pass anything.
 * - **Label / placeholder i18n** — `labelKey` / `label` and
 *   `placeholderKey` / `placeholder` with the same precedence
 *   convention (`*Key` wins, falls back to literal). All ef-*
 *   form controls follow the
 *   [feedback_i18n_keys](memory) convention by surfacing both
 *   inputs.
 * - **ARIA** — `ariaLabelKey` / `ariaLabel` for screen-reader-only
 *   labels; `effectiveAriaLabel` returns `null` when a visible
 *   label is rendered (which already serves as the ARIA name).
 *   `errorsId` provides a stable id for the error/hint container
 *   so subclasses can wire `aria-describedby`.
 * - **State** — `required` / `readonly` / `disabled` shared inputs,
 *   used directly in subclass templates and toggled by CVA's
 *   `setDisabledState` in subclasses.
 *
 * Subclasses still own their own `value` field, ControlValueAccessor
 * implementation, and any control-specific inputs (e.g. textarea's
 * `rows`, select's `options`).
 *
 * ```ts
 * export class EfInputTextComponent extends AbstractEfFormControl
 *     implements ControlValueAccessor {
 *   @Input() type = 'text';
 *   @Input() value = '';
 *   // ... CVA + value-specific logic
 * }
 * ```
 */
@Component({ template: '', standalone: true })
export abstract class AbstractEfFormControl {
    /* ── Identity ─────────────────────────────────────────────── */

    /** Explicit DOM `id` for the inner control. Falls back to
     *  `name`, then to the auto-generated `_autoId`. */
    @Input() inputId?: string;

    /** Form `name` attribute — also used as the id fallback. */
    @Input() name?: string;

    /** Per-instance auto id used when neither `inputId` nor `name`
     *  is supplied. The static counter is shared across all
     *  AbstractEfFormControl subclasses, which is fine — uniqueness
     *  per-page is the only requirement. */
    private static _nextId = 0;
    private readonly _autoId = `ef-ctrl-${++AbstractEfFormControl._nextId}`;

    /* ── Visible label (i18n) ─────────────────────────────────── */

    /** Direct label text. Use `labelKey` for i18n. */
    @Input() label?: string;

    /** Translation key for the label — preferred (memory:
     *  feedback_i18n_keys says always use `*Key`). */
    @Input() labelKey?: string;

    /* ── Placeholder (i18n) ───────────────────────────────────── */

    @Input() placeholder?: string;
    @Input() placeholderKey?: string;

    /* ── Screen-reader-only label (when no visible label) ─────── */

    @Input() ariaLabel?: string;
    @Input() ariaLabelKey?: string;

    /* ── State ────────────────────────────────────────────────── */

    @Input({ transform: booleanAttribute }) required = false;
    @Input({ transform: booleanAttribute }) readonly = false;
    @Input({ transform: booleanAttribute }) disabled = false;

    /* ── Clearable ────────────────────────────────────────────── */

    /**
     * Show the inline clear ✕ (the shared `ef-clear-button`). On by default —
     * every control is clearable; the ✕ only appears when there's a value and
     * the field is editable (see {@link canClear}). Set `[showClear]="false"`
     * to opt a field out.
     */
    @Input({ transform: booleanAttribute }) showClear = true;

    /** Whether the clear ✕ should currently render: opted in, the control
     *  holds a value ({@link hasValue}), and the field is editable. */
    get canClear(): boolean {
        return this.showClear && this.hasValue && !this.disabled && !this.readonly;
    }

    /** Subclasses report whether they currently hold a clearable value.
     *  Default `false` (controls that don't override never show a clear). */
    protected get hasValue(): boolean {
        return false;
    }

    /** Reset the control's value (and notify forms / `valueChangeEvent`).
     *  Overridden by subclasses that support clearing. */
    clearValue(): void {
        /* no-op — overridden by clearable subclasses */
    }

    /**
     * Forms-independent server/validation errors for this field.
     *
     * The signal-based V2 detail screens bind values with `[value]` +
     * `(valueChangeEvent)` and never register an `NgControl`, so the
     * `ngControl`-based `serverError` path can't surface backend
     * validation messages. Two ways to feed them in:
     *
     * - Explicit, per-field: `[errors]="serverErrors()['clientType']"`.
     * - Automatic, by `name`: wrap the fields in `[efServerErrors]="serverErrors()"`
     *   and the control links itself via {@link EfServerErrorsDirective}
     *   (no per-field binding). See {@link resolvedExternalErrors}.
     *
     * Either way the control renders the messages and the invalid state.
     * Falls back to the `NgControl` `serverError` path when neither is
     * present, so `ngModel`-based (v1) screens keep working unchanged.
     */
    readonly errors = input<string[] | null | undefined>(undefined);

    /** Optional enclosing `[efServerErrors]` scope (auto-link by `name`). */
    private readonly serverErrorsScope = inject(EfServerErrorsDirective, { optional: true });

    /**
     * External (server) errors for this control, resolved reactively from
     * either the explicit `[errors]` input (wins) or the enclosing
     * `[efServerErrors]` scope keyed by `name`. A `computed` so reads inside
     * the subclass `serverErrors` / `isInvalid` getters track the source
     * signals under zoneless change detection.
     */
    readonly resolvedExternalErrors = computed<string[] | null>(() =>
        resolveExternalErrors(this.errors(), this.serverErrorsScope, this.name),
    );

    /* ── Internals ────────────────────────────────────────────── */

    protected readonly translateService = inject(TranslateService);

    /** Resolved DOM id. Always non-empty so `<label for>` and
     *  `<input id>` can match unambiguously. */
    get effectiveId(): string {
        return this.inputId || this.name || this._autoId;
    }

    /** Translated placeholder (or empty string). */
    get effectivePlaceholder(): string {
        if (this.placeholderKey) {
            return this.translateService.instant(this.placeholderKey);
        }
        return this.placeholder ?? '';
    }

    /**
     * Resolved `aria-label` value — used when no visible label is
     * rendered. Returns `null` (no attribute) when a visible label
     * IS shown, since the visible label already serves as the
     * accessible name and duplicate `aria-label` would override it.
     */
    get effectiveAriaLabel(): string | null {
        if (this.labelKey || this.label) return null;
        if (this.ariaLabelKey) {
            return this.translateService.instant(this.ariaLabelKey);
        }
        return this.ariaLabel ?? null;
    }

    /** Stable id for the error / hint container — wired through
     *  `aria-describedby` on the input so screen readers announce
     *  the validation message together with the field name. */
    get errorsId(): string {
        return `${this.effectiveId}-errors`;
    }
}
