import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CacheService, ConfirmDialogService, ToastService } from '@elasticias/core';
import { Permissions } from '@elasticias/types';
import { StorageUtils } from '@elasticias/utils';
import { AbstractDetailScreenV2 } from './abstract-detail-screen-v2.component';
import { ScreenConfig } from '../../config/screen-config';
import { SCREEN_REF_DATA_SERVICE } from '../../services/screen-reference-data.service';

class FakeDetailClient {
  get() {
    return of({});
  }
  update() {
    return of({});
  }
  create() {
    return of({});
  }
}

class TestConfig extends ScreenConfig {
  static SCREEN = 'TestDetailItem';
  static SERVICE: any = FakeDetailClient;
}

@Component({ template: '', standalone: true })
class TestDetailScreen extends AbstractDetailScreenV2<{ id: string }> {
  protected override getConfig() {
    return TestConfig;
  }
}

describe('AbstractDetailScreenV2 keyboard shortcut', () => {
  let fixture: ComponentFixture<TestDetailScreen>;
  let screen: TestDetailScreen;

  function fireModS(target: Element): void {
    const isMac = /mac/i.test(navigator.platform ?? '');
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        code: 'KeyS',
        key: 's',
        metaKey: isMac,
        ctrlKey: !isMac,
      }),
    );
  }

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    // The save shortcut is gated on the write grant; a new record needs Create.
    StorageUtils.setSession('CURRENT_USER_GRANTS', {
      TestDetailItem: { permissions: [Permissions.Read, Permissions.Create] },
    });
    await TestBed.configureTestingModule({
      imports: [TestDetailScreen],
      providers: [
        provideRouter([]),
        { provide: FakeDetailClient, useValue: new FakeDetailClient() },
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

    fixture = TestBed.createComponent(TestDetailScreen);
    screen = fixture.componentInstance;
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  it('registers mod+s and runs save() even while a form field has focus', () => {
    // Stubbed out: this test is only about the shortcut reaching save(),
    // not about the create/navigate side effects a real save triggers.
    const saveSpy = vi.spyOn(screen, 'save').mockImplementation(() => undefined);

    // Every field in a real detail form is inside the screen: the save
    // shortcut has to reach save() from exactly this state, or the
    // browser's own Save Page dialog opens instead.
    const input = document.createElement('input');
    fixture.nativeElement.appendChild(input);
    input.focus();

    fireModS(input);

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('unregisters its own instance without touching a sibling still alive', () => {
    const second = TestBed.createComponent(TestDetailScreen);
    second.detectChanges();
    document.body.appendChild(second.nativeElement);

    const secondSaveSpy = vi
      .spyOn(second.componentInstance, 'save')
      .mockImplementation(() => undefined);

    fixture.destroy();

    fireModS(document.body);

    expect(secondSaveSpy).toHaveBeenCalledTimes(1);

    second.nativeElement.remove();
  });
});

type Mode = 'new' | 'edit' | 'duplicate';

const fakeRefData = {
  getReference: () => signal([]),
  hasReference: () => false,
  loadReferenceKeys: async () => { /* no-op */ },
  loadStaticRefs: async () => { /* no-op */ },
  refreshKeys: async () => { /* no-op */ },
  invalidateKeys: async () => { /* no-op */ },
};

function routeFor(mode: Mode) {
  const params = mode === 'new' ? {} : { id: '42' };
  const query = mode === 'duplicate' ? { mode: 'duplicate' } : {};
  return {
    paramMap: of(convertToParamMap(params)),
    queryParamMap: of(convertToParamMap(query)),
    snapshot: { queryParamMap: convertToParamMap(query) },
  };
}

describe('AbstractDetailScreenV2 write gating', () => {
  let client: FakeDetailClient;
  let confirmSpy: ReturnType<typeof vi.fn>;

  async function create(
    mode: Mode,
    permissions: Permissions[],
  ): Promise<ComponentFixture<TestDetailScreen>> {
    sessionStorage.clear();
    localStorage.clear();
    StorageUtils.setSession('CURRENT_USER_GRANTS', { TestDetailItem: { permissions } });
    client = new FakeDetailClient();
    confirmSpy = vi.fn();
    await TestBed.configureTestingModule({
      imports: [TestDetailScreen],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeFor(mode) },
        { provide: FakeDetailClient, useValue: client },
        {
          provide: CacheService,
          useValue: { configure() { /* no-op */ }, getCache: () => null, setCache() { /* no-op */ } },
        },
        { provide: ToastService, useValue: { showSuccess() { /* no-op */ }, showError() { /* no-op */ } } },
        { provide: ConfirmDialogService, useValue: { confirm: confirmSpy } },
        { provide: SCREEN_REF_DATA_SERVICE, useValue: fakeRefData },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(TestDetailScreen);
    fixture.detectChanges();
    return fixture;
  }

  const R = [Permissions.Read];
  const RC = [Permissions.Read, Permissions.Create];
  const RE = [Permissions.Read, Permissions.Edit];

  const matrix: Array<[Mode, string, Permissions[], boolean]> = [
    ['new', 'Read', R, false],
    ['new', 'Read+Create', RC, true],
    ['new', 'Read+Edit', RE, false],
    ['edit', 'Read', R, false],
    ['edit', 'Read+Create', RC, false],
    ['edit', 'Read+Edit', RE, true],
    ['duplicate', 'Read', R, false],
    ['duplicate', 'Read+Create', RC, true],
    ['duplicate', 'Read+Edit', RE, false],
  ];

  it.each(matrix)('%s with %s -> canWrite %s', async (mode, _label, perms, expected) => {
    const screen = (await create(mode, perms)).componentInstance;
    expect(screen.canWrite()).toBe(expected);
    expect(screen.readOnlyMode()).toBe(!expected);
  });

  it('is read-only when the grants blob has no entry for the screen', async () => {
    const screen = (await create('new', [])).componentInstance;
    expect(screen.canWrite()).toBe(false);
  });

  it('follows a mode switch on the same instance', async () => {
    const screen = (await create('edit', RE)).componentInstance;
    expect(screen.canWrite()).toBe(true);
    screen.duplicateMode.set(true);
    expect(screen.canWrite()).toBe(false);
  });

  it('exposes canWrite on the ScreenContext for the toolbar', async () => {
    const screen = (await create('new', RC)).componentInstance;
    expect(screen.context.canWrite?.()).toBe(true);
  });

  it('does not save, nor call beforeSave, when it cannot write', async () => {
    const screen = (await create('edit', R)).componentInstance;
    const beforeSave = vi.spyOn(screen as any, 'beforeSave');
    const update = vi.spyOn(client, 'update');
    const createOp = vi.spyOn(client, 'create');
    screen.save();
    expect(beforeSave).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(createOp).not.toHaveBeenCalled();
  });

  it('mod+s does not reach the backend without the write grant', async () => {
    const fixture = await create('new', R);
    const createOp = vi.spyOn(client, 'create');
    document.body.appendChild(fixture.nativeElement);
    const isMac = /mac/i.test(navigator.platform ?? '');
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true, cancelable: true, code: 'KeyS', key: 's', metaKey: isMac, ctrlKey: !isMac,
      }),
    );
    expect(createOp).not.toHaveBeenCalled();
    fixture.nativeElement.remove();
  });

  it('saves when it can write', async () => {
    const screen = (await create('edit', RE)).componentInstance;
    const update = vi.spyOn(client, 'update');
    screen.save();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('creates when it can write a new record', async () => {
    const screen = (await create('new', RC)).componentInstance;
    const createOp = vi.spyOn(client, 'create');
    screen.save();
    expect(createOp).toHaveBeenCalledTimes(1);
  });

  it('does not open the delete confirmation without Delete', async () => {
    const screen = (await create('edit', RE)).componentInstance;
    screen.delete();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('opens the delete confirmation with Delete', async () => {
    const screen = (await create('edit', [Permissions.Read, Permissions.Delete])).componentInstance;
    screen.delete();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it('does not navigate to duplicate without Create', async () => {
    const screen = (await create('edit', [Permissions.Read, Permissions.Edit, Permissions.Duplicate]))
      .componentInstance;
    const router = TestBed.inject(Router);
    screen.duplicate();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('navigates to duplicate with Create', async () => {
    const screen = (await create('edit', [Permissions.Read, Permissions.Create])).componentInstance;
    const router = TestBed.inject(Router);
    screen.duplicate();
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });
});
