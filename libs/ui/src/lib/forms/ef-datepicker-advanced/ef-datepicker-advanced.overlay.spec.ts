import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfDatepickerAdvancedComponent } from './ef-datepicker-advanced.component';
import { placeDpPanel } from './ef-datepicker-advanced.placement';

/**
 * The panel as an overlay: where it goes (flip above, stay inside the
 * viewport, mirror in RTL), that it lives outside the host, one open
 * picker at a time, and how it closes and hands focus back.
 */

const VW = 1512;
const VH = 900;
const PANEL_W = 340;
const PANEL_H = 420;

function rect(left: number, top: number, width = 440, height = 40): DOMRect {
    return {
        left, top, width, height,
        right: left + width, bottom: top + height,
        x: left, y: top, toJSON: () => ({}),
    } as DOMRect;
}

describe('placeDpPanel', () => {
    const viewport = { width: VW, height: VH };
    const panel = { width: PANEL_W, height: PANEL_H };

    it('opens below the trigger when there is room', () => {
        const p = placeDpPanel({ anchor: rect(500, 200), panel, viewport, rtl: false });
        expect(p.side).toBe('below');
        expect(p.top).toBe(248);
        expect(p.bottom).toBeNull();
        expect(p.left).toBe(500);
    });

    it('flips above a trigger near the bottom of the viewport', () => {
        const p = placeDpPanel({ anchor: rect(500, 780), panel, viewport, rtl: false });
        expect(p.side).toBe('above');
        expect(p.top).toBeNull();
        // Anchored by its bottom edge, 8px above the trigger.
        expect(p.bottom).toBe(VH - 780 + 8);
    });

    it('takes the roomier side and caps the height when neither side fits', () => {
        // 364px above, 464 below: below wins, capped to it.
        const p = placeDpPanel({ anchor: rect(500, 380), panel: { width: PANEL_W, height: 800 }, viewport, rtl: false });
        expect(p.side).toBe('below');
        expect(p.maxHeight).toBe(VH - 420 - 8 - 8);
    });

    it('caps the height to the room on the chosen side, so the panel scrolls inside', () => {
        const p = placeDpPanel({ anchor: rect(500, 500), panel: { width: PANEL_W, height: 800 }, viewport, rtl: false });
        // 484px above, 344 below: above wins, capped to it.
        expect(p.side).toBe('above');
        expect(p.maxHeight).toBe(500 - 8 - 8);
    });

    it('keeps the panel inside the viewport for a trigger at the right edge (LTR)', () => {
        const anchor = rect(VW - 200, 200, 190);
        const p = placeDpPanel({ anchor, panel, viewport, rtl: false });
        // Inline end of panel meets inline end of trigger.
        expect(p.left + PANEL_W).toBe(anchor.right);
        expect(p.left + PANEL_W).toBeLessThanOrEqual(VW - 8);
    });

    it('mirrors in RTL: inline start is the right edge', () => {
        const anchor = rect(800, 200, 440);
        const p = placeDpPanel({ anchor, panel, viewport, rtl: true });
        expect(p.left + PANEL_W).toBe(anchor.right);
    });

    it('mirrors in RTL: a trigger at the left edge aligns the panel to its left', () => {
        const anchor = rect(10, 200, 190);
        const p = placeDpPanel({ anchor, panel, viewport, rtl: true });
        expect(p.left).toBe(10);
        expect(p.left).toBeGreaterThanOrEqual(8);
    });

    it('shifts a panel wider than the space either side back inside the viewport', () => {
        const p = placeDpPanel({ anchor: rect(100, 200, 100), panel, viewport: { width: 400, height: VH }, rtl: false });
        expect(p.left).toBeGreaterThanOrEqual(8);
        expect(p.left + PANEL_W).toBeLessThanOrEqual(400 - 8);
    });
});

describe('EfDatepickerAdvancedComponent overlay', () => {
    const fixtures: ComponentFixture<EfDatepickerAdvancedComponent>[] = [];
    const panels = () => Array.from(document.body.querySelectorAll<HTMLElement>('.dp__panel'));

    function make(opts: { at?: DOMRect; container?: HTMLElement } = {}): ComponentFixture<EfDatepickerAdvancedComponent> {
        const f = TestBed.createComponent(EfDatepickerAdvancedComponent);
        f.componentRef.setInput('mode', 'field');
        f.componentRef.setInput('selectionMode', 'single');
        f.componentRef.setInput('labelKey', 'promotion_starts_at');
        f.detectChanges();
        (opts.container ?? document.body).appendChild(f.nativeElement);
        if (opts.at) vi.spyOn(trigger(f), 'getBoundingClientRect').mockReturnValue(opts.at);
        fixtures.push(f);
        return f;
    }

    const trigger = (f: ComponentFixture<EfDatepickerAdvancedComponent>) =>
        f.nativeElement.querySelector('.dp__field-trigger') as HTMLButtonElement;

    function open(f: ComponentFixture<EfDatepickerAdvancedComponent>): HTMLElement {
        trigger(f).click();
        f.detectChanges();
        return panels()[0];
    }

    beforeEach(async () => {
        vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(VW);
        vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(VH);
        // jsdom has no layout: give the panel a natural size.
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
            return this.classList.contains('dp__panel') ? PANEL_W : 0;
        });
        vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
            return this.classList.contains('dp__panel') ? PANEL_H : 0;
        });

        await TestBed.configureTestingModule({
            imports: [EfDatepickerAdvancedComponent, TranslateModule.forRoot()],
        }).compileComponents();
    });

    afterEach(() => {
        for (const f of fixtures.splice(0)) {
            f.destroy();
            f.nativeElement.remove();
        }
        document.body.querySelectorAll('[dir]').forEach(n => n.remove());
        vi.restoreAllMocks();
    });

    it('renders the panel on <body>, outside the host, fixed to the viewport', () => {
        const card = document.createElement('div');
        card.style.overflow = 'hidden';
        document.body.appendChild(card);
        const f = make({ at: rect(500, 200), container: card });
        const panel = open(f);

        expect(panel.parentElement).toBe(document.body);
        expect(f.nativeElement.contains(panel)).toBe(false);
        expect(card.contains(panel)).toBe(false);
        expect(panel.style.position).toBe('fixed');
        card.remove();
    });

    it('takes a PrimeNG overlay layer, so it paints above the shell and an open dialog', () => {
        const panel = open(make({ at: rect(500, 200) }));
        expect(Number(panel.style.zIndex)).toBeGreaterThan(1000);
    });

    it('opens below a trigger with room under it', () => {
        const panel = open(make({ at: rect(500, 200) }));
        expect(panel.dataset['side']).toBe('below');
        expect(panel.style.top).toBe('248px');
        expect(panel.style.bottom).toBe('auto');
    });

    it('opens above a trigger near the bottom of the viewport', () => {
        const panel = open(make({ at: rect(500, 800) }));
        expect(panel.dataset['side']).toBe('above');
        expect(panel.style.top).toBe('auto');
        expect(panel.style.bottom).toBe(`${VH - 800 + 8}px`);
    });

    it('stays inside the viewport for a trigger at the right edge', () => {
        const panel = open(make({ at: rect(VW - 220, 200, 200) }));
        const left = parseFloat(panel.style.left);
        expect(left).toBeGreaterThanOrEqual(8);
        expect(left + PANEL_W).toBeLessThanOrEqual(VW - 8);
        expect(panel.style.right).toBe('auto');
    });

    it('mirrors in RTL and carries the direction onto the portaled panel', () => {
        const rtl = document.createElement('div');
        rtl.setAttribute('dir', 'rtl');
        document.body.appendChild(rtl);
        const at = rect(900, 200, 440);
        const panel = open(make({ at, container: rtl }));

        expect(panel.getAttribute('dir')).toBe('rtl');
        // Inline start (the right edge) meets the trigger's right edge.
        expect(parseFloat(panel.style.left) + PANEL_W).toBe(at.right);
    });

    it('opening a second picker closes the first', () => {
        const a = make({ at: rect(100, 200) });
        const b = make({ at: rect(600, 200) });
        open(a);
        expect(panels().length).toBe(1);

        trigger(b).click();
        a.detectChanges();
        b.detectChanges();

        expect(a.componentInstance.open()).toBe(false);
        expect(b.componentInstance.open()).toBe(true);
        expect(panels().length).toBe(1);
        // Focus is the user's, on B; closing A must not take it back.
        expect(document.activeElement).not.toBe(trigger(a));
    });

    it('closes on an outside click without moving focus', () => {
        const f = make({ at: rect(500, 200) });
        open(f);
        const elsewhere = document.createElement('button');
        document.body.appendChild(elsewhere);
        elsewhere.focus();

        elsewhere.click();
        f.detectChanges();

        expect(f.componentInstance.open()).toBe(false);
        expect(panels().length).toBe(0);
        expect(document.activeElement).toBe(elsewhere);
        elsewhere.remove();
    });

    it('stays open on a click inside the panel', () => {
        const f = make({ at: rect(500, 200) });
        const panel = open(f);
        (panel.querySelector('.dp__cal-nav') as HTMLButtonElement).click();
        f.detectChanges();
        expect(f.componentInstance.open()).toBe(true);
    });

    it('closes on Escape and returns focus to the trigger', () => {
        const f = make({ at: rect(500, 200) });
        const panel = open(f);
        (panel.querySelector('.dp__field input') as HTMLInputElement).focus();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        f.detectChanges();

        expect(panels().length).toBe(0);
        expect(document.activeElement).toBe(trigger(f));
    });

    it('Escape on one picker leaves a closed picker untouched', () => {
        const a = make({ at: rect(100, 200) });
        const b = make({ at: rect(600, 200) });
        const closed = vi.fn();
        b.componentInstance.closed.subscribe(closed);
        open(a);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        a.detectChanges();
        expect(closed).not.toHaveBeenCalled();
    });

    it('returns focus to the trigger after a day is picked', () => {
        const f = make({ at: rect(500, 200) });
        const panel = open(f);
        (panel.querySelector('.dp__cal-day:not(.out)') as HTMLButtonElement).click();
        f.detectChanges();
        expect(panels().length).toBe(0);
        expect(document.activeElement).toBe(trigger(f));
    });

    it('removes the panel when the host is destroyed while open', () => {
        const f = make({ at: rect(500, 200) });
        open(f);
        f.destroy();
        expect(panels().length).toBe(0);
    });
});
