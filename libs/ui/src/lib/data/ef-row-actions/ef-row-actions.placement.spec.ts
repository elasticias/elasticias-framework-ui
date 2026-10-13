import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfRowActionsComponent } from './ef-row-actions.component';

/**
 * The menu is fixed to the viewport, placed from the trigger's rect, so a
 * table's horizontal scroller (overflow-x: auto, which also clips on the
 * block axis) cannot cut it off.
 */
describe('EfRowActionsComponent placement', () => {
    let fixture: ComponentFixture<EfRowActionsComponent>;
    let component: EfRowActionsComponent;
    let scroller: HTMLElement;

    const VW = 1000;
    const VH = 800;

    function triggerAt(rect: { left: number; top: number; width?: number; height?: number }) {
        const width = rect.width ?? 34;
        const height = rect.height ?? 28;
        const r = {
            left: rect.left,
            top: rect.top,
            right: rect.left + width,
            bottom: rect.top + height,
            width,
            height,
            x: rect.left,
            y: rect.top,
            toJSON: () => ({}),
        } as DOMRect;
        vi.spyOn(fixture.nativeElement as HTMLElement, 'getBoundingClientRect').mockReturnValue(r);
        const trigger = (fixture.nativeElement as HTMLElement).querySelector('.row-actions__trigger') as HTMLElement;
        vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(r);
    }

    function menu(): HTMLElement | null {
        return (fixture.nativeElement as HTMLElement).querySelector('.row-actions__menu');
    }

    function open(): void {
        component.toggle(new MouseEvent('click'));
        fixture.detectChanges();
    }

    beforeEach(async () => {
        vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(VW);
        vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(VH);

        await TestBed.configureTestingModule({
            imports: [EfRowActionsComponent, TranslateModule.forRoot()],
        }).compileComponents();

        fixture = TestBed.createComponent(EfRowActionsComponent);
        component = fixture.componentInstance;
        scroller = document.createElement('div');
        scroller.className = 'tbl-scroll';
        scroller.appendChild(fixture.nativeElement);
        document.body.appendChild(scroller);

        fixture.componentRef.setInput('items', [
            { id: 'view', labelKey: 'common_view', command: () => undefined },
            { id: 'edit', labelKey: 'common_edit', command: () => undefined },
        ]);
        fixture.detectChanges();
    });

    afterEach(() => {
        scroller.remove();
        document.documentElement.removeAttribute('dir');
        vi.restoreAllMocks();
    });

    it('fixes the menu below the trigger, aligned to its inline end', () => {
        triggerAt({ left: 900, top: 100 });
        open();
        const m = menu()!;
        expect(m.classList).toContain('is-floating');
        expect(m.style.top).toBe('136px'); // 100 + 28 + 8
        expect(m.style.right).toBe('66px'); // 1000 - 934
        expect(m.style.left).toBe('auto');
        expect(m.style.bottom).toBe('auto');
    });

    it('opens above the trigger when there is no room below', () => {
        triggerAt({ left: 900, top: 760 });
        open();
        const m = menu()!;
        expect(m.classList).toContain('up');
        expect(m.style.bottom).toBe('48px'); // 800 - 760 + 8
        expect(m.style.top).toBe('auto');
    });

    it('aligns to the left edge in a right-to-left page', () => {
        document.documentElement.setAttribute('dir', 'rtl');
        triggerAt({ left: 40, top: 100 });
        open();
        const m = menu()!;
        expect(m.style.left).toBe('40px');
        expect(m.style.right).toBe('auto');
    });

    it('aligns to the inline start with menuLeft', () => {
        fixture.componentRef.setInput('menuLeft', true);
        fixture.detectChanges();
        triggerAt({ left: 40, top: 100 });
        open();
        expect(menu()!.style.left).toBe('40px');
    });

    it('closes when an ancestor scrolls, since a fixed menu would float away from its row', () => {
        triggerAt({ left: 900, top: 100 });
        open();
        scroller.dispatchEvent(new Event('scroll'));
        fixture.detectChanges();
        expect(component.open()).toBe(false);
        expect(menu()).toBeNull();
    });

    it('stays open when the scroll comes from inside the menu', () => {
        triggerAt({ left: 900, top: 100 });
        open();
        menu()!.dispatchEvent(new Event('scroll'));
        expect(component.open()).toBe(true);
    });

    it('closes when the viewport width changes', () => {
        triggerAt({ left: 900, top: 100 });
        open();
        vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(VW - 200);
        window.dispatchEvent(new Event('resize'));
        expect(component.open()).toBe(false);
    });

    it('stays open on a height-only resize (an on-screen keyboard or a browser toolbar)', () => {
        triggerAt({ left: 900, top: 100 });
        open();
        vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(VH - 300);
        window.dispatchEvent(new Event('resize'));
        expect(component.open()).toBe(true);
    });

    it('caps its height to the room below, and scrolls inside', () => {
        triggerAt({ left: 900, top: 100 });
        open();
        expect(menu()!.style.maxHeight).toBe('656px'); // 800 - (128 + 8) - 8
    });

    it('caps its height to the room above when it opens upward', () => {
        triggerAt({ left: 900, top: 760 });
        open();
        expect(menu()!.style.maxHeight).toBe('744px'); // 760 - 8 - 8
    });

    it('closes on Escape', () => {
        triggerAt({ left: 900, top: 100 });
        open();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        fixture.detectChanges();
        expect(component.open()).toBe(false);
        expect(menu()).toBeNull();
    });

    it('announces a close and stops listening when destroyed while open', () => {
        triggerAt({ left: 900, top: 100 });
        open();
        const toggles: boolean[] = [];
        scroller.addEventListener('ef-row-actions-toggle', e => toggles.push((e as CustomEvent<{ open: boolean }>).detail.open));
        const removed = vi.spyOn(document, 'removeEventListener');
        fixture.destroy();
        expect(toggles).toEqual([false]);
        expect(removed).toHaveBeenCalledWith('scroll', expect.any(Function), { capture: true });
    });

    it('stops listening once closed', () => {
        triggerAt({ left: 900, top: 100 });
        open();
        component.close();
        const closed = vi.fn();
        component.closed.subscribe(closed);
        scroller.dispatchEvent(new Event('scroll'));
        expect(closed).not.toHaveBeenCalled();
    });
});
