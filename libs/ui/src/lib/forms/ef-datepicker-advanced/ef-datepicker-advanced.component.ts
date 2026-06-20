import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    ElementRef,
    EmbeddedViewRef,
    HostListener,
    LOCALE_ID,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    booleanAttribute,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, formatDate } from '@angular/common';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfServerErrorsDirective, resolveExternalErrors } from '../ef-server-errors.directive';
import {
    EfDatePreset,
    EfDatePresetKey,
    EfDateRange,
} from './ef-datepicker-advanced.types';

/** Value shape emitted / accepted by the field-mode ControlValueAccessor.
 *  Mirrors PrimeNG's `p-datepicker`: a lone `Date` for single selection,
 *  a `[start, end]` tuple for a range — so `ef-datepicker-advanced` is a
 *  drop-in replacement for the legacy `ef-datepicker` in forms. */
export type EfDateFieldValue = Date | [Date, Date] | null;

/**
 * Comptoir period selector for smart-bars — a pill trigger ("Date — 30
 * derniers jours v") that opens a popover with a preset list and an
 * optional custom-range view (full month calendar with range band).
 *
 * Replaces the legacy `ef-preset-pill` for date filters and the
 * date-range mini-popover that screens used to roll inline.
 *
 * ```html
 * <ef-datepicker-advanced
 *   [activePreset]="dateFilter().presetKey"
 *   [start]="dateFilter().start"
 *   [end]="dateFilter().end"
 *   triggerLabelKey="filter_date"
 *   (rangeChange)="onDateChange($event)"
 * />
 * ```
 *
 * Built-in presets (computed from `today` at open time):
 * `today`, `this_week`, `this_month`, `last_30_days`, `last_90_days`,
 * `this_quarter`, `this_year`. Override with `[presets]="customList"`
 * if you need a different set.
 */
@Component({
    selector: 'ef-datepicker-advanced',
    standalone: true,
    imports: [CommonModule, TranslateModule, EfLabelComponent],
    templateUrl: './ef-datepicker-advanced.component.html',
    styleUrl: './ef-datepicker-advanced.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '[class.dp-host--field]': "mode() === 'field'" },
})
export class EfDatepickerAdvancedComponent implements ControlValueAccessor, AfterViewInit {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly locale = inject(LOCALE_ID);
    private readonly vcr = inject(ViewContainerRef);
    private readonly destroyRef = inject(DestroyRef);
    private readonly cdr = inject(ChangeDetectorRef);

    /**
     * Self-injected form control (present only when the consumer binds
     * `[(ngModel)]` / `formControlName` in field mode). We register as its
     * `valueAccessor` manually — same pattern as `ef-datepicker` — so no
     * `NG_VALUE_ACCESSOR` provider is needed and there's no circular DI.
     * `null` in filter mode (the output-only smart-bar usage).
     */
    readonly ngControl = inject(NgControl, { self: true, optional: true });

    /** Always-present wrapper — the anchor for portal positioning (the
     *  trigger itself lives behind an `@if`, so we anchor to the host box). */
    @ViewChild('anchorEl', { static: true })
    private anchorEl!: ElementRef<HTMLElement>;

    /** Panel template — instantiated and attached to <body> on open. */
    @ViewChild('panelTpl', { static: true })
    private panelTpl!: TemplateRef<unknown>;

    /** Active embedded view + its root node, while the panel is open. */
    private panelView: EmbeddedViewRef<unknown> | null = null;
    private panelRoot: HTMLElement | null = null;
    private resizeHandler: (() => void) | null = null;

    constructor() {
        // Register as our own NgControl's value accessor (field mode only).
        if (this.ngControl) this.ngControl.valueAccessor = this;

        // React to `open` toggling: attach / detach the body-portaled panel.
        effect(() => {
            if (this.open()) this.attachPortal();
            else this.detachPortal();
        });

        // Last-line cleanup if the host is destroyed while the panel is open
        // (route change, *ngIf collapse, …) — orphan DOM is the worst.
        this.destroyRef.onDestroy(() => this.detachPortal());
    }

    ngAfterViewInit(): void {
        // Field-mode validation display (`showRequired` / `isInvalid` /
        // `serverErrors`) reads NgControl state through plain getters. We're
        // OnPush + signal-driven, so a parent flipping touched/validity —
        // notably `form.markAllAsTouched()` on submit, which emits no value or
        // status change — wouldn't re-render this component and the error /
        // red border would go stale. Mirror the control's events (Angular 18+
        // `AbstractControl.events`: value, status, touched, pristine) into
        // change detection. No-op in filter mode (no NgControl).
        this.ngControl?.control?.events
            ?.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.cdr.markForCheck());
    }

    /* ── Inputs ─────────────────────────────────────────────────── */

    /** Trigger left-side label (translation key). Default: `'filter_date'`. */
    readonly triggerLabelKey = input<string>('filter_date');
    /** Direct label fallback when `triggerLabelKey` is empty. */
    readonly triggerLabel = input<string>('');

    /**
     * Override the default preset list. The component ships sensible
     * defaults for `today`, `this_week`, `this_month`, `last_30_days`,
     * `last_90_days`, `this_quarter`, `this_year` — pass anything to
     * replace them outright (e.g. include a `last_year` preset).
     */
    readonly presets = input<ReadonlyArray<EfDatePreset> | undefined>(undefined);

    /** Currently active preset key (controlled). */
    readonly activePreset = input<EfDatePresetKey | undefined>(undefined);

    /** Currently selected start (controlled — pairs with `activePreset`). */
    readonly start = input<Date | null | undefined>(undefined);
    /** Currently selected end. */
    readonly end = input<Date | null | undefined>(undefined);

    /** Disable the trigger. */
    readonly disabled = input(false, { transform: booleanAttribute });

    /** Show a `'Personnalisé…'` row that opens the calendar view. */
    readonly allowCustomRange = input(true, { transform: booleanAttribute });

    /* ── Field mode (form control) ──────────────────────────────────
       `'filter'` (default) is the existing smart-bar period selector:
       preset list + custom range, output-only via `rangeChange`.
       `'field'` turns the component into a Comptoir-styled form control
       (ControlValueAccessor) that replaces the legacy `ef-datepicker`:
       no presets, opens straight to the calendar, and binds with
       `[(ngModel)]` / `formControlName`. */

    /** Component behaviour: smart-bar filter vs. form field. */
    readonly mode = input<'filter' | 'field'>('filter');

    /** Field mode only — pick a single date or a `[start, end]` range. */
    readonly selectionMode = input<'single' | 'range'>('range');

    /** Field mode trigger appearance: a labelled field box (default) or
     *  the rounded pill used by filter mode. */
    readonly variant = input<'field' | 'pill'>('field');

    /**
     * Field mode only — also pick a time (24h `HH:mm`, free minutes).
     * Single: the calendar no longer commits on day-click; a time field +
     * Apply appear. Range: an `HH:mm` field sits under each of Du / Au.
     * The committed value is a `Date` with hours/minutes set (not
     * start-of-day) and the trigger renders `DD/MM/YYYY HH:mm`.
     */
    readonly showTime = input(false, { transform: booleanAttribute });

    /** Field-mode visible label (i18n key preferred). */
    readonly label = input<string>('');
    readonly labelKey = input<string>('');

    /** Field-mode placeholder shown when no value is selected. */
    readonly placeholder = input<string>('');
    readonly placeholderKey = input<string>('');

    /** Screen-reader-only label when no visible label is rendered. */
    readonly ariaLabel = input<string>('');
    readonly ariaLabelKey = input<string>('');

    /** Marks the field required (drives the `*` + required validation copy). */
    readonly required = input(false, { transform: booleanAttribute });

    /** Explicit DOM id / name for the field control (label association). */
    readonly inputId = input<string>('');
    readonly name = input<string>('');

    /** External (server) errors — explicit `[errors]` input or the enclosing
     *  `[efServerErrors]` scope keyed by `name`. See {@link EfServerErrorsDirective}. */
    readonly errors = input<string[] | null | undefined>(undefined);
    private readonly serverErrorsScope = inject(EfServerErrorsDirective, { optional: true });
    readonly resolvedExternalErrors = computed<string[] | null>(() =>
        resolveExternalErrors(this.errors(), this.serverErrorsScope, this.name()),
    );

    /* ── Outputs ────────────────────────────────────────────────── */

    /** Emitted whenever a preset or applied custom range changes. */
    readonly rangeChange = output<EfDateRange>();
    /** Forwarded when the popover opens / closes (mirrors ef-row-actions). */
    readonly opened = output<void>();
    readonly closed = output<void>();

    /* ── State ──────────────────────────────────────────────────── */

    readonly open = signal(false);
    readonly view = signal<'presets' | 'custom'>('presets');

    /**
     * Custom view sub-mode: the day grid, the month picker, or the year
     * picker. Clicking the month / year labels in the calendar header
     * drills into the corresponding picker; selecting a cell returns to
     * the day grid.
     */
    readonly calMode = signal<'days' | 'months' | 'years'>('days');

    /** First year shown in the 12-cell year picker grid. */
    readonly yearWindowStart = signal<number>(this.startOfYearWindow(new Date().getFullYear()));

    /** Custom view: month being displayed (1st of the month, 00:00). */
    readonly visibleMonth = signal<Date>(this.startOfMonth(new Date()));

    /** Custom view: working start/end, before the user clicks Apply. */
    readonly draftStart = signal<Date | null>(null);
    readonly draftEnd = signal<Date | null>(null);

    /** Effective preset list — defaults if none provided. */
    readonly effectivePresets = computed<ReadonlyArray<EfDatePreset>>(
        () => this.presets() ?? this.defaultPresets,
    );

    /** Current value resolved against today's date. */
    readonly resolvedRange = computed<EfDateRange>(() => {
        const key = this.activePreset() ?? 'last_30_days';
        const explicitStart = this.start();
        const explicitEnd = this.end();
        if (explicitStart && explicitEnd) {
            return this.buildRange(key, explicitStart, explicitEnd);
        }
        return this.computePresetRange(key);
    });

    /** 7×6 grid for the visible month, prev/next-month overflow days included. */
    readonly calendarGrid = computed(() => this.buildMonthGrid(this.visibleMonth()));

    /** Day-of-week labels from CLDR (Mon-first). */
    readonly dowLabels = computed(() => this.buildDowLabels());

    /** Month + year title for the calendar header. */
    readonly monthLabel = computed(() => {
        const d = this.visibleMonth();
        return formatDate(d, 'LLLL', this.locale)
            .replace(/^./, c => c.toUpperCase());
    });
    readonly yearLabel = computed(() => formatDate(this.visibleMonth(), 'yyyy', this.locale));

    /** Range label for the year-picker header, e.g. `2024 – 2035`. */
    readonly yearWindowLabel = computed(() => {
        const start = this.yearWindowStart();
        return `${start} – ${start + 11}`;
    });

    /** 12 abbreviated months for the month picker (Jan…Déc), CLDR-localised. */
    readonly monthCells = computed(() => {
        const visible = this.visibleMonth();
        const today = new Date();
        return Array.from({ length: 12 }, (_, m) => ({
            month: m,
            label: formatDate(new Date(2000, m, 1), 'LLL', this.locale)
                .replace(/^./, c => c.toUpperCase()),
            active: m === visible.getMonth(),
            today: m === today.getMonth() && visible.getFullYear() === today.getFullYear(),
        }));
    });

    /** 12 consecutive years for the year picker, starting at `yearWindowStart`. */
    readonly yearCells = computed(() => {
        const start = this.yearWindowStart();
        const visibleYear = this.visibleMonth().getFullYear();
        const todayYear = new Date().getFullYear();
        return Array.from({ length: 12 }, (_, i) => {
            const year = start + i;
            return { year, active: year === visibleYear, today: year === todayYear };
        });
    });

    /** Live duration in days for the draft range. Mirrors `applyCustomRange`:
     *  a lone start is treated as a single-day range (→ "1 jour"). */
    readonly draftDurationDays = computed(() => {
        const s = this.draftStart();
        if (!s) return 0;
        const e = this.draftEnd() ?? s;
        return Math.round((this.startOfDay(e).getTime() - this.startOfDay(s).getTime()) / 86_400_000) + 1;
    });

    /** Du / Au inputs as DD/MM/YYYY strings (kept in sync with drafts). */
    readonly fromText = computed(() => this.formatDayInput(this.draftStart()));
    readonly toText = computed(() => this.formatDayInput(this.draftEnd()));

    /* ── Field mode: committed value (ControlValueAccessor) ──────────
       The trigger in field mode renders THIS — the committed CVA value —
       not the drafts (mid-selection) nor `resolvedRange()` (filter-only). */

    /** Committed value pushed in via `writeValue` / day-pick / Apply. */
    private readonly fieldValue = signal<EfDateFieldValue>(null);

    /** Disabled state set through CVA's `setDisabledState`. */
    private readonly cvaDisabled = signal(false);

    /** Effective disabled: explicit `[disabled]` input OR form-driven. */
    readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());

    /** Committed start / end derived from `fieldValue`. */
    readonly fieldStart = computed<Date | null>(() => {
        const v = this.fieldValue();
        if (!v) return null;
        return Array.isArray(v) ? v[0] ?? null : v;
    });
    readonly fieldEnd = computed<Date | null>(() => {
        const v = this.fieldValue();
        return v && Array.isArray(v) ? v[1] ?? null : null;
    });

    /** Whether the field currently holds a value (vs. placeholder). */
    readonly hasFieldValue = computed(() => this.fieldStart() != null);

    /** Text rendered in the field-mode trigger (date, +time when enabled). */
    readonly fieldDisplay = computed<string>(() => {
        const s = this.fieldStart();
        if (!s) return '';
        const fmt = this.showTime() ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';
        const from = formatDate(s, fmt, this.locale);
        if (this.selectionMode() === 'single') return from;
        const e = this.fieldEnd();
        return e ? `${from} — ${formatDate(e, fmt, this.locale)}` : from;
    });

    /* ── Time drafts (field mode + showTime) ────────────────────────
       Tracked separately from the day drafts so the calendar stays
       start-of-day internally; date + time are merged only at commit. */
    readonly draftStartTime = signal<{ h: number; m: number }>({ h: 0, m: 0 });
    readonly draftEndTime = signal<{ h: number; m: number }>({ h: 0, m: 0 });

    /** Du / Au time inputs as `HH:mm` strings (kept in sync with drafts). */
    readonly fromTimeText = computed(() => this.formatTime(this.draftStartTime()));
    readonly toTimeText = computed(() => this.formatTime(this.draftEndTime()));

    private onChange: (value: EfDateFieldValue) => void = () => { /* noop */ };
    private onTouched: () => void = () => { /* noop */ };

    /* ── a11y / identity (field mode) ───────────────────────────── */

    private static _nextId = 0;
    private readonly _autoId = `ef-dp-${++EfDatepickerAdvancedComponent._nextId}`;

    /** Resolved DOM id so `<label for>` ↔ trigger `id` always matches. */
    get effectiveId(): string {
        return this.inputId() || this.name() || this._autoId;
    }
    /** Stable id for the error container (wired via `aria-describedby`). */
    get errorsId(): string {
        return `${this.effectiveId}-errors`;
    }
    /** Required error is shown once the control is touched. */
    get showRequired(): boolean {
        const ctrl = this.ngControl?.control;
        return !!(ctrl?.hasError('required') && ctrl?.touched);
    }
    /** Backend validation messages stashed under `serverError`. */
    get serverErrors(): string[] | null {
        return this.resolvedExternalErrors() ?? (this.ngControl?.control?.errors?.['serverError'] as string[]) ?? null;
    }
    /** Invalid + interacted — drives the red border on the field box. */
    get isInvalid(): boolean {
        if (this.resolvedExternalErrors()?.length) return true;
        const ctrl = this.ngControl?.control;
        return !!(ctrl?.invalid && (ctrl?.touched || ctrl?.dirty));
    }

    /* ── ControlValueAccessor ───────────────────────────────────── */

    writeValue(value: Date | Date[] | string | number | null | undefined): void {
        this.fieldValue.set(this.coerceValue(value));
    }
    registerOnChange(fn: (value: EfDateFieldValue) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled: boolean): void {
        this.cvaDisabled.set(isDisabled);
    }

    /** Normalise whatever a form pushes in to our internal value shape.
     *  Tolerates `null`, `[start, null]`, strings/epochs, and stray
     *  multi-element arrays (keeps the first two). */
    private coerceValue(value: Date | Date[] | string | number | null | undefined): EfDateFieldValue {
        if (value == null) return null;
        if (Array.isArray(value)) {
            const start = this.toDate(value[0]);
            if (!start) return null;
            const end = this.toDate(value[1]);
            return end ? [start, end] : start;
        }
        return this.toDate(value);
    }

    private toDate(v: unknown): Date | null {
        // Preserve the time component — `showTime` mode needs it; date-only
        // paths re-normalise to start-of-day when they seed the calendar and
        // when they commit, so nothing leaks the stray time.
        if (v == null) return null;
        if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
        if (typeof v === 'string' || typeof v === 'number') {
            const d = new Date(v);
            return isNaN(d.getTime()) ? null : d;
        }
        return null;
    }

    /** Commit a field-mode value: update internal state, notify the form,
     *  and close the popover. `single` → `Date`, `range` → `[start, end]`. */
    private commitField(value: Date | [Date, Date]): void {
        this.fieldValue.set(value);
        this.onChange(value);
        this.close();
    }

    /** Merge a day with a draft time. Returns start-of-day when `showTime`
     *  is off, so date-only commits stay time-free. */
    private composeDateTime(day: Date, time: { h: number; m: number }): Date {
        const base = this.startOfDay(day);
        if (this.showTime()) base.setHours(time.h, time.m, 0, 0);
        return base;
    }

    /** Format a draft time as zero-padded `HH:mm`. */
    private formatTime(t: { h: number; m: number }): string {
        return `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`;
    }

    /** Parse `H:mm` … `HH:mm` (24h) → `{h, m}`, or null when out of range. */
    private parseTimeInput(raw: string): { h: number; m: number } | null {
        const m = raw.trim().match(/^(\d{1,2}):(\d{1,2})$/);
        if (!m) return null;
        const h = +m[1];
        const min = +m[2];
        if (h > 23 || min > 59) return null;
        return { h, m: min };
    }

    /** Allow only digits and `:` while typing a time; Enter commits via blur. */
    onTimeKeydown(event: KeyboardEvent, el: HTMLInputElement): void {
        if (event.key === 'Enter') {
            el.blur();
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key.length > 1) return;
        if (!/[0-9:]/.test(event.key)) event.preventDefault();
    }

    /** Commit a typed `HH:mm` value to the start or end draft time. */
    commitTimeInput(which: 'start' | 'end', el: HTMLInputElement): void {
        const parsed = this.parseTimeInput(el.value);
        if (!parsed) {
            el.value = which === 'start' ? this.fromTimeText() : this.toTimeText();
            return;
        }
        if (which === 'start') this.draftStartTime.set(parsed);
        else this.draftEndTime.set(parsed);
        el.value = which === 'start' ? this.fromTimeText() : this.toTimeText();
    }

    /* ── Trigger / popover ──────────────────────────────────────── */

    toggle(event: MouseEvent): void {
        event.stopPropagation();
        if (this.isDisabled()) return;
        this.open.update(v => !v);
        if (this.open()) {
            this.calMode.set('days');
            if (this.mode() === 'field') {
                // No presets in field mode — open straight to the calendar.
                this.view.set('custom');
                this.seedDraftFromValue();
                const anchor = this.draftStart() ?? new Date();
                this.visibleMonth.set(this.startOfMonth(anchor));
            } else {
                this.view.set('presets');
                this.seedDraftFromValue();
            }
            this.opened.emit();
        } else {
            this.onTouched();
            this.closed.emit();
        }
    }

    close(): void {
        if (!this.open()) return;
        this.open.set(false);
        this.onTouched();
        this.closed.emit();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.open()) return;
        const target = event.target as Node | null;
        if (!target) return;
        // Trigger sits inside the host element …
        if (this.host.nativeElement.contains(target)) return;
        // … the panel is portaled to <body>, so check it separately.
        if (this.panelRoot && this.panelRoot.contains(target)) return;
        this.close();
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        // Drill back out one level at a time: year/month picker → day grid
        // → presets → closed.
        if (this.view() === 'custom' && this.calMode() !== 'days') {
            this.calMode.set('days');
            return;
        }
        // Field mode has no preset view to drill back to — Escape closes.
        if (this.view() === 'custom' && this.mode() !== 'field') {
            this.backToPresets();
            return;
        }
        this.close();
    }

    /* ── Preset actions ─────────────────────────────────────────── */

    selectPreset(preset: EfDatePreset): void {
        if (preset.key === 'custom') {
            this.openCustomView();
            return;
        }
        const range = this.computePresetRange(preset.key);
        this.rangeChange.emit(range);
        this.close();
    }

    isActivePreset(key: EfDatePresetKey): boolean {
        return (this.activePreset() ?? 'last_30_days') === key;
    }

    presetHint(preset: EfDatePreset): string {
        if (preset.hintFn) return preset.hintFn(new Date());
        return this.builtInHint(preset.key);
    }

    /* ── Custom view ────────────────────────────────────────────── */

    openCustomView(): void {
        this.view.set('custom');
        this.calMode.set('days');
        this.seedDraftFromValue();
        const anchor = this.draftStart() ?? new Date();
        this.visibleMonth.set(this.startOfMonth(anchor));
    }

    backToPresets(): void {
        this.view.set('presets');
        this.calMode.set('days');
    }

    /* ── Calendar header navigation (context-aware) ─────────────────
         The same ‹ / › chevrons step by month (day grid), by year
         (month picker), or by 12-year page (year picker). */

    headerPrev(): void {
        this.stepHeader(-1);
    }

    headerNext(): void {
        this.stepHeader(1);
    }

    private stepHeader(dir: 1 | -1): void {
        switch (this.calMode()) {
            case 'days':
                this.visibleMonth.update(d => this.addMonths(d, dir));
                break;
            case 'months':
                this.visibleMonth.update(d => this.addMonths(d, dir * 12));
                break;
            case 'years':
                this.yearWindowStart.update(y => y + dir * 12);
                break;
        }
    }

    /* ── Month / year pickers ───────────────────────────────────── */

    /** Open the month picker (triggered by clicking the month label). */
    openMonthPicker(): void {
        this.calMode.set('months');
    }

    /** Open the year picker (triggered by clicking the year label). */
    openYearPicker(): void {
        this.yearWindowStart.set(this.startOfYearWindow(this.visibleMonth().getFullYear()));
        this.calMode.set('years');
    }

    /** Pick a month → jump the day grid to it. */
    selectMonth(month: number): void {
        this.visibleMonth.update(d => new Date(d.getFullYear(), month, 1));
        this.calMode.set('days');
    }

    /** Pick a year → keep the current month, return to the day grid. */
    selectYear(year: number): void {
        this.visibleMonth.update(d => new Date(year, d.getMonth(), 1));
        this.calMode.set('days');
    }

    /* ── Editable Du / Au inputs ────────────────────────────────────
         The text inputs are no longer read-only — the user can type a
         `JJ/MM/AAAA` date. We commit on blur / Enter: a valid date updates
         the matching draft (auto-swapping if end precedes start) and moves
         the calendar to it; an invalid one reverts the field to canonical. */

    /** Allow only digits and `/` for printable keys; Enter commits via blur. */
    onDateKeydown(event: KeyboardEvent, el: HTMLInputElement): void {
        if (event.key === 'Enter') {
            el.blur();
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        // Multi-char keys (Backspace, ArrowLeft, Tab, Delete, …) pass through.
        if (event.key.length > 1) return;
        if (!/[0-9/]/.test(event.key)) event.preventDefault();
    }

    /** Commit a typed `JJ/MM/AAAA` value to the start or end draft. */
    commitDateInput(which: 'start' | 'end', el: HTMLInputElement): void {
        const parsed = this.parseDayInput(el.value);
        if (!parsed) {
            // Invalid → restore the canonical text for this field.
            el.value = which === 'start' ? this.fromText() : this.toText();
            return;
        }

        if (which === 'start') {
            this.draftStart.set(parsed);
            const end = this.draftEnd();
            // New start after the existing end → drop the now-invalid end.
            if (end && parsed.getTime() > end.getTime()) this.draftEnd.set(null);
        } else {
            const start = this.draftStart();
            if (start && parsed.getTime() < start.getTime()) {
                // End before start → swap so the range stays ordered.
                this.draftStart.set(parsed);
                this.draftEnd.set(start);
            } else {
                this.draftEnd.set(parsed);
            }
        }

        this.visibleMonth.set(this.startOfMonth(parsed));
        // Re-sync to canonical (zero-padded) regardless of how it was typed.
        el.value = which === 'start' ? this.fromText() : this.toText();
    }

    /* ── Portal (panel rendered as a child of <body>) ───────────── */

    private attachPortal(): void {
        if (this.panelView || !this.panelTpl) return;

        this.panelView = this.vcr.createEmbeddedView(this.panelTpl);
        this.panelView.detectChanges();

        const root = this.panelView.rootNodes.find(
            (n: Node): n is HTMLElement => n instanceof HTMLElement,
        );
        if (!root) return;

        this.panelRoot = root;
        document.body.appendChild(root);
        this.positionPanel();

        // Reposition when the viewport changes; scroll already moves the
        // panel with the trigger because we use absolute / page coords.
        this.resizeHandler = () => this.positionPanel();
        window.addEventListener('resize', this.resizeHandler);
    }

    private detachPortal(): void {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        if (this.panelRoot && this.panelRoot.parentNode) {
            this.panelRoot.parentNode.removeChild(this.panelRoot);
        }
        this.panelRoot = null;
        if (this.panelView) {
            this.panelView.destroy();
            this.panelView = null;
        }
    }

    /** Anchor the panel's top-left to the trigger's bottom-left, using
     *  page coords so the panel scrolls with the trigger naturally.
     *  Flips to right-aligned (and clamps to the viewport) when the
     *  default left-anchor would overflow the right edge — otherwise the
     *  panel is clipped for triggers that sit near the right of the page. */
    private positionPanel(): void {
        if (!this.panelRoot || !this.anchorEl) return;
        const rect = this.anchorEl.nativeElement.getBoundingClientRect();
        const margin = 8;
        const viewportWidth = document.documentElement.clientWidth;
        const panelWidth = this.panelRoot.offsetWidth || 320;

        // Default: align panel's left edge to the trigger's left edge.
        let left = rect.left;
        // Flip to right-aligned (panel right edge ↔ trigger right edge)
        // if the panel would spill past the right viewport edge.
        if (left + panelWidth > viewportWidth - margin) {
            left = rect.right - panelWidth;
        }
        // Never let it spill past the left edge either.
        left = Math.max(margin, left);

        Object.assign(this.panelRoot.style, {
            position: 'absolute',
            top: `${window.scrollY + rect.bottom + 8}px`,
            left: `${window.scrollX + left}px`,
            insetInlineEnd: 'auto',
        });
    }

    /** Click handling: 1st click sets start, 2nd click sets end (or swap).
     *  Field single-date mode short-circuits — one click commits & closes. */
    selectDay(day: Date): void {
        if (this.mode() === 'field' && this.selectionMode() === 'single') {
            const picked = this.startOfDay(day);
            this.draftStart.set(picked);
            this.draftEnd.set(null);
            // With a time field, wait for Apply so the user can set the time.
            if (this.showTime()) return;
            this.commitField(picked);
            return;
        }

        const start = this.draftStart();
        const end = this.draftEnd();

        // Reset → set start; or already-have-both → start over
        if (!start || (start && end)) {
            this.draftStart.set(this.startOfDay(day));
            this.draftEnd.set(null);
            return;
        }

        // Have only start → set end (with auto-swap if before start)
        const picked = this.startOfDay(day);
        if (picked.getTime() < start.getTime()) {
            this.draftStart.set(picked);
            this.draftEnd.set(start);
        } else {
            this.draftEnd.set(picked);
        }
    }

    applyCustomRange(): void {
        const s = this.draftStart();
        const e = this.draftEnd() ?? s;
        if (!s || !e) return;
        if (this.mode() === 'field') {
            // Commit as a form value (single → Date, range → [start, end]),
            // merging the draft time(s) when `showTime` is on.
            this.commitField(
                this.selectionMode() === 'single'
                    ? this.composeDateTime(s, this.draftStartTime())
                    : [
                          this.composeDateTime(s, this.draftStartTime()),
                          this.composeDateTime(e, this.draftEndTime()),
                      ],
            );
            return;
        }
        this.rangeChange.emit(this.buildRange('custom', s, e));
        this.close();
    }

    /** Field single-date mode: commit a typed `JJ/MM/AAAA` value & close.
     *  With `showTime`, only update the draft — Apply commits date + time. */
    commitSingleInput(el: HTMLInputElement): void {
        const parsed = this.parseDayInput(el.value);
        if (!parsed) {
            el.value = this.fromText();
            return;
        }
        this.draftStart.set(parsed);
        this.draftEnd.set(null);
        this.visibleMonth.set(this.startOfMonth(parsed));
        if (this.showTime()) {
            el.value = this.fromText();
            return;
        }
        this.commitField(parsed);
    }

    /* ── Internals ──────────────────────────────────────────────── */

    /** Default preset list — built-in semantics, all keys recognised. */
    private readonly defaultPresets: ReadonlyArray<EfDatePreset> = [
        { key: 'today',         labelKey: 'date_preset_today' },
        { key: 'this_week',     labelKey: 'date_preset_this_week' },
        { key: 'this_month',    labelKey: 'date_preset_this_month' },
        { key: 'last_30_days',  labelKey: 'date_preset_last_30_days' },
        { key: 'last_90_days',  labelKey: 'date_preset_last_90_days' },
        { key: 'this_quarter',  labelKey: 'date_preset_this_quarter' },
        { key: 'this_year',     labelKey: 'date_preset_this_year' },
    ];

    private seedDraftFromValue(): void {
        if (this.mode() === 'field') {
            // Seed the calendar (day) + time drafts from the committed value.
            const s = this.fieldStart();
            const e = this.fieldEnd();
            this.draftStart.set(s ? this.startOfDay(s) : null);
            this.draftEnd.set(e ? this.startOfDay(e) : null);
            this.draftStartTime.set(s ? { h: s.getHours(), m: s.getMinutes() } : { h: 0, m: 0 });
            this.draftEndTime.set(e ? { h: e.getHours(), m: e.getMinutes() } : { h: 0, m: 0 });
            return;
        }
        const range = this.resolvedRange();
        this.draftStart.set(this.startOfDay(range.start));
        this.draftEnd.set(this.startOfDay(range.end));
    }

    /** Compute the date range for a preset key. */
    private computePresetRange(key: EfDatePresetKey): EfDateRange {
        const today = new Date();
        const preset = this.effectivePresets().find(p => p.key === key);
        const { start, end } = preset?.compute
            ? preset.compute(today)
            : this.builtInRange(key, today);
        return this.buildRange(key, start, end);
    }

    /** Assemble an EfDateRange — exposes `labelKey` (for the trigger
     *  to render via `| translate`) and a literal `label` fallback. */
    private buildRange(key: EfDatePresetKey, start: Date, end: Date): EfDateRange {
        if (key === 'custom') {
            const sameYear = start.getFullYear() === end.getFullYear();
            const fmt = sameYear ? 'd MMM' : 'd MMM yyyy';
            return {
                start, end,
                presetKey: 'custom',
                label: `${formatDate(start, fmt, this.locale)} — ${formatDate(end, fmt, this.locale)}`,
            };
        }
        const preset = this.effectivePresets().find(p => p.key === key);
        return {
            start, end,
            presetKey: key,
            labelKey: preset?.labelKey,
            label: preset?.label ?? this.builtInHint(key),
        };
    }

    private builtInRange(key: EfDatePresetKey, today: Date): { start: Date; end: Date } {
        const t = this.startOfDay(today);
        switch (key) {
            case 'today':
                return { start: t, end: t };
            case 'this_week': {
                const dow = (t.getDay() + 6) % 7;       // Monday = 0
                const start = this.addDays(t, -dow);
                return { start, end: t };
            }
            case 'this_month':
                return { start: this.startOfMonth(t), end: t };
            case 'last_30_days':
                return { start: this.addDays(t, -29), end: t };
            case 'last_90_days':
                return { start: this.addDays(t, -89), end: t };
            case 'this_quarter': {
                const q = Math.floor(t.getMonth() / 3);
                const start = new Date(t.getFullYear(), q * 3, 1);
                return { start, end: t };
            }
            case 'this_year':
                return { start: new Date(t.getFullYear(), 0, 1), end: t };
            default:
                // Unknown key falls back to today.
                return { start: t, end: t };
        }
    }

    private builtInHint(key: EfDatePresetKey): string {
        const today = new Date();
        const r = this.builtInRange(key, today);
        switch (key) {
            case 'today':
                return formatDate(today, 'd MMM', this.locale);
            case 'this_week':
            case 'this_month':
                return `${this.daysBetween(r.start, r.end)} j`;
            case 'last_30_days':
            case 'last_90_days':
                return `${formatDate(r.start, 'd MMM', this.locale)} — ${formatDate(r.end, 'd MMM', this.locale)}`;
            case 'this_quarter':
                return `T${Math.floor(today.getMonth() / 3) + 1}`;
            case 'this_year':
                return formatDate(today, 'yyyy', this.locale);
            default:
                return '';
        }
    }

    /** 6 weeks × 7 days. Each cell carries its date + flags. */
    private buildMonthGrid(month: Date): ReadonlyArray<{
        date: Date;
        day: number;
        out: boolean;
        today: boolean;
        inRange: boolean;
        rangeStart: boolean;
        rangeEnd: boolean;
    }> {
        const startOfMonth = this.startOfMonth(month);
        const offset = (startOfMonth.getDay() + 6) % 7; // Mon-first
        const gridStart = this.addDays(startOfMonth, -offset);
        const today = this.startOfDay(new Date());
        const ds = this.draftStart();
        const de = this.draftEnd();

        return Array.from({ length: 42 }, (_, i) => {
            const date = this.addDays(gridStart, i);
            const out = date.getMonth() !== month.getMonth();
            const t = this.startOfDay(date);
            const sameDay = (a: Date | null, b: Date) =>
                !!a && a.getTime() === b.getTime();

            const inBand = ds && de && t.getTime() > ds.getTime() && t.getTime() < de.getTime();
            return {
                date: t,
                day: date.getDate(),
                out,
                today: t.getTime() === today.getTime(),
                inRange: !!inBand,
                rangeStart: sameDay(ds, t),
                rangeEnd: sameDay(de, t),
            };
        });
    }

    private buildDowLabels(): ReadonlyArray<string> {
        // Build a Monday → Sunday list from CLDR's narrow weekday name.
        // CLDR puts Sunday at index 0; we want Mon first.
        const monday = new Date(2024, 0, 1); // 2024-01-01 is a Monday
        return Array.from({ length: 7 }, (_, i) =>
            formatDate(this.addDays(monday, i), 'EEEEE', this.locale).slice(0, 2)
                .replace(/^./, c => c.toUpperCase()),
        );
    }

    /* ── Date math (no library; everything local-time) ──────────── */

    private startOfDay(d: Date): Date {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    private startOfMonth(d: Date): Date {
        return new Date(d.getFullYear(), d.getMonth(), 1);
    }

    private addDays(d: Date, n: number): Date {
        const out = new Date(d);
        out.setDate(out.getDate() + n);
        return this.startOfDay(out);
    }

    private addMonths(d: Date, n: number): Date {
        return new Date(d.getFullYear(), d.getMonth() + n, 1);
    }

    private daysBetween(a: Date, b: Date): number {
        return Math.round((this.startOfDay(b).getTime() - this.startOfDay(a).getTime()) / 86_400_000) + 1;
    }

    private formatDayInput(d: Date | null | undefined): string {
        if (!d) return '';
        return formatDate(d, 'dd/MM/yyyy', this.locale);
    }

    /** Parse a `J/M/AAAA`…`JJ/MM/AAAA` string to a start-of-day Date, or
     *  null when malformed or out of range (e.g. `31/02/2026`). */
    private parseDayInput(raw: string): Date | null {
        const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) return null;
        const day = +m[1];
        const month = +m[2];
        const year = +m[3];
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        const d = new Date(year, month - 1, day);
        // Reject calendar overflow — JS rolls 31/02 into March.
        if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
            return null;
        }
        return this.startOfDay(d);
    }

    /** First year of the 12-cell window containing `year` (e.g. 2026 → 2016). */
    private startOfYearWindow(year: number): number {
        // -4 anchors the current year roughly in the second row of the grid.
        return year - ((year - 4) % 12 + 12) % 12;
    }

    /** Stable trackBy across renders. */
    trackByPreset = (_: number, p: EfDatePreset): string => p.key;
    trackByDay = (_: number, day: { date: Date }): number => day.date.getTime();
    trackByDow = (_: number, label: string): string => label;
}
