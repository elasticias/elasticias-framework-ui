import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostListener,
    LOCALE_ID,
    booleanAttribute,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
    EfDatePreset,
    EfDatePresetKey,
    EfDateRange,
} from './ef-datepicker-advanced.types';

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
    imports: [CommonModule, TranslateModule],
    templateUrl: './ef-datepicker-advanced.component.html',
    styleUrl: './ef-datepicker-advanced.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfDatepickerAdvancedComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly translate = inject(TranslateService);
    private readonly locale = inject(LOCALE_ID);

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

    /* ── Outputs ────────────────────────────────────────────────── */

    /** Emitted whenever a preset or applied custom range changes. */
    readonly rangeChange = output<EfDateRange>();
    /** Forwarded when the popover opens / closes (mirrors ef-row-actions). */
    readonly opened = output<void>();
    readonly closed = output<void>();

    /* ── State ──────────────────────────────────────────────────── */

    readonly open = signal(false);
    readonly view = signal<'presets' | 'custom'>('presets');

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
            return {
                start: explicitStart,
                end: explicitEnd,
                presetKey: key,
                label: this.labelForPreset(key, explicitStart, explicitEnd),
            };
        }
        return this.computePresetRange(key);
    });

    /** Bold value shown in the trigger. */
    readonly triggerValue = computed(() => this.resolvedRange().label);

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

    /** Live duration in days for the draft range. */
    readonly draftDurationDays = computed(() => {
        const s = this.draftStart();
        const e = this.draftEnd();
        if (!s || !e) return 0;
        return Math.round((this.startOfDay(e).getTime() - this.startOfDay(s).getTime()) / 86_400_000) + 1;
    });

    /** Du / Au inputs as DD/MM/YYYY strings (kept in sync with drafts). */
    readonly fromText = computed(() => this.formatDayInput(this.draftStart()));
    readonly toText = computed(() => this.formatDayInput(this.draftEnd()));

    /* ── Trigger / popover ──────────────────────────────────────── */

    toggle(event: MouseEvent): void {
        event.stopPropagation();
        if (this.disabled()) return;
        this.open.update(v => !v);
        if (this.open()) {
            this.view.set('presets');
            this.seedDraftFromValue();
            this.opened.emit();
        } else {
            this.closed.emit();
        }
    }

    close(): void {
        if (!this.open()) return;
        this.open.set(false);
        this.closed.emit();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.open()) return;
        const target = event.target as Node | null;
        if (target && this.host.nativeElement.contains(target)) return;
        this.close();
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.view() === 'custom') {
            this.view.set('presets');
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
        this.seedDraftFromValue();
        const anchor = this.draftStart() ?? new Date();
        this.visibleMonth.set(this.startOfMonth(anchor));
    }

    backToPresets(): void {
        this.view.set('presets');
    }

    prevMonth(): void {
        this.visibleMonth.update(d => this.addMonths(d, -1));
    }

    nextMonth(): void {
        this.visibleMonth.update(d => this.addMonths(d, 1));
    }

    /** Click handling: 1st click sets start, 2nd click sets end (or swap). */
    selectDay(day: Date): void {
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
        const range: EfDateRange = {
            start: s,
            end: e,
            presetKey: 'custom',
            label: this.labelForPreset('custom', s, e),
        };
        this.rangeChange.emit(range);
        this.close();
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
        const range = this.resolvedRange();
        this.draftStart.set(this.startOfDay(range.start));
        this.draftEnd.set(this.startOfDay(range.end));
    }

    /** Compute the date range for a preset key. */
    private computePresetRange(key: EfDatePresetKey): EfDateRange {
        const today = new Date();
        const preset = this.effectivePresets().find(p => p.key === key);
        if (preset?.compute) {
            const { start, end } = preset.compute(today);
            return { start, end, presetKey: key, label: this.labelForPreset(key, start, end) };
        }
        const builtIn = this.builtInRange(key, today);
        return {
            start: builtIn.start,
            end: builtIn.end,
            presetKey: key,
            label: this.labelForPreset(key, builtIn.start, builtIn.end),
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

    private labelForPreset(key: EfDatePresetKey, start: Date, end: Date): string {
        if (key === 'custom') {
            const sameYear = start.getFullYear() === end.getFullYear();
            const fmt = sameYear ? 'd MMM' : 'd MMM yyyy';
            return `${formatDate(start, fmt, this.locale)} — ${formatDate(end, fmt, this.locale)}`;
        }
        const preset = this.effectivePresets().find(p => p.key === key);
        const labelKey = preset?.labelKey;
        return labelKey
            ? this.translate.instant(labelKey)
            : (preset?.label ?? this.builtInHint(key));
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

    /** Stable trackBy across renders. */
    trackByPreset = (_: number, p: EfDatePreset): string => p.key;
    trackByDay = (_: number, day: { date: Date }): number => day.date.getTime();
    trackByDow = (_: number, label: string): string => label;
}
