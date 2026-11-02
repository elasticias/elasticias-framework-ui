import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ScreenContext } from '@elasticias/screens';
import { Permissions } from '@elasticias/types';
import { EfDetailToolbarComponent } from './ef-detail-toolbar.component';
import { EfDetailToolbarAction } from './ef-detail-toolbar.types';

describe('EfDetailToolbarComponent write gating', () => {
  let fixture: ComponentFixture<EfDetailToolbarComponent>;
  let component: EfDetailToolbarComponent;

  function contextWith(canWrite?: boolean): ScreenContext {
    const ctx = new ScreenContext('DETAIL', undefined, undefined, undefined, undefined, [
      Permissions.Read,
    ]);
    if (canWrite !== undefined) ctx.canWrite = signal(canWrite);
    return ctx;
  }

  const actions: EfDetailToolbarAction[] = [
    { id: 'approve', labelKey: 'approve', requiresWrite: true },
    { id: 'preview', labelKey: 'preview' },
  ];

  function ids(): string[] {
    return component.visibleCustomActions().map((a) => a.id as string);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfDetailToolbarComponent, TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(EfDetailToolbarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('customActions', actions);
  });

  it('hides Save when the context says the screen cannot write', () => {
    fixture.componentRef.setInput('context', contextWith(false));
    fixture.detectChanges();
    expect(component.canSave()).toBe(false);
    expect(fixture.nativeElement.querySelector('ef-button[icon="pi pi-save"]')).toBeNull();
  });

  it('shows Save when the context says the screen can write', () => {
    fixture.componentRef.setInput('context', contextWith(true));
    fixture.detectChanges();
    expect(component.canSave()).toBe(true);
  });

  it('follows the canWrite signal as it changes', () => {
    const ctx = contextWith(true);
    fixture.componentRef.setInput('context', ctx);
    fixture.detectChanges();
    expect(component.canSave()).toBe(true);
    (ctx.canWrite as ReturnType<typeof signal<boolean>>).set(false);
    fixture.detectChanges();
    expect(component.canSave()).toBe(false);
    expect(ids()).toEqual(['preview']);
  });

  it('keeps Save when no context is bound', () => {
    fixture.detectChanges();
    expect(component.canSave()).toBe(true);
  });

  it('keeps Save when the context carries no canWrite signal', () => {
    fixture.componentRef.setInput('context', contextWith(undefined));
    fixture.detectChanges();
    expect(component.canSave()).toBe(true);
  });

  it('still lets showSaveAction=false hide Save on a writable screen', () => {
    fixture.componentRef.setInput('context', contextWith(true));
    fixture.componentRef.setInput('showSaveAction', false);
    fixture.detectChanges();
    expect(component.canSave()).toBe(false);
  });

  it('hides a requiresWrite custom action when the screen cannot write', () => {
    fixture.componentRef.setInput('context', contextWith(false));
    fixture.detectChanges();
    expect(ids()).toEqual(['preview']);
  });

  it('shows a requiresWrite custom action when the screen can write', () => {
    fixture.componentRef.setInput('context', contextWith(true));
    fixture.detectChanges();
    expect(ids()).toEqual(['approve', 'preview']);
  });

  it('shows a requiresWrite custom action when write state is unknown', () => {
    fixture.componentRef.setInput('context', contextWith(undefined));
    fixture.detectChanges();
    expect(ids()).toEqual(['approve', 'preview']);
  });

  describe('Duplicate', () => {
    function withGrants(grants: Permissions[]): void {
      fixture.componentRef.setInput(
        'context',
        new ScreenContext('DETAIL', undefined, undefined, undefined, undefined, grants),
      );
      fixture.componentRef.setInput('showDuplicateAction', true);
      fixture.detectChanges();
    }

    it('is hidden with Read+Duplicate, since a duplicate is saved through create', () => {
      withGrants([Permissions.Read, Permissions.Duplicate]);
      expect(component.canDuplicate()).toBe(false);
      expect(fixture.nativeElement.querySelector('ef-button[icon="pi pi-clone"]')).toBeNull();
    });

    it('is shown with Read+Duplicate+Create', () => {
      withGrants([Permissions.Read, Permissions.Duplicate, Permissions.Create]);
      expect(component.canDuplicate()).toBe(true);
      expect(fixture.nativeElement.querySelector('ef-button[icon="pi pi-clone"]')).not.toBeNull();
    });

    it('is shown when no context is bound', () => {
      fixture.componentRef.setInput('showDuplicateAction', true);
      fixture.detectChanges();
      expect(component.canDuplicate()).toBe(true);
    });
  });
});

describe('EfDetailToolbarComponent separator', () => {
  async function make() {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [EfDetailToolbarComponent, TranslateModule.forRoot()] }).compileComponents();
    const fixture = TestBed.createComponent(EfDetailToolbarComponent);
    fixture.componentRef.setInput('customActions', [{ id: 'a', labelKey: 'a' }, { id: 'b', labelKey: 'b' }]);
    fixture.detectChanges();
    return fixture;
  }
  const top = (el: Element, y: number) =>
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: y } as DOMRect);

  it('travels with the standard actions, and hides when they wrap to a row of their own', async () => {
    const fixture = await make();
    const el = fixture.nativeElement as HTMLElement;
    const std = el.querySelector('.right .std') as HTMLElement;
    expect(std).not.toBeNull();
    expect(std.querySelector('.sep')).not.toBeNull();

    // Same row as the first custom action: the separator stays.
    top(el.querySelector('.right')!.firstElementChild!, 10);
    top(std, 10);
    fixture.componentInstance.measureWrap();
    fixture.detectChanges();
    expect(el.querySelector('.sep')).not.toBeNull();

    // Save dropped to the next row: a leading "|" would dangle, so it goes.
    top(std, 50);
    fixture.componentInstance.measureWrap();
    fixture.detectChanges();
    const sep = el.querySelector('.sep') as HTMLElement;
    expect(sep).not.toBeNull();
    expect(sep.classList.contains('is-hidden')).toBe(true);
  });

  it('names a label-only custom action for assistive tech', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [EfDetailToolbarComponent, TranslateModule.forRoot()] }).compileComponents();
    const fixture = TestBed.createComponent(EfDetailToolbarComponent);
    fixture.componentRef.setInput('customActions', [{ id: 'x', label: 'Export now', icon: 'pi pi-download' }]);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.right button');
    expect(btn?.getAttribute('aria-label')).toBe('Export now');
  });
});
