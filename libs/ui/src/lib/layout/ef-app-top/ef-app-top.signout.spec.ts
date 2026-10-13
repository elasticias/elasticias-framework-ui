import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EF_SESSION } from '@elasticias/core';
import { Tooltip } from 'primeng/tooltip';
import { By } from '@angular/platform-browser';
import { EfAppTopComponent } from './ef-app-top.component';

/**
 * Sign-out is destructive and has no undo (an unsaved form is lost), so a
 * touch user must never be invited to hold it, and a hold must not fire it.
 */
describe('EfAppTopComponent sign-out on touch', () => {
    function setup(hoverNone: boolean) {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: (query: string) =>
                ({
                    matches: query === '(hover: none)' ? hoverNone : false,
                    media: query,
                    addEventListener: () => undefined,
                    removeEventListener: () => undefined,
                }) as unknown as MediaQueryList,
        });
        const logout = vi.fn();
        TestBed.configureTestingModule({
            imports: [EfAppTopComponent, TranslateModule.forRoot()],
            providers: [{ provide: EF_SESSION, useValue: { logout } }],
        });
        const fixture = TestBed.createComponent(EfAppTopComponent);
        fixture.componentRef.setInput('themeToggle', false);
        fixture.detectChanges();
        const button = fixture.debugElement.query(By.css('.ef-app-top__logout'));
        return { fixture, logout, button, el: button.nativeElement as HTMLButtonElement };
    }

    function pointer(el: HTMLElement, type: string, pointerType: string): void {
        const e = new Event(type, { bubbles: true }) as Event & { pointerType: string };
        Object.defineProperty(e, 'pointerType', { value: pointerType });
        el.dispatchEvent(e);
    }

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        delete (window as { matchMedia?: unknown }).matchMedia;
    });

    it('disables its tooltip on a touch-only screen', () => {
        const { button } = setup(true);
        expect(button.injector.get(Tooltip).disabled).toBe(true);
    });

    it('keeps its tooltip where there is hover', () => {
        const { button } = setup(false);
        expect(button.injector.get(Tooltip).disabled).toBeFalsy();
    });

    it('signs out on a tap', () => {
        const { el, logout } = setup(true);
        vi.useFakeTimers();
        pointer(el, 'pointerdown', 'touch');
        vi.advanceTimersByTime(120);
        el.click();
        expect(logout).toHaveBeenCalledTimes(1);
    });

    it('ignores the click that ends a touch held for 500ms or more', () => {
        const { el, logout } = setup(true);
        vi.useFakeTimers();
        pointer(el, 'pointerdown', 'touch');
        vi.advanceTimersByTime(650);
        el.click();
        expect(logout).not.toHaveBeenCalled();
        // The next ordinary tap still works.
        pointer(el, 'pointerdown', 'touch');
        vi.advanceTimersByTime(100);
        el.click();
        expect(logout).toHaveBeenCalledTimes(1);
    });

    it('does not apply the hold guard to a mouse', () => {
        const { el, logout } = setup(false);
        vi.useFakeTimers();
        pointer(el, 'pointerdown', 'mouse');
        vi.advanceTimersByTime(900);
        el.click();
        expect(logout).toHaveBeenCalledTimes(1);
    });

    it('signs out from the keyboard (a click with no pointerdown)', () => {
        const { el, logout } = setup(true);
        el.click();
        expect(logout).toHaveBeenCalledTimes(1);
    });
});
