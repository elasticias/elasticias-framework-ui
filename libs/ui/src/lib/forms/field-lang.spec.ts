import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfInputTextComponent } from './ef-input-text/ef-input-text.component';
import { EfTextareaComponent } from './ef-textarea/ef-textarea.component';

/**
 * A field holding Arabic text on a French screen tells assistive tech and the
 * browser (spelling, fonts, hyphenation) which language the value is in. The
 * label and hint are page text, so `lang` goes on the native field only, never
 * on the host: `ef-label` is `display: contents` and would inherit it.
 */
type Inputs = Record<string, unknown>;

const CASES: [string, Type<unknown>, Inputs, string][] = [
    ['ef-input-text comptoir', EfInputTextComponent, {}, 'input'],
    ['ef-input-text with a prefix', EfInputTextComponent, { prefix: '/p/' }, 'input'],
    ['ef-input-text primeng', EfInputTextComponent, { variant: 'primeng' }, 'input'],
    ['ef-textarea', EfTextareaComponent, {}, 'textarea'],
];

function render(cmp: Type<unknown>, inputs: Inputs) {
    TestBed.configureTestingModule({ imports: [cmp, TranslateModule.forRoot()] });
    const fixture = TestBed.createComponent(cmp);
    for (const [k, v] of Object.entries({ name: 'title', label: 'Titre', ...inputs })) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
}

describe.each(CASES)('%s: lang', (_name, cmp, inputs, field) => {
    it('puts lang on the native field, not on the host or the label', () => {
        const host = render(cmp, { ...inputs, lang: 'ar' });
        expect(host.querySelector(field)!.getAttribute('lang')).toBe('ar');
        expect(host.hasAttribute('lang')).toBe(false);
        expect(host.querySelector('label')!.closest('[lang]')).toBeNull();
    });

    it('renders no lang attribute by default', () => {
        const host = render(cmp, inputs);
        expect(host.querySelector(field)!.hasAttribute('lang')).toBe(false);
    });
});
