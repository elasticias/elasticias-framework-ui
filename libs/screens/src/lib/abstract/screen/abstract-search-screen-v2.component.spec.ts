import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});
