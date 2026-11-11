import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfVersionDialogComponent } from './ef-version-dialog.component';
import { EfVersionInfo } from './ef-version-info';

const INFO: EfVersionInfo = {
    application: 'crescilio-erp',
    version: 'develop',
    commit: '15d6d6b',
    environment: 'DEV',
    startedAt: '2026-11-11T03:11:10Z',
};

describe('EfVersionDialogComponent', () => {
    function setup(info: EfVersionInfo | null, loading = false) {
        TestBed.configureTestingModule({ imports: [EfVersionDialogComponent, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(EfVersionDialogComponent);
        fixture.componentRef.setInput('info', info);
        fixture.componentRef.setInput('loading', loading);
        fixture.componentInstance.visible.set(true);
        fixture.detectChanges();
        const q = (s: string) => document.querySelector<HTMLElement>(s);
        const buttons = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.es-dialog .btn'));
        return { fixture, q, buttons };
    }

    afterEach(() => document.body.querySelectorAll('.p-dialog-mask').forEach((m) => m.remove()));

    it('shows the build and the line it copies', async () => {
        const { fixture, q } = setup(INFO);
        await fixture.whenStable();
        expect(q('.ef-version__code')!.textContent!.trim()).toBe('crescilio-erp develop+15d6d6b DEV');
        expect(q('.ef-version__code')!.getAttribute('dir')).toBe('ltr');
        expect(q('.ef-version__rows')!.textContent).toContain('15d6d6b');
        // Every value is bidi-isolated, so an Arabic page cannot reorder a hash or a date.
        const values = Array.from(document.querySelectorAll('.ef-version__row dd'));
        expect(values).toHaveLength(4);
        expect(values.every((dd) => dd.querySelector('span[dir]'))).toBe(true);
    });

    it('copies the line and says so, without closing', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        const { fixture, buttons, q } = setup(INFO);
        await fixture.whenStable();

        buttons()[0].click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(writeText).toHaveBeenCalledWith('crescilio-erp develop+15d6d6b DEV');
        expect(fixture.componentInstance.visible()).toBe(true);
        expect(q('.ef-version__status')!.textContent).toContain('version_copied_announce');
    });

    it('says the copy failed when the clipboard refuses', async () => {
        const writeText = vi.fn().mockRejectedValue(new Error('denied'));
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        const { fixture, buttons, q } = setup(INFO);
        await fixture.whenStable();

        buttons()[0].click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(q('.ef-version__status')!.textContent).toContain('version_copy_failed');
    });

    it('says the information is unavailable when there is none, and cannot copy', async () => {
        const { fixture, q, buttons } = setup(null);
        await fixture.whenStable();
        expect(q('.ef-version__empty')!.textContent).toContain('version_unavailable');
        expect(buttons()[0].disabled).toBe(true);
    });

    it('shows a skeleton while loading', async () => {
        const { fixture, q } = setup(null, true);
        await fixture.whenStable();
        expect(q('ef-skeleton')).not.toBeNull();
        expect(q('.ef-version__empty')).toBeNull();
    });
});
