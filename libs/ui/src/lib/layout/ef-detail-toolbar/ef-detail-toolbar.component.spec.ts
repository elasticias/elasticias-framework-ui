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
});
