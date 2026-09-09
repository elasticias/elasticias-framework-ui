import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CacheService, ConfirmDialogService, ToastService } from '@elasticias/core';
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
