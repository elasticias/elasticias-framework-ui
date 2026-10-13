import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { CacheService, ConfirmDialogService, ToastService } from '@elasticias/core';
import {
  AbstractDetailScreenV2,
  EfDetailToolbarAction,
  SCREEN_REF_DATA_SERVICE,
  ScreenConfig,
} from '@elasticias/screens';
import { Permissions } from '@elasticias/types';
import { StorageUtils } from '@elasticias/utils';
import { EfDetailToolbarComponent } from './ef-detail-toolbar.component';

class FakeClient {
  get() { return of({}); }
  update() { return of({}); }
  create() { return of({}); }
}

class HostConfig extends ScreenConfig {
  static SCREEN = 'ToolbarHostScreen';
  static SERVICE: any = FakeClient;
}

/** A real detail screen rendering the real toolbar: the toolbar sees the
 *  context as early as the abstract's first change detection, so this is
 *  what proves Save follows the grant in an app, not only in isolation. */
@Component({
  standalone: true,
  imports: [EfDetailToolbarComponent],
  template: `<ef-detail-toolbar [context]="context" [customActions]="customActions()" />`,
})
class HostDetailScreen extends AbstractDetailScreenV2<{ id: string }> {
  override getConfig() {
    return HostConfig;
  }
  protected override getCustomActions(): EfDetailToolbarAction[] {
    return [
      ...super.getCustomActions(),
      { id: 'approve', label: 'Approve', icon: 'pi pi-check', requiresWrite: true },
    ];
  }
}

describe('ef-detail-toolbar inside an AbstractDetailScreenV2', () => {
  async function render(permissions: Permissions[]): Promise<ComponentFixture<HostDetailScreen>> {
    sessionStorage.clear();
    localStorage.clear();
    StorageUtils.setSession('CURRENT_USER_GRANTS', { ToolbarHostScreen: { permissions } });
    await TestBed.configureTestingModule({
      imports: [HostDetailScreen, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '42' })),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        { provide: FakeClient, useValue: new FakeClient() },
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
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(HostDetailScreen);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  function el(fixture: ComponentFixture<HostDetailScreen>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('hides Save and the requiresWrite action for a Read-only user on an existing record', async () => {
    const fixture = await render([Permissions.Read]);
    expect(el(fixture).querySelector('ef-button[icon="pi pi-save"]')).toBeNull();
    expect(el(fixture).textContent).not.toContain('Approve');
  });

  it('shows Save and the requiresWrite action with Edit on an existing record', async () => {
    const fixture = await render([Permissions.Read, Permissions.Edit]);
    expect(el(fixture).querySelector('ef-button[icon="pi pi-save"]')).not.toBeNull();
    expect(el(fixture).textContent).toContain('Approve');
  });
});
