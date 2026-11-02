import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfToggleSwitchComponent } from './ef-toggleswitch.component';

/**
 * A toggle's label can be a full sentence. Two screens copied the same
 * `display: flex` override so it wraps beside the switch on a phone instead
 * of under it; the wrapper owns that layout now. An unlabelled toggle (a
 * table row's activation switch) keeps its inline box.
 *
 * jsdom has no inheritance or layout, so these read the declared values.
 */
describe('EfToggleSwitchComponent layout', () => {
    function render(inputs: Record<string, unknown>) {
        TestBed.configureTestingModule({ imports: [EfToggleSwitchComponent, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(EfToggleSwitchComponent);
        for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('lays the label beside the switch', () => {
        const host = render({ label: 'Afficher le bandeau sur la boutique' });
        const style = getComputedStyle(host);
        expect(host.classList).toContain('ef-toggleswitch--row');
        expect(style.display).toBe('flex');
        expect(style.alignItems).toBe('center');
        expect(style.minWidth).toBe('0');
        const sw = host.querySelector('p-toggleswitch') as HTMLElement;
        expect(getComputedStyle(sw).flexShrink).toBe('0');
    });

    it('leaves an unlabelled switch inline', () => {
        const host = render({ ariaLabel: 'Active' });
        expect(host.classList).not.toContain('ef-toggleswitch--row');
        expect(getComputedStyle(host).display).not.toBe('flex');
    });
});
