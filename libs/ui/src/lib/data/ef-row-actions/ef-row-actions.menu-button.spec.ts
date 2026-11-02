import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfRowActionsComponent } from './ef-row-actions.component';
import { EfRowAction } from './ef-row-actions.types';

/**
 * APG menu-button pattern: focus enters the menu on open, arrows / Home / End
 * move between items, Escape and a pick hand focus back to the trigger. A
 * disabled item stays focusable (aria-disabled) and says why.
 */
describe('EfRowActionsComponent menu button', () => {
    let fixture: ComponentFixture<EfRowActionsComponent>;
    let el: HTMLElement;
    const a = vi.fn();
    const c = vi.fn();

    const items: EfRowAction[] = [
        { id: 'a', label: 'Alpha', command: a },
        { id: 'b', label: 'Bravo', disabled: true, reasonKey: 'reason_b' },
        { id: 'c', label: 'Charlie', command: c },
    ];

    const trigger = () => el.querySelector<HTMLButtonElement>('.row-actions__trigger')!;
    const menuItems = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.row-actions__item'));
    const press = (target: Element, key: string) => {
        target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
        fixture.detectChanges();
    };
    const open = () => {
        trigger().click();
        fixture.detectChanges();
    };

    beforeEach(async () => {
        a.mockReset();
        c.mockReset();
        await TestBed.configureTestingModule({
            imports: [
                EfRowActionsComponent,
                TranslateModule.forRoot(),
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(EfRowActionsComponent);
        el = fixture.nativeElement;
        document.body.appendChild(el);
        fixture.componentRef.setInput('items', items);
        fixture.detectChanges();
    });

    afterEach(() => el.remove());

    it('moves focus to the first enabled item on open', () => {
        open();
        expect(document.activeElement).toBe(menuItems()[0]);
    });

    it('ArrowDown and ArrowUp move between items and wrap', () => {
        open();
        press(menuItems()[0], 'ArrowDown');
        expect(document.activeElement).toBe(menuItems()[1]); // disabled items are reachable
        press(menuItems()[1], 'ArrowDown');
        expect(document.activeElement).toBe(menuItems()[2]);
        press(menuItems()[2], 'ArrowDown');
        expect(document.activeElement).toBe(menuItems()[0]);
        press(menuItems()[0], 'ArrowUp');
        expect(document.activeElement).toBe(menuItems()[2]);
    });

    it('Home and End jump to the first and last item', () => {
        open();
        press(menuItems()[0], 'End');
        expect(document.activeElement).toBe(menuItems()[2]);
        press(menuItems()[2], 'Home');
        expect(document.activeElement).toBe(menuItems()[0]);
    });

    it('ArrowDown on the closed trigger opens the menu', () => {
        press(trigger(), 'ArrowDown');
        expect(el.querySelector('[role="menu"]')).not.toBeNull();
        expect(document.activeElement).toBe(menuItems()[0]);
    });

    it('Escape closes the menu and returns focus to the trigger', () => {
        open();
        press(menuItems()[0], 'Escape');
        expect(el.querySelector('[role="menu"]')).toBeNull();
        expect(document.activeElement).toBe(trigger());
    });

    it('a pick runs the command, closes and returns focus to the trigger', () => {
        open();
        menuItems()[2].click();
        fixture.detectChanges();
        expect(c).toHaveBeenCalledTimes(1);
        expect(el.querySelector('[role="menu"]')).toBeNull();
        expect(document.activeElement).toBe(trigger());
    });

    it('keeps a disabled item focusable, aria-disabled, with its reason', () => {
        open();
        const b = menuItems()[1];
        expect(b.disabled).toBe(false);
        expect(b.getAttribute('aria-disabled')).toBe('true');
        const id = b.getAttribute('aria-describedby')!;
        expect(id).toBeTruthy();
        expect(el.querySelector('#' + id)?.textContent?.trim()).toBe('reason_b');
        expect(b.getAttribute('title')).toBe('reason_b');
    });

    it('does not run a disabled item and leaves the menu open', () => {
        open();
        menuItems()[1].click();
        fixture.detectChanges();
        expect(el.querySelector('[role="menu"]')).not.toBeNull();
        press(menuItems()[1], 'Enter');
        expect(a).not.toHaveBeenCalled();
    });

    it('an enabled item has no aria-disabled or description', () => {
        open();
        expect(menuItems()[0].getAttribute('aria-disabled')).toBeNull();
        expect(menuItems()[0].getAttribute('aria-describedby')).toBeNull();
    });
});
