import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { CacheService, ConfirmDialogService, ToastService } from '@elasticias/core';
import { AbstractSearchScreenV2 } from './abstract-search-screen-v2.component';
import { ScreenConfig } from '../../config/screen-config';
import { SCREEN_REF_DATA_SERVICE } from '../../services/screen-reference-data.service';

class FakeSearchClient {
  readonly calls: Subject<any>[] = [];
  search(_criteria: any) {
    const subject = new Subject<any>();
    this.calls.push(subject);
    return subject.asObservable();
  }
}

class TestConfig extends ScreenConfig {
  static SCREEN: string = 'TestSearchItems';
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
            configure() {},
            // Simulate a revisit: cached criteria carries a stale filter.
            getCache: () => ({ searchText: 'marjane' }),
            setCache() {},
          },
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
            useValue: { configure() {}, getCache: () => cached, setCache() {} },
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
});
