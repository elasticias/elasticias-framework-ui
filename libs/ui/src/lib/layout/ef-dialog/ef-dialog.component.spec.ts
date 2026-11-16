import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfDialogComponent } from './ef-dialog.component';

/**
 * A dialog needs an accessible name: without one a screen reader announces
 * "dialog" and nothing else. The comptoir header draws its own title, so it
 * must carry the id PrimeNG points the dialog's aria-labelledby at.
 */
describe('EfDialogComponent accessible name', () => {
    afterEach(() => document.body.querySelectorAll('.p-dialog-mask').forEach(m => m.remove()));

    async function open(variant: 'comptoir' | 'primeng') {
        TestBed.configureTestingModule({ imports: [EfDialogComponent, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(EfDialogComponent);
        fixture.componentRef.setInput('header', 'Ajouter des produits');
        fixture.componentRef.setInput('variant', variant);
        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        return document.querySelector<HTMLElement>('[role="dialog"]')!;
    }

    it('names the comptoir dialog after its title', async () => {
        const dialog = await open('comptoir');
        const id = dialog.getAttribute('aria-labelledby');
        expect(id).toBeTruthy();
        const title = document.getElementById(id!);
        expect(title?.textContent?.trim()).toBe('Ajouter des produits');
        expect(title?.classList).toContain('es-dialog__title');
    });
});

describe('EfDialogComponent mobileFullSheet', () => {
    afterEach(() => document.body.querySelectorAll('.p-dialog-mask').forEach(m => m.remove()));

    async function open(sheet: boolean | undefined) {
        TestBed.configureTestingModule({ imports: [EfDialogComponent, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(EfDialogComponent);
        fixture.componentRef.setInput('header', 'T');
        if (sheet !== undefined) fixture.componentRef.setInput('mobileFullSheet', sheet);
        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        return document.querySelector<HTMLElement>('.es-dialog')!;
    }

    it('adds the sheet class when opted in, keeping the size preset', async () => {
        const d = await open(true);
        expect(d.classList).toContain('es-dialog--mobile-sheet');
        expect(d.classList).toContain('es-dialog--md');
    });

    it('is off by default', async () => {
        const d = await open(undefined);
        expect(d.classList).not.toContain('es-dialog--mobile-sheet');
    });
});
