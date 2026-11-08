import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { EfCulture } from '@elasticias/core';
import type { LocalizedText } from '@elasticias/types';
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
            <ef-localized-input id="subject" name="subject" labelKey="subject" [value]="{ fr: 'Objet', ar: 'موضوع' }"
                [cultures]="subjectCultures()" [linkedInputs]="linked() ? [body] : []" [(activeCulture)]="culture" />
            <ef-localized-input #body id="body" name="htmlBody" labelKey="body" mode="html" [showTabs]="false"
                [value]="bodyValue()" [required]="bodyRequired()" [cultures]="bodyCultures()" [(activeCulture)]="culture" />
        </div>
    `,
})
class Host {
    culture = signal<string | null>(null);
    errors = signal<Errors | null>(null);
    linked = signal(true);
    bodyValue = signal<LocalizedText>({ fr: '<p>a</p>' });
    bodyRequired = signal(false);
    subjectCultures = signal<ReadonlyArray<EfCulture> | undefined>(undefined);
    bodyCultures = signal<ReadonlyArray<EfCulture> | undefined>(undefined);
}

const FR: EfCulture = { code: 'fr', labelKey: 'ef_localized_input_culture_fr', dir: 'ltr' };
const AR: EfCulture = { code: 'ar', labelKey: 'ef_localized_input_culture_ar', dir: 'rtl' };

function render(setup: (h: Host) => void = () => undefined) {
    TestBed.configureTestingModule({ imports: [Host, TranslateModule.forRoot()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', KEYS);
    translate.use('fr');
    const fixture = TestBed.createComponent(Host);
    setup(fixture.componentInstance);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const detect = () => fixture.detectChanges();
    const subject = host.querySelector<HTMLElement>('#subject')!;
    const body = host.querySelector<HTMLElement>('#body')!;
    const tab = (code: string) => subject.querySelector<HTMLButtonElement>(`[role="tab"][id$="-tab-${code}"]`)!;
    const subjectField = () => subject.querySelector<HTMLInputElement>('input')!;
    const bodyField = () => body.querySelector<HTMLTextAreaElement>('textarea')!;
    const typeBody = (text: string) => {
        bodyField().value = text;
        bodyField().dispatchEvent(new Event('input', { bubbles: true }));
        detect();
    };
    return { fixture, host, subject, body, tab, subjectField, bodyField, typeBody, detect, culture: fixture.componentInstance.culture, errors: fixture.componentInstance.errors };
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

    it('tints the shared tab of a culture in error on a linked input', () => {
        const { errors, tab, detect } = render();
        errors.set({ 'htmlBody.ar': ['Corps requis'] });
        detect();
        tab('fr').click();
        detect();
        expect(tab('ar').classList).toContain('is-danger');
        expect(tab('fr').classList).not.toContain('is-danger');
    });

    it('puts the dirty dot on the shared tab of a culture edited in a linked input', () => {
        const { tab, typeBody, detect } = render();
        tab('ar').click();
        detect();
        expect(tab('ar').querySelector('.ef-tabs__dot')).toBeNull();
        typeBody('<p>نص</p>');
        expect(tab('ar').querySelector('.ef-tabs__dot')).not.toBeNull();
        expect(tab('fr').querySelector('.ef-tabs__dot')).toBeNull();
    });

    it('puts the required tone on the shared default tab when a linked required input is empty and touched', () => {
        const { tab, bodyField, detect } = render(h => {
            h.bodyValue.set({ ar: '<p>b</p>' });
            h.bodyRequired.set(true);
        });
        expect(tab('fr').classList).not.toContain('is-danger');
        bodyField().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
        detect();
        expect(tab('fr').classList).toContain('is-danger');
    });

    it('moves to the first culture in error in tab order across the linked inputs', () => {
        const { errors, culture, detect } = render();
        errors.set({ 'subject.ar': ['Objet trop long'], 'htmlBody.fr': ['Corps requis'] });
        detect();
        expect(culture()).toBe('fr');
        errors.set({ 'subject.en': ['x'], 'htmlBody.ar': ['y'] });
        detect();
        expect(culture()).toBe('ar');
    });

    it('lets an unlinked input without tabs still bring the shared culture to its error', () => {
        const { errors, culture, detect } = render(h => h.linked.set(false));
        errors.set({ 'htmlBody.ar': ['Corps requis'] });
        detect();
        expect(culture()).toBe('ar');
    });

    it('does not let an input without tabs rewrite a culture it does not list', () => {
        const { culture, tab, bodyField, detect } = render(h => {
            h.subjectCultures.set([FR, AR]);
            h.bodyCultures.set([FR]);
        });
        tab('ar').click();
        detect();
        detect();
        expect(culture()).toBe('ar');
        expect(tab('ar').getAttribute('aria-selected')).toBe('true');
        expect(bodyField().getAttribute('name')).toBe('htmlBody.fr');
    });
});
