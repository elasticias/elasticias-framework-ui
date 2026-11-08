import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { LocalizedText } from '@elasticias/types';
import { EfReadOnlyDirective } from '../ef-read-only.directive';
import { EfLocalizedInputComponent } from './ef-localized-input.component';

/**
 * One owner-written text in every content language: one tab per culture, the
 * field of the active culture below it, the whole cleaned object out.
 */
const KEYS = {
    ef_localized_input_culture_fr: 'Français',
    ef_localized_input_culture_ar: 'Arabe',
    ef_localized_input_culture_en: 'Anglais',
    ef_localized_input_missing: 'manquant',
    ef_localized_input_cultures: 'Langues du texte',
    ef_localized_input_read_only_hint: 'Géré par le catalogue',
    title: 'Titre',
};

function setup() {
    TestBed.configureTestingModule({ imports: [EfLocalizedInputComponent, TranslateModule.forRoot()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', KEYS);
    translate.use('fr');
}

function render(inputs: Record<string, unknown> = {}) {
    setup();
    const fixture = TestBed.createComponent(EfLocalizedInputComponent);
    for (const [k, v] of Object.entries({ name: 'title', labelKey: 'title', ...inputs })) fixture.componentRef.setInput(k, v);
    const emitted: LocalizedText[] = [];
    fixture.componentInstance.valueChangeEvent.subscribe(v => emitted.push(v));
    fixture.detectChanges();
    return helpers(fixture.nativeElement as HTMLElement, () => fixture.detectChanges(), emitted, fixture);
}

function helpers(host: HTMLElement, detect: () => void, emitted: LocalizedText[] = [], fixture?: unknown) {
    const tabs = () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const tab = (code: string) => host.querySelector<HTMLButtonElement>(`[role="tab"][id$="-tab-${code}"]`)!;
    const select = (code: string) => {
        tab(code).click();
        detect();
    };
    const field = () => host.querySelector<HTMLInputElement | HTMLTextAreaElement>('[role="tabpanel"] input, [role="tabpanel"] textarea')!;
    const type = (text: string) => {
        const el = field();
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        detect();
    };
    return { host, tabs, tab, select, field, type, emitted, fixture, detect };
}

describe('EfLocalizedInputComponent', () => {
    it('renders one tab per culture, starting on the default', () => {
        const { tabs, tab, field } = render();
        expect(tabs().map(t => t.id.split('-tab-')[1])).toEqual(['fr', 'ar', 'en']);
        expect(tab('fr').getAttribute('aria-selected')).toBe('true');
        expect(field().getAttribute('name')).toBe('title.fr');
    });

    it.each(['primeng', 'default'])('draws the PrimeNG skin for variant %s, like ef-input-text', variant => {
        const { host } = render({ variant });
        expect(host.querySelector('ef-input-text input')?.classList.contains('p-inputtext')).toBe(true);
    });

    it('draws the comptoir skin by default', () => {
        expect(render().host.querySelector('ef-input-text input')?.classList.contains('p-inputtext')).toBe(false);
    });

    it('marks every culture without text as missing', () => {
        const { tab } = render({ value: { fr: 'A' } });
        expect(tab('fr').textContent).not.toContain('manquant');
        expect(tab('ar').textContent).toContain('manquant');
        expect(tab('en').textContent).toContain('manquant');
    });

    it('puts error tone on the default tab of a required empty field', () => {
        const { tab, host, field, detect } = render({ value: { ar: 'نص' }, required: true });
        field().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
        detect();
        expect(tab('fr').classList).toContain('is-danger');
        expect(tab('en').classList).not.toContain('is-danger');
        expect(host.querySelector('label')?.textContent).toContain('Titre');
    });

    it('shows no error tone before the field is touched, but always shows the missing note', () => {
        const { tab } = render({ value: { ar: 'نص' }, required: true });
        expect(tab('fr').classList).not.toContain('is-danger');
        expect(tab('fr').textContent).toContain('manquant');
    });

    it('shows the error tone once the user clears the default culture', () => {
        const { tab, type } = render({ value: { fr: 'Eau' }, required: true });
        type('');
        expect(tab('fr').classList).toContain('is-danger');
    });

    it('shows the error tone after markAllAsTouched() on the form', () => {
        @Component({
            standalone: true,
            imports: [EfLocalizedInputComponent, ReactiveFormsModule],
            template: `<form [formGroup]="form"><ef-localized-input name="title" required formControlName="title" /></form>`,
        })
        class Host { form = new FormGroup({ title: new FormControl<LocalizedText>({}, { nonNullable: true }) }); }
        setup();
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        const h = helpers(fixture.nativeElement, () => fixture.detectChanges());
        expect(h.tab('fr').classList).not.toContain('is-danger');
        fixture.componentInstance.form.markAllAsTouched();
        fixture.detectChanges();
        expect(h.tab('fr').classList).toContain('is-danger');
    });

    it('marks the form control touched only when focus leaves the whole field', () => {
        @Component({
            standalone: true,
            imports: [EfLocalizedInputComponent, ReactiveFormsModule],
            template: `<ef-localized-input name="title" [formControl]="ctrl" /><button id="outside">x</button>`,
        })
        class Host { ctrl = new FormControl<LocalizedText>({}, { nonNullable: true }); }
        setup();
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        const h = helpers(fixture.nativeElement, () => fixture.detectChanges());
        const ctrl = fixture.componentInstance.ctrl;
        h.tab('fr').dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: h.field() }));
        expect(ctrl.touched).toBe(false);
        const outside = (fixture.nativeElement as HTMLElement).querySelector('#outside');
        h.field().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
        expect(ctrl.touched).toBe(true);
    });

    it('drops the error tone once the default culture has text', () => {
        const { tab } = render({ value: { fr: 'Eau' }, required: true });
        expect(tab('fr').classList).not.toContain('is-danger');
    });

    it('gives Arabic controls dir=rtl lang=ar', () => {
        for (const mode of ['text', 'textarea'] as const) {
            TestBed.resetTestingModule();
            const { select, field } = render({ mode });
            select('ar');
            expect(field().closest('[dir]')?.getAttribute('dir')).toBe('rtl');
            expect(field().getAttribute('lang')).toBe('ar');
        }
    });

    it('keeps the html source ltr for Arabic and previews rtl', () => {
        const { select, field, host } = render({ mode: 'html', value: { ar: '<p>عطر</p>' } });
        select('ar');
        expect(field().tagName).toBe('TEXTAREA');
        expect(field().closest('[dir]')?.getAttribute('dir')).toBe('ltr');
        const preview = host.querySelector<HTMLElement>('[data-preview]')!;
        expect(preview.getAttribute('dir')).toBe('rtl');
        expect(preview.getAttribute('lang')).toBe('ar');
        expect(preview.querySelector('p')?.textContent).toBe('عطر');
    });

    it('sanitises the html preview', () => {
        const { host } = render({ mode: 'html', value: { fr: '<p>ok</p><script>alert(1)</script>' } });
        const preview = host.querySelector<HTMLElement>('[data-preview]')!;
        expect(preview.querySelector('script')).toBeNull();
        expect(preview.textContent).toContain('ok');
    });

    it('emits the whole cleaned object on edit', () => {
        const { select, type, emitted } = render({ value: { fr: 'Eau', ar: 'ماء', en: 'Water' } });
        select('ar');
        type('');
        expect(emitted.at(-1)).toEqual({ fr: 'Eau', en: 'Water' });
        select('en');
        type('  Fresh water ');
        expect(emitted.at(-1)).toEqual({ fr: 'Eau', en: 'Fresh water' });
    });

    it('keeps a culture that is not listed unchanged in every emitted object', () => {
        const { select, type, emitted } = render({ value: { fr: 'Eau', de: 'Wasser' } });
        select('ar');
        type('ماء');
        expect(emitted.at(-1)).toEqual({ fr: 'Eau', de: 'Wasser', ar: 'ماء' });
        select('fr');
        type('');
        expect(emitted.at(-1)).toEqual({ de: 'Wasser', ar: 'ماء' });
    });

    it('keeps a typed trailing space when the parent echoes the cleaned value back', () => {
        const { type, field, fixture, detect, emitted } = render({ value: { fr: '' } });
        type('Eau ');
        (fixture as { componentRef: { setInput(k: string, v: unknown): void } }).componentRef.setInput('value', emitted.at(-1));
        detect();
        expect(field().value).toBe('Eau ');
        // A new object that only differs by blank space is the same text too.
        (fixture as { componentRef: { setInput(k: string, v: unknown): void } }).componentRef.setInput('value', { fr: 'Eau' });
        detect();
        expect(field().value).toBe('Eau ');
    });

    it('replaces the text when a different value arrives', () => {
        const { field, fixture, detect } = render({ value: { fr: 'Eau' } });
        (fixture as { componentRef: { setInput(k: string, v: unknown): void } }).componentRef.setInput('value', { fr: 'Parfum' });
        detect();
        expect(field().value).toBe('Parfum');
    });

    it('marks a culture edited since the value arrived as dirty', () => {
        const { select, type, tab, fixture, detect, emitted } = render({ value: { fr: 'Eau' } });
        expect(tab('fr').querySelector('.ef-tabs__dot')).toBeNull();
        select('ar');
        type('ماء');
        (fixture as { componentRef: { setInput(k: string, v: unknown): void } }).componentRef.setInput('value', emitted.at(-1));
        detect();
        expect(tab('ar').querySelector('.ef-tabs__dot')).not.toBeNull();
        expect(tab('fr').querySelector('.ef-tabs__dot')).toBeNull();
        // A reload from the server starts clean again.
        (fixture as { componentRef: { setInput(k: string, v: unknown): void } }).componentRef.setInput('value', { fr: 'Eau', ar: 'ماء' });
        detect();
        expect(tab('ar').querySelector('.ef-tabs__dot')).toBeNull();
    });

    it('shows a read-only culture read-only with the hint', () => {
        const { field, host, select, type, emitted } = render({ value: { fr: 'Eau' }, readOnlyCultures: ['fr'] });
        // readonly, not disabled: it stays in the tab order, so its hint is
        // read and its text can be selected and copied.
        expect(field().readOnly).toBe(true);
        expect(field().disabled).toBe(false);
        expect(field().getAttribute('aria-describedby')).toContain(host.querySelector('.ef-field-hint')!.id);
        expect(host.querySelector('.ef-field-hint')?.textContent).toContain('Géré par le catalogue');
        select('ar');
        expect(field().readOnly).toBe(false);
        expect(host.querySelector('.ef-field-hint')).toBeNull();
        type('ماء');
        // The read-only culture's text still travels in the whole object.
        expect(emitted.at(-1)).toEqual({ fr: 'Eau', ar: 'ماء' });
    });

    it('disables every culture under efReadOnly, and keeps the tabs usable', () => {
        @Component({
            standalone: true,
            imports: [EfLocalizedInputComponent, EfReadOnlyDirective],
            template: `<div [efReadOnly]="ro()"><ef-localized-input name="title" [value]="{ fr: 'Eau' }" /></div>`,
        })
        class Host { ro = signal(true); }
        setup();
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        const h = helpers(fixture.nativeElement, () => fixture.detectChanges());
        for (const code of ['fr', 'ar', 'en']) {
            expect(h.tab(code).disabled).toBe(false);
            h.select(code);
            expect(h.field().disabled).toBe(true);
        }
        fixture.componentInstance.ro.set(false);
        fixture.detectChanges();
        expect(h.field().disabled).toBe(false);
    });

    it('shows the counter against advisedLength and caps at maxLength', () => {
        const { host, field, type } = render({ value: { fr: 'abc' }, advisedLength: 5, maxLength: 10 });
        const counter = host.querySelector<HTMLElement>('[data-counter]')!;
        expect(counter.textContent?.trim()).toBe('3 / 5');
        expect(field().getAttribute('maxlength')).toBe('10');
        expect(field().getAttribute('aria-describedby')).toContain(counter.id);
        type('abcdef');
        expect(host.querySelector('[data-counter]')!.textContent?.trim()).toBe('6 / 5');
        expect(host.querySelector('[data-counter]')!.classList).toContain('is-over');
    });

    it('says the limit as text, and announces when it is passed, with the keys it is given', () => {
        const { host, fixture, field, type } = render({
            value: { fr: 'abc' },
            advisedLength: 5,
            counterHintKey: 'hint_key',
            counterOverKey: 'over_key',
        });
        const counter = host.querySelector<HTMLElement>('[data-counter]')!;
        expect(counter.querySelector('.eli-counter__sr')?.textContent).toContain('hint_key');
        expect(field().getAttribute('aria-describedby')).toContain(counter.id);
        const live = host.querySelector<HTMLElement>('[data-over-message]')!;
        expect(live.getAttribute('aria-live')).toBe('polite');
        expect(live.textContent?.trim()).toBe('');
        type('abcdef');
        expect(host.querySelector<HTMLElement>('[data-over-message]')).toBe(live);
        expect(live.textContent).toContain('over_key');
        expect(fixture).toBeTruthy();
    });

    it('adds no spoken text without the keys', () => {
        const { host } = render({ value: { fr: 'abcdef' }, advisedLength: 5 });
        expect(host.querySelector('.eli-counter__sr')).toBeNull();
        expect(host.querySelector('[data-over-message]')).toBeNull();
    });

    it('renders no counter without a length', () => {
        const { host } = render();
        expect(host.querySelector('[data-counter]')).toBeNull();
    });

    it('links the tabs and the panel for assistive tech', () => {
        const { host, tab, select } = render();
        const panel = host.querySelector<HTMLElement>('[role="tabpanel"]')!;
        expect(tab('fr').getAttribute('aria-controls')).toBe(panel.id);
        expect(panel.getAttribute('aria-labelledby')).toBe(tab('fr').id);
        expect(host.querySelector('[role="tablist"]')!.getAttribute('aria-label')).toBe('Titre');
        select('en');
        expect(panel.getAttribute('aria-labelledby')).toBe(tab('en').id);
        const label = host.querySelector('label')!;
        expect(label.getAttribute('for')).toBe(host.querySelector('[role="tabpanel"] input')!.id);
    });

    it('names the tablist with a translated fallback when there is no label', () => {
        const { host } = render({ labelKey: '' });
        expect(host.querySelector('[role="tablist"]')!.getAttribute('aria-label')).toBe('Langues du texte');
    });

    it('uses the given cultures and their default', () => {
        const { tabs } = render({ cultures: [{ code: 'ar', labelKey: 'ef_localized_input_culture_ar', dir: 'rtl' }] });
        expect(tabs().map(t => t.id.split('-tab-')[1])).toEqual(['ar']);
        expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    });

    it('works with a reactive FormControl, including disable()', () => {
        @Component({
            standalone: true,
            imports: [EfLocalizedInputComponent, ReactiveFormsModule],
            template: `<ef-localized-input name="title" [formControl]="ctrl" />`,
        })
        class Host { ctrl = new FormControl<LocalizedText>({ fr: 'Eau' }, { nonNullable: true }); }
        setup();
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        const h = helpers(fixture.nativeElement, () => fixture.detectChanges());
        expect(h.field().value).toBe('Eau');
        h.select('ar');
        h.type('ماء');
        expect(fixture.componentInstance.ctrl.value).toEqual({ fr: 'Eau', ar: 'ماء' });
        fixture.componentInstance.ctrl.setValue({ fr: 'Parfum' });
        h.select('fr');
        expect(h.field().value).toBe('Parfum');
        fixture.componentInstance.ctrl.disable();
        fixture.detectChanges();
        expect(h.field().disabled).toBe(true);
    });

    it('works with ngModel', async () => {
        @Component({
            standalone: true,
            imports: [EfLocalizedInputComponent, FormsModule],
            template: `<ef-localized-input name="title" [(ngModel)]="model" />`,
        })
        class Host { model: LocalizedText = { fr: 'Eau' }; }
        setup();
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const h = helpers(fixture.nativeElement, () => fixture.detectChanges());
        expect(h.field().value).toBe('Eau');
        h.type('Eau douce');
        expect(fixture.componentInstance.model).toEqual({ fr: 'Eau douce' });
    });

    it('fails required form validation while the default culture is empty', () => {
        @Component({
            standalone: true,
            imports: [EfLocalizedInputComponent, ReactiveFormsModule],
            template: `<ef-localized-input name="title" required [formControl]="ctrl" />`,
        })
        class Host { ctrl = new FormControl<LocalizedText>({ ar: 'ماء' }, { nonNullable: true }); }
        setup();
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        const ctrl = fixture.componentInstance.ctrl;
        expect(ctrl.hasError('required')).toBe(true);
        const h = helpers(fixture.nativeElement, () => fixture.detectChanges());
        h.type('Eau');
        expect(ctrl.valid).toBe(true);
    });

    it('revalidates the form control when the default culture changes', () => {
        const AR = { code: 'ar', labelKey: 'ef_localized_input_culture_ar', dir: 'rtl' as const };
        const FR = { code: 'fr', labelKey: 'ef_localized_input_culture_fr', dir: 'auto' as const };
        @Component({
            standalone: true,
            imports: [EfLocalizedInputComponent, ReactiveFormsModule],
            template: `<ef-localized-input name="title" required [cultures]="list()" [formControl]="ctrl" />`,
        })
        class Host { list = signal([AR]); ctrl = new FormControl<LocalizedText>({ ar: 'ماء' }, { nonNullable: true }); }
        setup();
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        expect(fixture.componentInstance.ctrl.valid).toBe(true);
        fixture.componentInstance.list.set([FR, AR]);
        fixture.detectChanges();
        expect(fixture.componentInstance.ctrl.hasError('required')).toBe(true);
    });

    it('does not validate a field that is not required', () => {
        @Component({
            standalone: true,
            imports: [EfLocalizedInputComponent, ReactiveFormsModule],
            template: `<ef-localized-input name="title" [formControl]="ctrl" />`,
        })
        class Host { ctrl = new FormControl<LocalizedText>({}, { nonNullable: true }); }
        setup();
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        expect(fixture.componentInstance.ctrl.valid).toBe(true);
    });
});
