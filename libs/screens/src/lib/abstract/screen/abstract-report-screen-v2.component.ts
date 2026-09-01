import {
  Component,
  inject,
  Injector,
  OnDestroy, OnInit,
  Signal,
  signal,
} from '@angular/core';
import { Observable, take } from 'rxjs';
import { Permissions } from '@elasticias/types';
import { CsvUtils } from '@elasticias/utils';
import { AbstractScreenComponent } from './abstract-screen.component';
import { ScreenStateEnum } from '../../config/screen-state.enum';
import { EfDatePresetKey, EfDateRange } from '../../entities/date-range.entity';

export type ReportWidgetStatus = 'loading' | 'ready' | 'error';

/**
 * Handle returned by {@link AbstractReportScreenV2.widget}. Each widget owns
 * an independent loading/error lifecycle — one failing report block never
 * blanks its siblings.
 */
export interface ReportWidget<T> {
  /** Last successful payload — null until the first `ready`. */
  readonly data: Signal<T | null>;
  readonly status: Signal<ReportWidgetStatus>;
  /** Re-run this widget's loader against the current period. */
  reload(): void;
}

/**
 * Signal-first base for report/dashboard screens — the third V2 abstract,
 * alongside {@link AbstractSearchScreenV2} / AbstractDetailScreenV2.
 *
 * Owns the report CHASSIS only: period state (`dateRange`, seeded from the
 * config's `DEFAULT_PERIOD` preset), per-widget lifecycle (`widget()` +
 * `loadAll()`), `REPORT_STATIC_LISTS` preload, and Export-gated CSV
 * (Task 2). Widget COMPOSITION stays in each screen's template — a
 * metadata-driven report renderer was rejected in ADR-015 and this class
 * must not become its frontend half.
 *
 * `ScreenConfig` surface: `SCREEN` (backend screen code), `SERVICE` (NSwag
 * reports client), `DEFAULT_PERIOD`, `REPORT_STATIC_LISTS`.
 *
 * Subclasses typically:
 *
 * ```ts
 * export class FooDashboardComponent extends AbstractReportScreenV2 {
 *   protected override getConfig() { return FooDashboardConfig; }
 *   readonly kpisW = this.widget((start, end) =>
 *     this.client.kpis(new GetFooKpisQuery({ start, end })));
 * }
 * ```
 *
 * Loaders close over the screen's own filter signals; the screen calls
 * `loadAll()` (period-wide) or `someW.reload()` (single widget) when its
 * filters change. Period-independent blocks (operational strips) load
 * outside the registry on purpose.
 */
@Component({ template: '', standalone: true })
export abstract class AbstractReportScreenV2
  extends AbstractScreenComponent
  implements OnInit
{
  protected readonly screenState = ScreenStateEnum.REPORT;
  protected readonly injector = inject(Injector);

  /** NSwag reports client resolved from `ScreenConfig.SERVICE` — expose a
   *  typed getter in the screen: `get client() { return this.reportsService as XClient; }` */
  protected reportsService: any;

  private readonly registeredWidgets: ReportWidget<unknown>[] = [];

  /** Active period. Bound to `ef-datepicker-advanced`; every widget loader
   *  receives its UTC-normalized start/end. */
  readonly dateRange = signal<EfDateRange>(this.buildDefaultDateRange());

  override ngOnInit(): void {
    super.ngOnInit();
    this.reportsService = this.injector.get(this.getConfig()!.SERVICE as any);

    const lists = this.getConfig()?.REPORT_STATIC_LISTS ?? [];
    if (lists.length > 0) {
      this.initializeStaticLists(lists);
      this.loadReferenceData(this.getConfig()?.REF_DATA_OPTIONS);
      this.refDataLoaded$.pipe(take(1)).subscribe(() => this.loadAll());
    } else {
      this.loadAll();
    }
  }

  /* ── Period ─────────────────────────────────────────────────── */

  /** Wired to `<ef-datepicker-advanced (rangeChange)>`. */
  onDateRangeChange(range: EfDateRange): void {
    this.dateRange.set(range);
    this.loadAll();
  }

  /** Default period from the config's `DEFAULT_PERIOD` preset. */
  protected buildDefaultDateRange(): EfDateRange {
    return this.rangeFromPreset(this.getConfig()?.DEFAULT_PERIOD ?? 'last_30_days');
  }

  /**
   * Resolve a built-in {@link EfDatePresetKey} to an inclusive day range
   * (both boundaries at 00:00 local). Unknown keys normalize to
   * `last_30_days`. Weeks start Monday (matches `$dateTrunc`, ADR-015).
   */
  protected rangeFromPreset(key: EfDatePresetKey): EfDateRange {
    const KNOWN: EfDatePresetKey[] = [
      'today', 'this_week', 'this_month', 'last_30_days',
      'last_90_days', 'this_quarter', 'this_year',
    ];
    const k = KNOWN.includes(key) ? key : 'last_30_days';
    const today = this.startOfToday();
    const end = new Date(today);
    let start = new Date(today);
    switch (k) {
      case 'today':
        break;
      case 'this_week': {
        const dow = (today.getDay() + 6) % 7;
        start.setDate(today.getDate() - dow);
        break;
      }
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_90_days':
        start.setDate(today.getDate() - 89);
        break;
      case 'this_quarter':
        start = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        break;
      case 'this_year':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'last_30_days':
      default:
        start.setDate(today.getDate() - 29);
        break;
    }
    return { start, end, presetKey: k, labelKey: `date_preset_${k}`, label: '' };
  }

  private startOfToday(): Date {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Re-anchor a local-midnight Date to UTC midnight of the same calendar
   * date. NSwag serializes via toISOString(); for UTC+ users (Morocco)
   * local midnight would otherwise shift into the previous UTC day.
   */
  protected toUtcDate(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  /* ── Widgets ────────────────────────────────────────────────── */

  /**
   * Register a report widget. The loader receives the current period's
   * UTC-normalized start/end and returns the NSwag observable; extra
   * filters are simply closed over from the screen's own signals.
   */
  protected widget<T>(
    loader: (start: Date, end: Date) => Observable<T>,
  ): ReportWidget<T> {
    const data = signal<T | null>(null);
    const status = signal<ReportWidgetStatus>('loading');
    const handle: ReportWidget<T> = {
      data: data.asReadonly(),
      status: status.asReadonly(),
      reload: () => {
        const { start, end } = this.dateRange();
        status.set('loading');
        loader(this.toUtcDate(start), this.toUtcDate(end)).subscribe({
          next: (value) => {
            data.set(value);
            status.set('ready');
          },
          error: () => status.set('error'),
        });
      },
    };
    this.registeredWidgets.push(handle);
    return handle;
  }

  /** Reload every registered widget against the current period. */
  loadAll(): void {
    for (const w of this.registeredWidgets) w.reload();
  }

  /* ── Grants + export ────────────────────────────────────────── */

  /** Export grant (ADR-011) on this screen's own code. Grants are loaded
   *  once by `processGrants()` in ngOnInit — safe to call from templates. */
  canExport(): boolean {
    return this.context?.isGranted(Permissions.Export) ?? false;
  }

  /** CSV download gated by the Export grant — silently no-ops without it. */
  protected exportCsv(
    filename: string,
    rows: object[],
    columns: { key: string; header: string }[],
  ): void {
    if (!this.canExport()) return;
    // `CsvColumn<T>['key']` is `keyof T & string`, which is `never` for the
    // bare `object` type — widen to `Record<string, unknown>` so the
    // generic infers a `string`-keyed column, matching `columns` as declared.
    CsvUtils.download(
      filename,
      CsvUtils.toCsv(rows as Record<string, unknown>[], columns),
    );
  }

    // AbstractComponent declares `abstract ngOnDestroy()`, so this must exist.
    // There is genuinely nothing to tear down here; removing it would push the
    // requirement onto every consumer component.
    // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
    ngOnDestroy(): void {
    // NSwag observables complete after one emission — nothing to tear down.
    }
}
