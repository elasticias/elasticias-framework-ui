import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { ScreenContext } from '@elasticias/screens';
import { Permissions } from '@elasticias/types';
import { EfDetailToolbarComponent } from './ef-detail-toolbar.component';
import { EfDetailToolbarAction } from './ef-detail-toolbar.types';

/**
 * On a phone, once the actions outnumber `overflowAfter`, Save stays in view
 * and every other action moves into a kebab menu (the shared ef-row-actions
 * menu). Write gating and permissions are decided before the split, so a
 * hidden action is hidden in the menu too.
 */
describe('EfDetailToolbarComponent mobile overflow', () => {
  const actions: EfDetailToolbarAction[] = [
    { id: 'activate', labelKey: 'activate', requiresWrite: true },
    { id: 'archive', labelKey: 'archive', requiresWrite: true },
    { id: 'preview', labelKey: 'preview' },
  ];

  function ctx(canWrite: boolean): ScreenContext {
    const c = new ScreenContext('DETAIL', undefined, undefined, undefined, undefined, [
      Permissions.Read,
      Permissions.Delete,
    ]);
    c.canWrite = signal(canWrite);
    return c;
  }

  async function make(mobile: boolean, inputs: Record<string, unknown> = {}) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [EfDetailToolbarComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: EfViewportService,
          useValue: {
            current: signal(mobile ? 'mobile' : 'desktop'),
            isMobile: signal(mobile),
            isTablet: signal(false),
            isDesktop: signal(!mobile),
          },
        },
      ],
    }).compileComponents();
    const fixture: ComponentFixture<EfDetailToolbarComponent> = TestBed.createComponent(EfDetailToolbarComponent);
    fixture.componentRef.setInput('customActions', actions);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
  }

  const inlineButtons = (el: HTMLElement) => el.querySelectorAll('.right > ef-button, .right > .std > ef-button');
  const trigger = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('.row-actions__trigger');
  const menuLabels = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('.row-actions__item .lbl')).map((n) => n.textContent?.trim());

  it('keeps every action inline on a desktop', async () => {
    const { el } = await make(false, { context: ctx(true) });
    expect(trigger(el)).toBeNull();
    expect(inlineButtons(el).length).toBe(4); // 3 custom + save
  });

  it('keeps few actions inline on a phone', async () => {
    const { el } = await make(true, { customActions: [actions[2]], overflowAfter: 3 });
    expect(trigger(el)).toBeNull();
    expect(inlineButtons(el).length).toBe(2);
  });

  it('moves everything but Save into a menu on a phone when they do not fit', async () => {
    const { el, cmp } = await make(true, { context: ctx(true), showDeleteAction: true });
    expect(cmp.overflowing()).toBe(true);
    expect(inlineButtons(el).length).toBe(1); // Save only
    const t = trigger(el)!;
    expect(t).not.toBeNull();
    expect(t.getAttribute('aria-haspopup')).toBe('menu');
    expect(t.getAttribute('aria-expanded')).toBe('false');
  });

  it('lists the actions in order in the menu once opened', async () => {
    const { fixture, el } = await make(true, { context: ctx(true), showDeleteAction: true });
    trigger(el)!.click();
    fixture.detectChanges();
    expect(el.querySelector('[role="menu"]')).not.toBeNull();
    expect(menuLabels(el)).toEqual(['activate', 'archive', 'preview', 'common_delete']);
  });

  it('runs the action, emits customAction and closes the menu on pick', async () => {
    const command = vi.fn();
    const custom: EfDetailToolbarAction[] = [
      { id: 'a', labelKey: 'a', command },
      { id: 'b', labelKey: 'b' },
      { id: 'c', labelKey: 'c' },
    ];
    const { fixture, el, cmp } = await make(true, { customActions: custom });
    const emitted: EfDetailToolbarAction[] = [];
    cmp.customAction.subscribe((a) => emitted.push(a));
    trigger(el)!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.row-actions__item')!.click();
    fixture.detectChanges();
    expect(command).toHaveBeenCalledTimes(1);
    expect(emitted.map((a) => a.id)).toEqual(['a']);
    expect(el.querySelector('[role="menu"]')).toBeNull();
  });

  it('passes the disabled reason of an action to the menu', async () => {
    const custom: EfDetailToolbarAction[] = [
      { id: 'a', labelKey: 'a', disabled: true, disabledReasonKey: 'why_a' },
      { id: 'b', labelKey: 'b' },
      { id: 'c', labelKey: 'c' },
    ];
    const { fixture, el } = await make(true, { customActions: custom });
    trigger(el)!.click();
    fixture.detectChanges();
    expect(el.querySelector('.row-actions__item .reason')?.textContent?.trim()).toBe('why_a');
  });

  it('emits the standard outputs from the menu', async () => {
    const { fixture, el, cmp } = await make(true, {
      context: ctx(true),
      showDeleteAction: true,
    });
    const fired: string[] = [];
    cmp.delete.subscribe(() => fired.push('delete'));
    trigger(el)!.click();
    fixture.detectChanges();
    const items = Array.from(el.querySelectorAll<HTMLButtonElement>('.row-actions__item'));
    items[items.length - 1].click();
    expect(fired).toEqual(['delete']);
  });

  it('does not run a disabled action from the menu', async () => {
    const command = vi.fn();
    const custom: EfDetailToolbarAction[] = [
      { id: 'a', labelKey: 'a', disabled: true, command },
      { id: 'b', labelKey: 'b' },
      { id: 'c', labelKey: 'c' },
    ];
    const { fixture, el } = await make(true, { customActions: custom });
    trigger(el)!.click();
    fixture.detectChanges();
    const first = el.querySelector<HTMLButtonElement>('.row-actions__item')!;
    expect(first.getAttribute('aria-disabled')).toBe('true');
    first.click();
    expect(command).not.toHaveBeenCalled();
  });

  it('still hides requiresWrite actions and Save inside the menu without write', async () => {
    const { fixture, el, cmp } = await make(true, { context: ctx(false), showDeleteAction: true });
    // preview + delete remain; Save is hidden. 2 actions fit: no menu.
    expect(cmp.overflowing()).toBe(false);
    expect(trigger(el)).toBeNull();
    fixture.componentRef.setInput('customActions', [
      ...actions,
      { id: 'more', labelKey: 'more' },
      { id: 'more2', labelKey: 'more2' },
    ]);
    fixture.detectChanges();
    expect(trigger(el)).not.toBeNull();
    trigger(el)!.click();
    fixture.detectChanges();
    const labels = menuLabels(el);
    expect(labels).not.toContain('activate');
    expect(labels).not.toContain('archive');
    expect(labels).toContain('preview');
    // no Save inline either
    expect(el.querySelector('ef-button[icon="pi pi-save"]')).toBeNull();
  });

  it('follows the viewport tier as it changes', async () => {
    const { fixture, el } = await make(true, { context: ctx(true) });
    expect(trigger(el)).not.toBeNull();
    const vp = TestBed.inject(EfViewportService) as unknown as { isMobile: ReturnType<typeof signal<boolean>> };
    vp.isMobile.set(false);
    fixture.detectChanges();
    expect(trigger(el)).toBeNull();
  });

  it('keeps a keepInView action inline beside Save and out of the menu', async () => {
    const custom: EfDetailToolbarAction[] = [
      { id: 'a', labelKey: 'a' },
      { id: 'b', labelKey: 'b' },
      { id: 'next', labelKey: 'next', keepInView: true, severity: 'primary' },
      { id: 'c', labelKey: 'c' },
    ];
    const { fixture, el, cmp } = await make(true, { customActions: custom });
    expect(cmp.overflowing()).toBe(true);
    const inline = Array.from(inlineButtons(el)).map((b) => b.getAttribute('ng-reflect-label-key') ?? b.textContent?.trim());
    expect(inline.length).toBe(2); // the kept action + Save
    expect(inline[0]).toContain('next');
    trigger(el)!.click();
    fixture.detectChanges();
    expect(menuLabels(el)).toEqual(['a', 'b', 'c']);
  });

  it('does not keep in view an action its permission hides', async () => {
    const custom: EfDetailToolbarAction[] = [
      { id: 'a', labelKey: 'a' },
      { id: 'b', labelKey: 'b' },
      { id: 'next', labelKey: 'next', keepInView: true, requiresWrite: true },
      { id: 'c', labelKey: 'c' },
      { id: 'd', labelKey: 'd' },
    ];
    const { el } = await make(true, { customActions: custom, context: ctx(false) });
    expect(Array.from(inlineButtons(el)).some((b) => b.textContent?.includes('next'))).toBe(false);
  });

  it('names every inline button, even when the phone hides its label', async () => {
    const custom: EfDetailToolbarAction[] = [{ id: 'next', labelKey: 'next', keepInView: true }];
    const { el } = await make(true, { customActions: custom, context: ctx(true) });
    const buttons = Array.from(el.querySelectorAll<HTMLElement>('.right .btn'));
    expect(buttons.length).toBe(2);
    for (const b of buttons) expect(b.getAttribute('aria-label'), b.outerHTML).toBeTruthy();
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['next', 'common_save']);
  });

  it('marks a keepInView action so the phone keeps its visible label', async () => {
    const custom: EfDetailToolbarAction[] = [
      { id: 'a', labelKey: 'a' },
      { id: 'b', labelKey: 'b' },
      { id: 'next', labelKey: 'next', keepInView: true },
      { id: 'c', labelKey: 'c' },
    ];
    const { el } = await make(true, { customActions: custom });
    const kept = el.querySelector<HTMLElement>('.right .btn.btn--keep-label');
    expect(kept).not.toBeNull();
    expect(kept!.textContent).toContain('next');
    // Save stays icon-only beside it.
    expect(el.querySelectorAll('.right .btn.btn--keep-label').length).toBe(1);
  });

  it('names the trigger for assistive tech', async () => {
    const { el } = await make(true, { context: ctx(true) });
    expect(trigger(el)!.getAttribute('aria-label')).toBe('common_actions');
  });
});
