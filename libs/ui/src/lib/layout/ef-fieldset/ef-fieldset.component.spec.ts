import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfFieldsetComponent } from './ef-fieldset.component';

/**
 * Inside an `ef-card` the default frame is a box in a box and costs the
 * fields ~32px of width at 390px. `variant="plain"` drops the frame and keeps
 * the semantic fieldset + legend.
 */
describe('EfFieldsetComponent variant', () => {
    function render(inputs: Record<string, unknown>) {
        TestBed.configureTestingModule({ imports: [EfFieldsetComponent, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(EfFieldsetComponent);
        for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('is framed by default', () => {
        const host = render({ legend: 'Francais' });
        expect(host.classList).not.toContain('ef-fieldset--plain');
        expect(host.querySelector('legend')?.textContent).toContain('Francais');
    });

    it('marks the host plain and keeps fieldset and legend', () => {
        const host = render({ legendKey: 'some.key', variant: 'plain' });
        expect(host.classList).toContain('ef-fieldset--plain');
        expect(host.querySelector('fieldset')).toBeTruthy();
        expect(host.querySelector('legend')?.textContent).toContain('some.key');
    });

    it('does not offer toggling in the plain variant', () => {
        const host = render({ legend: 'EN', variant: 'plain', toggleable: true });
        expect(host.querySelector('legend button, .p-fieldset-toggle-button')).toBeNull();
    });
});
