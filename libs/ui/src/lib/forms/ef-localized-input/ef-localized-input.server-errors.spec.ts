import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppUtils } from '@elasticias/utils';
import { EfServerErrorsDirective } from '../ef-server-errors.directive';
import { EfLocalizedInputComponent } from './ef-localized-input.component';

/**
 * Server errors reach the field as `title` (the whole control) and
 * `title.<culture>` (one language), through the `[efServerErrors]` scope.
 */
const KEYS = {
    ef_localized_input_culture_fr: 'Français',
    ef_localized_input_culture_ar: 'Arabe',
    ef_localized_input_culture_en: 'Anglais',
    ef_localized_input_missing: 'manquant',
    ef_localized_input_cultures: 'Langues du texte',
    ef_localized_input_errors_in_other: 'Erreur dans :',
    title: 'Titre',
};

type Errors = { [k: string]: string[] };

@Component({
    standalone: true,
    imports: [EfLocalizedInputComponent, EfServerErrorsDirective],
    template: `<div [efServerErrors]="map()"><ef-localized-input [name]="name" labelKey="title" [errors]="explicit()" [value]="{ fr: 'a', ar: 'b' }" /></div>`,
})
class Host {
    name = 'title';
    map = signal<Errors | null>(null);
    explicit = signal<string[] | null>(null);
}

function render(name = 'title') {
    TestBed.configureTestingModule({ imports: [Host, TranslateModule.forRoot()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', KEYS);
    translate.use('fr');
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.name = name;
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const detect = () => fixture.detectChanges();
    const tab = (code: string) => host.querySelector<HTMLButtonElement>(`[role="tab"][id$="-tab-${code}"]`)!;
    const field = () => host.querySelector<HTMLInputElement>('[role="tabpanel"] input')!;
    const messages = () => Array.from(host.querySelectorAll('small.text-danger')).map(e => e.textContent!.trim());
    const setErrors = (m: Errors | null) => {
        fixture.componentInstance.map.set(m);
        detect();
    };
    return { fixture, host, tab, field, messages, setErrors, detect };
}

describe('EfLocalizedInputComponent server errors', () => {
    it('links title.ar errors to the ar tab and switches to it', () => {
        const { tab, field, messages, setErrors } = render();
        expect(tab('fr').getAttribute('aria-selected')).toBe('true');
        setErrors({ 'title.ar': ['Langue non prise en charge'] });
        expect(tab('ar').getAttribute('aria-selected')).toBe('true');
        expect(tab('ar').classList).toContain('is-danger');
        expect(tab('fr').classList).not.toContain('is-danger');
        expect(field().getAttribute('name')).toBe('title.ar');
        expect(messages()).toEqual(['Langue non prise en charge']);
    });

    it('switches to the first culture in error and gives each one the tone', () => {
        const { tab, setErrors } = render();
        setErrors({ 'title.en': ['x'], 'title.ar': ['y'] });
        expect(tab('ar').getAttribute('aria-selected')).toBe('true');
        expect(tab('en').classList).toContain('is-danger');
        expect(tab('ar').classList).toContain('is-danger');
    });

    it('hints at the other tabs that have errors, naming them', () => {
        const { host, tab, setErrors } = render();
        setErrors({ 'title.en': ['x'] });
        const hint = () => host.querySelector('[data-errors-elsewhere]');
        expect(hint()).toBeNull();
        tab('fr').click();
        setErrors({ 'title.en': ['x'] });
        expect(hint()?.textContent).toContain('Anglais');
        expect(hint()?.textContent).not.toContain('Arabe');
    });

    it('lets the user leave the tab in error without being sent back', () => {
        const { tab, detect, setErrors } = render();
        setErrors({ 'title.ar': ['y'] });
        tab('fr').click();
        detect();
        expect(tab('fr').getAttribute('aria-selected')).toBe('true');
    });

    it('switches again when a new set of errors arrives', () => {
        const { tab, setErrors } = render();
        setErrors({ 'title.ar': ['y'] });
        tab('fr').click();
        setErrors({ 'title.ar': ['y'], 'title.fr': ['z'] });
        expect(tab('fr').getAttribute('aria-selected')).toBe('true');
        setErrors({ 'title.en': ['w'] });
        expect(tab('en').getAttribute('aria-selected')).toBe('true');
    });

    it('shows whole-field title errors under the tabs on every tab', () => {
        const { host, tab, setErrors } = render();
        setErrors({ title: ['Titre obligatoire'] });
        const whole = () => host.querySelector('[data-field-errors]');
        expect(whole()?.textContent).toContain('Titre obligatoire');
        expect(tab('fr').classList).not.toContain('is-danger');
        tab('ar').click();
        setErrors({ title: ['Titre obligatoire'] });
        expect(whole()?.textContent).toContain('Titre obligatoire');
    });

    it('does not mistake seoTitle errors for title errors', () => {
        const { tab, host, setErrors } = render();
        setErrors({ 'seoTitle.ar': ['x'], seoTitle: ['y'] });
        expect(tab('ar').classList).not.toContain('is-danger');
        expect(host.querySelector('[data-field-errors]')).toBeNull();
    });

    it('seoTitle.ar arrives intact as camelCase', () => {
        expect(AppUtils.toCamelCase('SeoTitle.ar')).toBe('seoTitle.ar');
        const { tab, field, setErrors } = render('seoTitle');
        setErrors({ [AppUtils.toCamelCase('SeoTitle.ar')]: ['trop long'] });
        expect(tab('ar').classList).toContain('is-danger');
        expect(field().getAttribute('name')).toBe('seoTitle.ar');
    });

    it('explicit [errors] overrides the scope for the whole field', () => {
        const { host, fixture, detect, setErrors } = render();
        setErrors({ title: ['from scope'] });
        fixture.componentInstance.explicit.set(['explicit']);
        detect();
        const text = host.querySelector('[data-field-errors]')?.textContent ?? '';
        expect(text).toContain('explicit');
        expect(text).not.toContain('from scope');
    });

    it('clears the tone and the messages when the errors go away', () => {
        const { host, tab, messages, setErrors } = render();
        setErrors({ 'title.ar': ['y'], title: ['z'] });
        setErrors(null);
        expect(tab('ar').classList).not.toContain('is-danger');
        expect(messages()).toEqual([]);
        expect(host.querySelector('[data-field-errors]')).toBeNull();
    });

    it('shows an error for a culture that is not in the list as a whole-field message', () => {
        const { host, tab, messages, setErrors } = render();
        setErrors({ 'title.xx': ['Langue non prise en charge'] });
        expect(host.querySelector('[data-field-errors]')?.textContent).toContain('Langue non prise en charge');
        expect(tab('fr').getAttribute('aria-selected')).toBe('true');
        tab('ar').click();
        expect(messages()).toEqual(['Langue non prise en charge']);
    });

    it('translates the message under the culture field like the whole-field ones', () => {
        const { fixture, messages, setErrors } = render();
        TestBed.inject(TranslateService).setTranslation('fr', { ...KEYS, localized_text_too_long: 'Texte trop long' });
        fixture.detectChanges();
        setErrors({ 'title.ar': ['localized_text_too_long'] });
        expect(messages()).toEqual(['Texte trop long']);
    });
});
