import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Observable, Subject, of, throwError } from 'rxjs';
import { CacheService, ConfirmDialogService, ToastService } from '@elasticias/core';
import { AbstractSearchScreenV2 } from './abstract-search-screen-v2.component';
import { ScreenConfig } from '../../config/screen-config';
import { SCREEN_REF_DATA_SERVICE } from '../../services/screen-reference-data.service';

class FakeSearchClient {
  readonly calls: Subject<any>[] = [];
  readonly criteria: any[] = [];
  search(criteria: any) {
    const subject = new Subject<any>();
    this.calls.push(subject);
    this.criteria.push(criteria);
    return subject.asObservable();
  }
  readonly deleted: any[] = [];
  delete(id: any) {
    this.deleted.push(id);
    return of(null);
  }
}

class TestConfig extends ScreenConfig {
  static SCREEN = 'TestSearchItems';
  static SERVICE: any = FakeSearchClient;
}

@Component({ template: '', standalone: true })
class TestSearchScreen extends AbstractSearchScreenV2<{ id: string }> {
  protected override getConfig() {
    return TestConfig;
  }
}

describe('AbstractSearchScreenV2', () => {
  let fixture: ComponentFixture<TestSearchScreen>;
  let screen: TestSearchScreen;
  let fakeService: FakeSearchClient;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    fakeService = new FakeSearchClient();
    await TestBed.configureTestingModule({
      imports: [TestSearchScreen],
      providers: [
        provideRouter([]),
        { provide: FakeSearchClient, useValue: fakeService },
        {
          provide: CacheService,
          useValue: { configure() { /* no-op */ }, getCache: () => null, setCache() { /* no-op */ } },
        },
        { provide: ToastService, useValue: { showSuccess() { /* no-op */ }, showError() { /* no-op */ } } },
        { provide: ConfirmDialogService, useValue: { confirm() { /* no-op */ } } },
        {
          provide: SCREEN_REF_DATA_SERVICE,
          useValue: {
            getReference: () => signal([]),
            hasReference: () => false,
            loadReferenceKeys: async () => { /* no-op */ },
            loadStaticRefs: async () => { /* no-op */ },
            refreshKeys: async () => { /* no-op */ },
            invalidateKeys: async () => { /* no-op */ },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TestSearchScreen);
    screen = fixture.componentInstance;
  });

  it('drops a stale search response so the latest issued search always wins', () => {
    // ngOnInit → bootstrapInitialSearch() fires the first (bootstrap) search.
    fixture.detectChanges();
    fakeService.calls[0].next({ items: [{ id: 'bootstrap' }], totalCount: 1 });
    fakeService.calls[0].complete();

    // Two overlapping searches: the first issued resolves AFTER the second.
    screen.search();
    screen.search();
    expect(fakeService.calls.length).toBe(3);

    // Second (latest) search resolves first.
    fakeService.calls[2].next({ items: [{ id: 'second' }], totalCount: 1 });
    fakeService.calls[2].complete();

    // First (now stale) search resolves late — must be ignored.
    fakeService.calls[1].next({ items: [{ id: 'first-stale' }], totalCount: 99 });
    fakeService.calls[1].complete();

    expect(screen.items()).toEqual([{ id: 'second' }]);
    expect(screen.totalCount()).toBe(1);
  });

  it('never puts a non-string search value into the criteria', () => {
    fixture.detectChanges();
    screen.searchQuery.set('acme');

    // What a host (search) binding received from a native DOM search event.
    screen.setSearchText(new Event('search') as unknown as string);

    const sent = fakeService.criteria[fakeService.criteria.length - 1];
    expect(sent.searchText).toBe('acme');
    expect(screen.criteria().searchText).toBe('acme');
  });

  it('still sends the string it is given', () => {
    fixture.detectChanges();
    screen.searchQuery.set('typed');

    screen.setSearchText('given');

    expect(fakeService.criteria[fakeService.criteria.length - 1].searchText).toBe('given');
  });

  it('applies a ?status= deep-link through setStatus after bootstrap', () => {
    TestBed.resetTestingModule();
    sessionStorage.clear();
    localStorage.clear();
    fakeService = new FakeSearchClient();
    TestBed.configureTestingModule({
      imports: [TestSearchScreen],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ status: 'PendingApproval' }) } },
        },
        { provide: FakeSearchClient, useValue: fakeService },
        {
          provide: CacheService,
          useValue: { configure() { /* no-op */ }, getCache: () => null, setCache() { /* no-op */ } },
        },
        { provide: ToastService, useValue: { showSuccess() { /* no-op */ }, showError() { /* no-op */ } } },
        { provide: ConfirmDialogService, useValue: { confirm() { /* no-op */ } } },
        {
          provide: SCREEN_REF_DATA_SERVICE,
          useValue: {
            getReference: () => signal([]),
            hasReference: () => false,
            loadReferenceKeys: async () => { /* no-op */ },
            loadStaticRefs: async () => { /* no-op */ },
            refreshKeys: async () => { /* no-op */ },
            invalidateKeys: async () => { /* no-op */ },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(TestSearchScreen);
    screen = fixture.componentInstance;

    // ngOnInit → bootstrapInitialSearch() → applyDeepLinkStatus().
    fixture.detectChanges();

    expect(screen.statusFilter()).toBe('PendingApproval');
  });

  it('leaves the status pill on "all" when no ?status= is present', () => {
    fixture.detectChanges();
    expect(screen.statusFilter()).toBe('all');
  });

  it('hydrates the filter UI from cache-restored criteria', () => {
    TestBed.resetTestingModule();
    sessionStorage.clear();
    localStorage.clear();
    fakeService = new FakeSearchClient();
    TestBed.configureTestingModule({
      imports: [TestSearchScreen],
      providers: [
        provideRouter([]),
        { provide: FakeSearchClient, useValue: fakeService },
        {
          provide: CacheService,
          useValue: {
            configure() { /* no-op */ },
            // Simulate a revisit: cached criteria carries a stale filter.
            getCache: () => ({ searchText: 'marjane' }),
            setCache() { /* no-op */ },
          },
        },
        { provide: ToastService, useValue: { showSuccess() { /* no-op */ }, showError() { /* no-op */ } } },
        { provide: ConfirmDialogService, useValue: { confirm() { /* no-op */ } } },
        {
          provide: SCREEN_REF_DATA_SERVICE,
          useValue: {
            getReference: () => signal([]),
            hasReference: () => false,
            loadReferenceKeys: async () => { /* no-op */ },
            loadStaticRefs: async () => { /* no-op */ },
            refreshKeys: async () => { /* no-op */ },
            invalidateKeys: async () => { /* no-op */ },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(TestSearchScreen);
    screen = fixture.componentInstance;

    fixture.detectChanges();

    // The search box must show what the restored criteria will send.
    expect(screen.searchQuery()).toBe('marjane');
  });

  describe('activationFilterKey', () => {
    @Component({ template: '', standalone: true })
    class ActivationScreen extends AbstractSearchScreenV2<{ id: string }> {
      protected override getConfig() {
        return TestConfig;
      }
      protected override readonly activationFilterKey = 'isActive';
    }

    function createActivationScreen(cached: Record<string, unknown> | null) {
      TestBed.resetTestingModule();
      sessionStorage.clear();
    localStorage.clear();
      fakeService = new FakeSearchClient();
      TestBed.configureTestingModule({
        imports: [ActivationScreen],
        providers: [
          provideRouter([]),
          { provide: FakeSearchClient, useValue: fakeService },
          {
            provide: CacheService,
            useValue: { configure() { /* no-op */ }, getCache: () => cached, setCache() { /* no-op */ } },
          },
          { provide: ToastService, useValue: { showSuccess() { /* no-op */ }, showError() { /* no-op */ } } },
          { provide: ConfirmDialogService, useValue: { confirm() { /* no-op */ } } },
          {
            provide: SCREEN_REF_DATA_SERVICE,
            useValue: {
              getReference: () => signal([]),
              hasReference: () => false,
              loadReferenceKeys: async () => { /* no-op */ },
              loadStaticRefs: async () => { /* no-op */ },
              refreshKeys: async () => { /* no-op */ },
              invalidateKeys: async () => { /* no-op */ },
            },
          },
        ],
      });
      const f = TestBed.createComponent(ActivationScreen);
      f.detectChanges();
      return f.componentInstance;
    }

    it('applies the boolean straight from advancedValues into the criteria', () => {
      const s = createActivationScreen(null);
      s.setAdvancedValue('isActive', false);
      s.applyAdvancedFilters();
      expect((s.criteria() as any).isActive).toBe(false);
    });

    it('baseline-clears the key on apply when the value is back to "all"', () => {
      const s = createActivationScreen(null);
      s.setAdvancedValue('isActive', true);
      s.applyAdvancedFilters();
      s.setAdvancedValue('isActive', undefined);
      s.applyAdvancedFilters();
      expect((s.criteria() as any).isActive).toBeUndefined();
    });

    it('restores a cached boolean into advancedValues, ignoring non-booleans', () => {
      const restored = createActivationScreen({ isActive: false });
      expect(restored.advancedValues()['isActive']).toBe(false);

      const ignored = createActivationScreen({ isActive: 'stale' });
      expect(ignored.advancedValues()['isActive']).toBeUndefined();
    });
  });
  describe('date range (F3: the chip and the criteria agree)', () => {
    @Component({ template: '', standalone: true })
    class DefaultRangeScreen extends AbstractSearchScreenV2<{ id: string }> {
      protected override getConfig() {
        return TestConfig;
      }
    }

    @Component({ template: '', standalone: true })
    class WindowedScreen extends AbstractSearchScreenV2<{ id: string }> {
      protected override getConfig() {
        return TestConfig;
      }
      protected override buildDefaultDateRange() {
        return {
          start: new Date(2026, 8, 14),
          end: new Date(2026, 9, 13),
          presetKey: 'last_30_days',
          labelKey: 'date_preset_last_30_days',
          label: '',
        };
      }
    }

    @Component({ template: '', standalone: true })
    class NoDateScreen extends AbstractSearchScreenV2<{ id: string }> {
      protected override getConfig() {
        return TestConfig;
      }
      override readonly showDateFilter = false;
    }

    function create<T extends AbstractSearchScreenV2<{ id: string }>>(
      type: new (...args: any[]) => T,
      cached: Record<string, unknown> | null,
    ): T {
      TestBed.resetTestingModule();
      sessionStorage.clear();
      localStorage.clear();
      fakeService = new FakeSearchClient();
      TestBed.configureTestingModule({
        imports: [type],
        providers: [
          provideRouter([]),
          { provide: FakeSearchClient, useValue: fakeService },
          {
            provide: CacheService,
            useValue: { configure() { /* no-op */ }, getCache: () => cached, setCache() { /* no-op */ } },
          },
          { provide: ToastService, useValue: { showSuccess() { /* no-op */ }, showError() { /* no-op */ } } },
          { provide: ConfirmDialogService, useValue: { confirm() { /* no-op */ } } },
          {
            provide: SCREEN_REF_DATA_SERVICE,
            useValue: {
              getReference: () => signal([]),
              hasReference: () => false,
              loadReferenceKeys: async () => { /* no-op */ },
              loadStaticRefs: async () => { /* no-op */ },
              refreshKeys: async () => { /* no-op */ },
              invalidateKeys: async () => { /* no-op */ },
            },
          },
        ],
      });
      const f = TestBed.createComponent(type);
      f.detectChanges();
      return f.componentInstance;
    }

    const lastSent = () => fakeService.criteria[fakeService.criteria.length - 1];

    it('defaults to all time and sends no dates on first load', () => {
      const s = create(DefaultRangeScreen, null);
      expect(s.dateRange().presetKey).toBe('all_time');
      expect(s.dateRange().labelKey).toBe('date_preset_all_time');
      expect(s.dateRange().start).toBeNull();
      expect(s.dateRange().end).toBeNull();
      expect(fakeService.criteria.length).toBe(1);
      expect(lastSent().start).toBeNull();
      expect(lastSent().end).toBeNull();
    });

    it('sends the window a screen overrides the default with, on first load', () => {
      create(WindowedScreen, null);
      expect(lastSent().start).toEqual(new Date(2026, 8, 14));
      expect(lastSent().end).toEqual(new Date(2026, 9, 13));
    });

    it('sends a picked range', () => {
      const s = create(DefaultRangeScreen, null);
      const start = new Date(2026, 9, 1);
      const end = new Date(2026, 9, 13);
      s.onDateRangeChange({ start, end, presetKey: 'this_month', labelKey: 'date_preset_this_month', label: '' });
      expect(lastSent().start).toEqual(start);
      expect(lastSent().end).toEqual(end);
      expect(s.dateRange().presetKey).toBe('this_month');
    });

    it('clear() puts the chip back to all time and stops sending the picked dates', () => {
      const s = create(DefaultRangeScreen, null);
      s.onDateRangeChange({
        start: new Date(2026, 9, 1), end: new Date(2026, 9, 13),
        presetKey: 'this_month', labelKey: 'date_preset_this_month', label: '',
      });
      s.clear();
      expect(s.dateRange().presetKey).toBe('all_time');
      expect(lastSent().start).toBeNull();
      expect(lastSent().end).toBeNull();
    });

    it('clear() on a windowed screen sends the same window the chip shows', () => {
      const s = create(WindowedScreen, null);
      s.onDateRangeChange({
        start: new Date(2026, 0, 1), end: new Date(2026, 0, 31),
        presetKey: 'custom', label: '',
      });
      s.clear();
      expect(s.dateRange().presetKey).toBe('last_30_days');
      expect(lastSent().start).toEqual(s.dateRange().start);
      expect(lastSent().end).toEqual(s.dateRange().end);
    });

    it('restores all time on the chip when the cached criteria carry no dates', () => {
      const s = create(WindowedScreen, { start: null, end: null });
      expect(s.dateRange().presetKey).toBe('all_time');
      expect(lastSent().start).toBeNull();
    });

    it('restores the cached dates on the chip as a custom range', () => {
      const start = new Date(2026, 9, 1);
      const end = new Date(2026, 9, 13);
      // The cache round-trips through JSON, so the dates come back as strings.
      const s = create(DefaultRangeScreen, {
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const r = s.dateRange();
      expect(r.presetKey).toBe('custom');
      expect(r.start).toEqual(start);
      expect(r.end).toEqual(end);
      expect(r.start instanceof Date).toBe(true);
    });

    it('treats a cache holding a single bound as all time, and sends neither', () => {
      const s = create(DefaultRangeScreen, { start: new Date(2026, 9, 1).toISOString(), end: null });
      expect(s.dateRange().presetKey).toBe('all_time');
      expect(lastSent().start).toBeNull();
      expect(lastSent().end).toBeNull();
    });

    describe('showDateFilter = false', () => {
      it('sends no dates on first load', () => {
        create(NoDateScreen, null);
        expect(lastSent().start).toBeNull();
        expect(lastSent().end).toBeNull();
      });

      it('drops dates a cached session still carries', () => {
        create(NoDateScreen, {
          start: new Date(2026, 9, 1).toISOString(),
          end: new Date(2026, 9, 13).toISOString(),
        });
        expect(lastSent().start).toBeNull();
        expect(lastSent().end).toBeNull();
      });

      it('ignores a pick if the template still renders a chip', () => {
        const s = create(NoDateScreen, null);
        const before = fakeService.criteria.length;
        s.onDateRangeChange({
          start: new Date(2026, 9, 1), end: new Date(2026, 9, 13),
          presetKey: 'this_month', labelKey: 'date_preset_this_month', label: '',
        });
        s.setDateRange(new Date(2026, 9, 1), new Date(2026, 9, 13));
        expect(fakeService.criteria.length).toBe(before);
        expect(s.criteria().start).toBeNull();
        expect(s.dateRange().presetKey).toBe('all_time');
      });

      it('sends no dates after clear()', () => {
        const s = create(NoDateScreen, null);
        s.clear();
        expect(lastSent().start).toBeNull();
        expect(lastSent().end).toBeNull();
      });
    });
  });

  describe('delete confirmation', () => {
    type Hook = (id: any) => Observable<any> | Promise<any> | undefined;

    @Component({ template: '', standalone: true })
    class HookScreen extends AbstractSearchScreenV2<{ id: string; title: string }> {
      hook: Hook | null = null;
      protected override getConfig() {
        return TestConfig;
      }
      protected override getDeleteConfirmName(id: any) {
        return this.items().find((r) => r.id === id)?.title;
      }
      protected override getDeleteConfirmOptions(id: any) {
        return this.hook ? this.hook(id) : super.getDeleteConfirmOptions(id);
      }
    }

    let confirms: any[];
    let toasts: number;

    function create(): HookScreen {
      TestBed.resetTestingModule();
      sessionStorage.clear();
      localStorage.clear();
      fakeService = new FakeSearchClient();
      confirms = [];
      toasts = 0;
      TestBed.configureTestingModule({
        imports: [HookScreen],
        providers: [
          provideRouter([]),
          { provide: FakeSearchClient, useValue: fakeService },
          {
            provide: CacheService,
            useValue: { configure() { /* no-op */ }, getCache: () => null, setCache() { /* no-op */ } },
          },
          { provide: ToastService, useValue: { showSuccess: () => { toasts++; }, showError() { /* no-op */ } } },
          { provide: ConfirmDialogService, useValue: { confirm: (o: any) => { confirms.push(o); } } },
          {
            provide: SCREEN_REF_DATA_SERVICE,
            useValue: {
              getReference: () => signal([]),
              hasReference: () => false,
              loadReferenceKeys: async () => { /* no-op */ },
              loadStaticRefs: async () => { /* no-op */ },
              refreshKeys: async () => { /* no-op */ },
              invalidateKeys: async () => { /* no-op */ },
            },
          },
        ],
      });
      const f = TestBed.createComponent(HookScreen);
      f.detectChanges();
      fakeService.calls[0].next({ items: [{ id: 'c1', title: 'Promos' }], totalCount: 1 });
      fakeService.calls[0].complete();
      return f.componentInstance;
    }

    it('opens the delete confirm at once, named after the row, when no hook is given', () => {
      const s = create();
      s.delete('c1');
      expect(confirms.length).toBe(1);
      expect(confirms[0].intent).toBe('delete');
      expect(confirms[0].name).toBe('Promos');
      expect(confirms[0].messageKey).toBeUndefined();
    });

    it('accepting deletes through the service, searches again and toasts', () => {
      const s = create();
      s.delete('c1');
      const before = fakeService.criteria.length;
      confirms[0].accept();
      expect(fakeService.deleted).toEqual(['c1']);
      expect(fakeService.criteria.length).toBe(before + 1);
      expect(toasts).toBe(1);
    });

    it('waits for an Observable hook and merges its options over the defaults', () => {
      const s = create();
      const impact = new Subject<any>();
      s.hook = () => impact.asObservable();
      s.delete('c1');
      expect(confirms.length).toBe(0);
      impact.next({ messageKey: 'impact_message', messageParams: { count: 3 } });
      impact.complete();
      expect(confirms.length).toBe(1);
      expect(confirms[0].intent).toBe('delete');
      expect(confirms[0].name).toBe('Promos');
      expect(confirms[0].messageKey).toBe('impact_message');
      expect(confirms[0].messageParams).toEqual({ count: 3 });
    });

    it('keeps the base accept body when a hook returns options', () => {
      const s = create();
      s.hook = () => of({ messageKey: 'impact_message', accept: () => { throw new Error('not used'); } });
      s.delete('c1');
      confirms[0].accept();
      expect(fakeService.deleted).toEqual(['c1']);
      expect(toasts).toBe(1);
    });

    it('lets the hook rename the row', () => {
      const s = create();
      s.hook = () => of({ name: 'Other name' });
      s.delete('c1');
      expect(confirms[0].name).toBe('Other name');
    });

    it('accepts a Promise hook', async () => {
      const s = create();
      s.hook = () => Promise.resolve({ messageKey: 'impact_message' });
      s.delete('c1');
      await Promise.resolve();
      await Promise.resolve();
      expect(confirms.length).toBe(1);
      expect(confirms[0].messageKey).toBe('impact_message');
    });

    it('opens no confirm when the hook fails, and deletes nothing', () => {
      const s = create();
      s.hook = () => throwError(() => new Error('403'));
      s.delete('c1');
      expect(confirms.length).toBe(0);
      expect(fakeService.deleted).toEqual([]);
    });

    it('opens no confirm when the hook completes without a value', () => {
      const s = create();
      const empty = new Subject<any>();
      s.hook = () => empty.asObservable();
      s.delete('c1');
      empty.complete();
      expect(confirms.length).toBe(0);
    });

    it('asks the hook only for the first value of a long-lived stream', () => {
      const s = create();
      const stream = new Subject<any>();
      s.hook = () => stream.asObservable();
      s.delete('c1');
      stream.next({ messageKey: 'a' });
      stream.next({ messageKey: 'b' });
      expect(confirms.length).toBe(1);
      expect(confirms[0].messageKey).toBe('a');
    });

    it('passes the row id to the hook', () => {
      const s = create();
      const seen: any[] = [];
      s.hook = (id) => { seen.push(id); return of({}); };
      s.delete('c1');
      expect(seen).toEqual(['c1']);
    });
  });
});
