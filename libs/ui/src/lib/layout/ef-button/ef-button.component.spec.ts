import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfButtonComponent } from './ef-button.component';

/**
 * An icon-only button has a tooltip, which a screen reader does not read as
 * the button's name. `ariaLabelKey` gives it a translated accessible name,
 * and a button with neither a label nor that key warns in dev mode.
 */
describe('EfButtonComponent accessible name', () => {
    function render(inputs: Record<string, unknown>) {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ imports: [EfButtonComponent, TranslateModule.forRoot()] });
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('en', { pin_row: 'Pin this row', save: 'Save' });
        translate.use('en');
        const fixture = TestBed.createComponent(EfButtonComponent);
        for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    for (const variant of ['comptoir', 'primeng'] as const) {
        it(`puts the translated ariaLabelKey on the ${variant} button`, () => {
            const host = render({ variant, icon: 'pi pi-star', ariaLabelKey: 'pin_row' });
            expect(host.querySelector('button')?.getAttribute('aria-label')).toBe('Pin this row');
        });

        it(`adds no aria-label to a labelled ${variant} button`, () => {
            const host = render({ variant, labelKey: 'save' });
            expect(host.querySelector('button')?.hasAttribute('aria-label')).toBe(false);
        });
    }

    it('warns once in dev mode for an icon-only button with no name', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        render({ variant: 'comptoir', icon: 'pi pi-star' });
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain('ef-button');
        warn.mockRestore();
    });

    it('does not warn when the icon-only button has an ariaLabelKey', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        render({ variant: 'comptoir', icon: 'pi pi-star', ariaLabelKey: 'pin_row' });
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it('does not warn for a labelled button', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        render({ variant: 'comptoir', icon: 'pi pi-star', label: 'Save' });
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});
