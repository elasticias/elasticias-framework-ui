import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StorageUtils } from '@elasticias/utils';
import { CacheService, ConfirmDialogService, ToastService } from '@elasticias/core';
import { AbstractSubScreenV2 } from './abstract-sub-screen-v2.component';
import { ScreenConfig } from '../../config/screen-config';
import { SCREEN_REF_DATA_SERVICE } from '../../services/screen-reference-data.service';

class FakeClient {}

class TestConfig extends ScreenConfig {
  static SCREEN = 'TestParentScreen';
  static SERVICE: any = FakeClient;
}

@Component({ template: '', standalone: true })
class TestSubScreen extends AbstractSubScreenV2 {
  override getConfig() {
    return TestConfig;
  }
  get service(): any {
    return this.serviceInstance;
  }
}

describe('AbstractSubScreenV2', () => {
  let fixture: ComponentFixture<TestSubScreen>;
  let screen: TestSubScreen;
  let fakeService: FakeClient;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    fakeService = new FakeClient();
    await TestBed.configureTestingModule({
      imports: [TestSubScreen],
      providers: [
        provideRouter([]),
        { provide: FakeClient, useValue: fakeService },
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
    fixture = TestBed.createComponent(TestSubScreen);
    screen = fixture.componentInstance;
  });

  it('starts collapsed and toggles', () => {
    fixture.detectChanges();
    expect(screen.collapsed()).toBe(true);
    screen.toggleCollapsed();
    expect(screen.collapsed()).toBe(false);
  });

  it('resolves the config SERVICE into serviceInstance', () => {
    fixture.detectChanges();
    expect(screen.service).toBe(fakeService);
  });

  it('denies canRead without a grant on the config SCREEN', () => {
    fixture.detectChanges();
    expect(screen.canRead()).toBe(false);
  });

  it('grants canRead from the config SCREEN code, not the host screen', () => {
    StorageUtils.setLocal('CURRENT_USER_GRANTS', {
      TestParentScreen: { permissions: ['Read'] },
    });
    fixture.detectChanges();
    expect(screen.canRead()).toBe(true);
  });
});
