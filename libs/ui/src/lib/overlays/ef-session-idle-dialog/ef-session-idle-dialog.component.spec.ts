import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EF_SESSION, EfSessionIdleService } from '@elasticias/core';
import { EfSessionIdleDialogComponent } from './ef-session-idle-dialog.component';

/**
 * The warning is the last chance before unsaved work is lost: it must open
 * only on the countdown, keep the session on anything but an explicit
 * sign-out, and put Enter on "stay".
 */
describe('EfSessionIdleDialogComponent', () => {
    function setup(withSession = true) {
        const secondsLeft = signal<number | null>(null);
        const idle = { secondsLeft, stayActive: vi.fn(), stop: vi.fn() };
        const logout = vi.fn();
        TestBed.configureTestingModule({
            imports: [EfSessionIdleDialogComponent, TranslateModule.forRoot()],
            providers: [
                { provide: EfSessionIdleService, useValue: idle },
                ...(withSession ? [{ provide: EF_SESSION, useValue: { logout } }] : []),
            ],
        });
        const fixture = TestBed.createComponent(EfSessionIdleDialogComponent);
        fixture.detectChanges();
        const open = async (s: number) => {
            secondsLeft.set(s);
            fixture.detectChanges();
            await fixture.whenStable();
        };
        const buttons = () =>
            Array.from(document.querySelectorAll<HTMLButtonElement>('.es-dialog .btn'));
        return { fixture, idle, logout, open, buttons };
    }

    afterEach(() => document.body.querySelectorAll('.p-dialog-mask').forEach((m) => m.remove()));

    it('stays closed until the countdown starts', () => {
        const { buttons } = setup();
        expect(buttons()).toHaveLength(0);
    });

    it('offers sign-out and stay, and stay keeps the session', async () => {
        const { open, buttons, idle, logout } = setup();
        await open(42);

        const [signOut, stay] = buttons();
        expect(signOut.textContent).toContain('common_logout');
        expect(stay.textContent).toContain('session_idle_stay');

        stay.click();
        expect(idle.stayActive).toHaveBeenCalled();
        expect(logout).not.toHaveBeenCalled();
    });

    it('signs out through EF_SESSION and stops the countdown first', async () => {
        const { open, buttons, idle, logout } = setup();
        await open(42);

        buttons()[0].click();
        expect(idle.stop).toHaveBeenCalled();
        expect(logout).toHaveBeenCalled();
        expect(idle.stayActive).not.toHaveBeenCalled();
    });

    it('marks stay, not sign-out, as the button that takes focus', async () => {
        const { open, buttons } = setup();
        await open(42);

        const [signOut, stay] = buttons();
        expect(stay.hasAttribute('data-ef-autofocus')).toBe(true);
        expect(signOut.hasAttribute('data-ef-autofocus')).toBe(false);
    });

    it('offers only stay when the app provides no EF_SESSION', async () => {
        const { open, buttons } = setup(false);
        await open(42);

        expect(buttons()).toHaveLength(1);
        expect(buttons()[0].textContent).toContain('session_idle_stay');
    });
});
