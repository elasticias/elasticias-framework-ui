import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfServerErrorsDirective } from '../ef-server-errors.directive';
import { EfLocalizedInputComponent } from './ef-localized-input.component';

/**
 * Two texts edited together (an email's subject and body) share one row of
 * culture tabs: the first input shows the tabs, the second hides its own and
 * follows `[(activeCulture)]`, and the screen reads the same signal to know
 * which language its other actions apply to.
 */
const KEYS = {
    ef_localized_input_culture_fr: 'Français',
    ef_localized_input_culture_ar: 'Arabe',
    ef_localized_input_culture_en: 'Anglais',
    ef_localized_input_missing: 'manquant',
    ef_localized_input_cultures: 'Langues du texte',
    ef_localized_input_errors_in_other: 'Erreur dans :',
    subject: 'Objet',
    body: 'Corps',
};

type Errors = { [k: string]: string[] };

@Component({
    standalone: true,
    imports: [EfLocalizedInputComponent, EfServerErrorsDirective],
    template: `
        <div [efServerErrors]="errors()">
            <ef-localized-input id="subject" name="subject" labelKey="subject" [value]="{ fr: 'Objet', ar: 'موضوع' }" [(activeCulture)]="culture" />
            <ef-localized-input id="body" name="htmlBody" labelKey="body" mode="html" [showTabs]="false" [value]="{ fr: '<p>a</p>' }" [(activeCulture)]="culture" />
        </div>
    `,
})
class Host {
    culture = signal<string | null>(null);
    errors = signal<Errors | null>(null);
}

function render() {
    TestBed.configureTestingModule({ imports: [Host, TranslateModule.forRoot()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', KEYS);
    translate.use('fr');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const detect = () => fixture.detectChanges();
    const subject = host.querySelector<HTMLElement>('#subject')!;
    const body = host.querySelector<HTMLElement>('#body')!;
    const tab = (code: string) => subject.querySelector<HTMLButtonElement>(`[role="tab"][id$="-tab-${code}"]`)!;
    const subjectField = () => subject.querySelector<HTMLInputElement>('input')!;
    const bodyField = () => body.querySelector<HTMLTextAreaElement>('textarea')!;
    return { fixture, host, subject, body, tab, subjectField, bodyField, detect, culture: fixture.componentInstance.culture, errors: fixture.componentInstance.errors };
}

describe('EfLocalizedInputComponent shared culture tabs', () => {
    it('tells the parent which culture it starts on', () => {
        const { culture } = render();
        expect(culture()).toBe('fr');
    });

    it('moves both inputs when a tab is picked', () => {
        const { tab, culture, subjectField, bodyField, detect } = render();
        tab('ar').click();
        detect();
        expect(culture()).toBe('ar');
        expect(subjectField().getAttribute('name')).toBe('subject.ar');
        expect(bodyField().getAttribute('name')).toBe('htmlBody.ar');
    });

    it('follows a culture the parent sets', () => {
        const { tab, culture, bodyField, detect } = render();
        culture.set('en');
        detect();
        expect(tab('en').getAttribute('aria-selected')).toBe('true');
        expect(bodyField().getAttribute('name')).toBe('htmlBody.en');
    });

    it('settles a culture it does not list on its default, and says so', () => {
        const { culture, bodyField, detect } = render();
        culture.set('xx');
        detect();
        expect(bodyField().getAttribute('name')).toBe('htmlBody.fr');
        expect(culture()).toBe('fr');
    });

    it('renders no tab row with showTabs off, and no tabpanel pointing at a missing tab', () => {
        const { body } = render();
        expect(body.querySelector('[role="tablist"]')).toBeNull();
        expect(body.querySelector('[role="tabpanel"]')).toBeNull();
        expect(body.querySelector('[aria-labelledby]')).toBeNull();
    });

    it('names the culture of a field without tabs for assistive tech', () => {
        const { tab, bodyField, body, detect } = render();
        tab('ar').click();
        detect();
        const ids = (bodyField().getAttribute('aria-describedby') ?? '').split(' ');
        const names = ids.map(id => body.querySelector(`[id="${id}"]`)?.textContent?.trim());
        expect(names).toContain('Arabe');
    });

    it('keeps the tab row of the input that shows it', () => {
        const { subject } = render();
        expect(subject.querySelectorAll('[role="tab"]').length).toBe(3);
        expect(subject.querySelector('[role="tabpanel"]')).not.toBeNull();
    });

    it('brings the shared row to the culture in error when only the input without tabs has the error', () => {
        const { errors, culture, tab, bodyField, detect } = render();
        errors.set({ 'htmlBody.ar': ['Corps requis'] });
        detect();
        expect(culture()).toBe('ar');
        expect(tab('ar').getAttribute('aria-selected')).toBe('true');
        expect(bodyField().getAttribute('name')).toBe('htmlBody.ar');
    });

    it('still names the cultures in error from the input without tabs', () => {
        const { errors, tab, body, detect } = render();
        errors.set({ 'htmlBody.ar': ['Corps requis'] });
        detect();
        tab('fr').click();
        detect();
        expect(body.querySelector('[data-errors-elsewhere]')?.textContent).toContain('Arabe');
    });
});
