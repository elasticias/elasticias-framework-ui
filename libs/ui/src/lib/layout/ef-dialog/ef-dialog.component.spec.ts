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
