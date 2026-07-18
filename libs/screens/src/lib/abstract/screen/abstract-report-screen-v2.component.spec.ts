import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { CacheService, ConfirmDialogService, ToastService } from '@elasticias/core';
import {
  AbstractReportScreenV2,
  ReportWidget,
} from './abstract-report-screen-v2.component';
import { ScreenConfig } from '../../config/screen-config';
import { SCREEN_REF_DATA_SERVICE } from '../../services/screen-reference-data.service';

class FakeReportsClient {}

class TestConfig extends ScreenConfig {
  static SCREEN: string = 'TestReports';
  static SERVICE: any = FakeReportsClient;
  static DEFAULT_PERIOD = 'this_year';
}

@Component({ template: '', standalone: true })
class TestReportScreen extends AbstractReportScreenV2 {
  readonly okW: ReportWidget<{ s: Date; e: Date }> = this.widget((s, e) => of({ s, e }));
  readonly failW: ReportWidget<never> = this.widget(() =>
    throwError(() => new Error('boom')),
  );
  protected override getConfig() {
    return TestConfig;
  }
}

describe('AbstractReportScreenV2', () => {
  let fixture: ComponentFixture<TestReportScreen>;
  let screen: TestReportScreen;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TestReportScreen],
      providers: [
        provideRouter([]),
        { provide: FakeReportsClient, useValue: new FakeReportsClient() },
        {
          provide: CacheService,
          useValue: { configure() {}, getCache: () => null, setCache() {} },
        },
        { provide: ToastService, useValue: { showSuccess() {}, showError() {} } },
        { provide: ConfirmDialogService, useValue: { confirm() {} } },
        {
          provide: SCREEN_REF_DATA_SERVICE,
          useValue: {
            getReference: () => signal([]),
            hasReference: () => false,
            loadReferenceKeys: async () => {},
            loadStaticRefs: async () => {},
            refreshKeys: async () => {},
            invalidateKeys: async () => {},
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TestReportScreen);
    screen = fixture.componentInstance;
  });

  it('initializes dateRange from the config DEFAULT_PERIOD', () => {
    const r = screen.dateRange();
    expect(r.presetKey).toBe('this_year');
    expect(r.start.getMonth()).toBe(0);
    expect(r.start.getDate()).toBe(1);
    expect(r.start.getFullYear()).toBe(new Date().getFullYear());
  });

  it('loads every registered widget on init with UTC-normalized dates', () => {
    fixture.detectChanges(); // ngOnInit → loadAll
    expect(screen.okW.status()).toBe('ready');
    const payload = screen.okW.data()!;
    expect(payload.s.getUTCHours()).toBe(0);
    expect(payload.s.getUTCDate()).toBe(1);
    expect(payload.s.getUTCMonth()).toBe(0);
  });

  it('isolates a failing widget from its siblings', () => {
    fixture.detectChanges();
    expect(screen.failW.status()).toBe('error');
    expect(screen.okW.status()).toBe('ready');
  });

  it('reloads all widgets with the new period on onDateRangeChange', () => {
    fixture.detectChanges();
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 5, 30);
    screen.onDateRangeChange({ start, end, presetKey: 'custom', label: '' });
    expect(screen.dateRange().presetKey).toBe('custom');
    const payload = screen.okW.data()!;
    expect(payload.s.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(payload.e.toISOString()).toBe('2026-06-30T00:00:00.000Z');
  });

  it('resolves built-in presets and normalizes unknown keys to last_30_days', () => {
    const monthStart = (screen as any).rangeFromPreset('this_month');
    expect(monthStart.start.getDate()).toBe(1);
    const unknown = (screen as any).rangeFromPreset('nonsense');
    expect(unknown.presetKey).toBe('last_30_days');
  });
});
