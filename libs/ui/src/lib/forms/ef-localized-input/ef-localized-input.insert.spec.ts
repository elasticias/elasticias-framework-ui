import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { LocalizedText } from '@elasticias/types';
import { EfLocalizedInputComponent } from './ef-localized-input.component';

/**
 * `insertAtCaret(text)`: a variables card beside the field drops a token
 * (`{{order_number}}`) where the owner left the caret in the culture on
 * show, and the field emits the whole object as typing would.
 */
function render(inputs: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({ imports: [EfLocalizedInputComponent, TranslateModule.forRoot()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', { ef_localized_input_culture_ar: 'Arabe' });
    translate.use('fr');
    const fixture = TestBed.createComponent(EfLocalizedInputComponent);
    for (const [k, v] of Object.entries({ name: 'body', ...inputs })) fixture.componentRef.setInput(k, v);
    const emitted: LocalizedText[] = [];
    fixture.componentInstance.valueChangeEvent.subscribe(v => emitted.push(v));
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const field = () => host.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!;
    const focusAt = (caret: number) => {
        const el = field();
        el.focus();
        el.setSelectionRange(caret, caret);
    };
    const insert = (text: string) => {
        const done = fixture.componentInstance.insertAtCaret(text);
        fixture.detectChanges();
        return done;
    };
    return { fixture, host, field, focusAt, insert, emitted };
}

describe('EfLocalizedInputComponent insertAtCaret', () => {
    it('inserts at the caret of the culture on show and emits the whole object', () => {
        const { focusAt, insert, emitted, field } = render({ value: { fr: 'Bonjour !', ar: 'مرحبا' } });
        focusAt(7);
        expect(insert(' {{name}}')).toBe(true);
        expect(emitted.at(-1)).toEqual({ fr: 'Bonjour {{name}} !', ar: 'مرحبا' });
        expect(field().value).toBe('Bonjour {{name}} !');
    });

    it('appends when the field was never entered', () => {
        const { insert, emitted } = render({ value: { fr: 'Bonjour' } });
        expect(insert(' {{name}}')).toBe(true);
        expect(emitted.at(-1)).toEqual({ fr: 'Bonjour {{name}}' });
    });

    it('inserts into the active culture of an html field', () => {
        const { fixture, insert, emitted } = render({ mode: 'html', value: { fr: '<p>a</p>', ar: '<p>b</p>' } });
        fixture.componentRef.setInput('activeCulture', 'ar');
        fixture.detectChanges();
        expect(insert('{{x}}')).toBe(true);
        expect(emitted.at(-1)).toEqual({ fr: '<p>a</p>', ar: '<p>b</p>{{x}}' });
    });

    it('refuses an insert that would pass maxLength', () => {
        const { insert, emitted } = render({ value: { fr: 'abc' }, maxLength: 5 });
        expect(insert('{{x}}')).toBe(false);
        expect(emitted).toEqual([]);
    });

    it('refuses on a read-only culture', () => {
        const { insert, emitted } = render({ value: { fr: 'abc' }, readOnlyCultures: ['fr'] });
        expect(insert('{{x}}')).toBe(false);
        expect(emitted).toEqual([]);
    });

    it('refuses while disabled', () => {
        const { insert, emitted } = render({ value: { fr: 'abc' }, disabled: true });
        expect(insert('{{x}}')).toBe(false);
        expect(emitted).toEqual([]);
    });
});
