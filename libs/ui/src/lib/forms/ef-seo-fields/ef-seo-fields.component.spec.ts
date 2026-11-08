import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EF_DEFAULT_CONTENT_CULTURES } from '@elasticias/core';
import { EfServerErrorsDirective } from '../ef-server-errors.directive';
import { EF_SEO_DEFAULT_LOCALES, EfSeoFieldsComponent, EfSeoPatch } from './ef-seo-fields.component';

/** The SEO texts in every content language, each edited as one whole object. */
describe('EfSeoFieldsComponent', () => {
    function render(inputs: Record<string, unknown> = {}) {
        TestBed.configureTestingModule({ imports: [EfSeoFieldsComponent, TranslateModule.forRoot()] });
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('fr', {
            ef_localized_input_culture_fr: 'Français',
            ef_localized_input_counter_advised: '{{count}} / {{max}} conseillés',
            ef_localized_input_error_in_culture: '{{culture}} : {{message}}',
        });
        translate.use('fr');
        const fixture = TestBed.createComponent(EfSeoFieldsComponent);
        for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
        const patches: EfSeoPatch[] = [];
        fixture.componentInstance.seoChange.subscribe(p => patches.push(p));
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;
        const field = (name: string) => host.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
        const type = (name: string, value: string) => {
            const el = field(name);
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            fixture.detectChanges();
        };
        const select = (name: string, code: string) => {
            host.querySelector<HTMLElement>(`ef-localized-input[name="${name}"] [role="tab"][id$="-tab-${code}"]`)!.click();
            fixture.detectChanges();
        };
        const counter = (name: string) => host.querySelector<HTMLElement>(`ef-localized-input[name="${name}"] [data-counter]`)!;
        return { fixture, host, field, type, select, counter, patches };
    }

    it('emits seoTitle as a whole object', () => {
        const { type, patches } = render({ seoTitle: { fr: 'Escada', en: 'Escada EN' } });
        type('seoTitle.fr', 'Escada Sport');
        expect(patches.at(-1)).toEqual({ seoTitle: { fr: 'Escada Sport', en: 'Escada EN' } });
    });

    it('emits seoDescription as a whole object and removes a cleared language', () => {
        const { type, select, patches } = render({ seoDescription: { fr: 'Parfums', ar: 'عطور' } });
        select('seoDescription', 'ar');
        type('seoDescription.ar', '');
        expect(patches.at(-1)).toEqual({ seoDescription: { fr: 'Parfums' } });
        expect(Object.keys(patches.at(-1)!)).toEqual(['seoDescription']);
    });

    it('links seoDescription.en server error inline', () => {
        @Component({
            standalone: true,
            imports: [EfSeoFieldsComponent, EfServerErrorsDirective],
            template: `<div [efServerErrors]="errors"><ef-seo-fields /></div>`,
        })
        class Host {
            errors = { 'seoDescription.en': ['too long'] };
        }
        TestBed.configureTestingModule({ imports: [Host, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;
        const inline = host.querySelector('ef-localized-input[name="seoDescription"] textarea[name="seoDescription.en"]');
        expect(inline).toBeTruthy();
        expect(host.querySelector('ef-localized-input[name="seoDescription"]')!.textContent).toContain('too long');
        expect(host.querySelector('ef-localized-input[name="seoTitle"] [data-field-errors]')).toBeNull();
    });

    it('links a seoTitle.ar server error to the Arabic tab', () => {
        @Component({
            standalone: true,
            imports: [EfSeoFieldsComponent, EfServerErrorsDirective],
            template: `<div [efServerErrors]="errors"><ef-seo-fields /></div>`,
        })
        class Host {
            errors = { 'seoTitle.ar': ['bad'] };
        }
        TestBed.configureTestingModule({ imports: [Host, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;
        expect(host.querySelector('ef-localized-input[name="seoTitle"] input[name="seoTitle.ar"]')).toBeTruthy();
    });

    it('preview falls back to fallbackTitle default culture', () => {
        const { host } = render({
            fallbackTitle: { fr: 'Escada', ar: 'إسكادا' },
            fallbackDescription: { fr: 'Parfums', ar: 'عطور' },
            previewUrl: 'shop.test/c/escada',
        });
        expect(host.querySelector('[data-role="preview-title"]')?.textContent?.trim()).toBe('Escada');
        expect(host.querySelector('[data-role="preview-description"]')?.textContent?.trim()).toBe('Parfums');
        expect(host.querySelector('[data-role="preview-url"]')?.textContent?.trim()).toBe('shop.test/c/escada');
    });

    it('previews the default culture of the SEO text before the fallback', () => {
        const { host } = render({
            seoTitle: { fr: 'Titre SEO', ar: 'عنوان' },
            fallbackTitle: { fr: 'Escada' },
        });
        expect(host.querySelector('[data-role="preview-title"]')?.textContent?.trim()).toBe('Titre SEO');
    });

    it('previews the default of the cultures it is given', () => {
        const { host } = render({
            cultures: [
                { code: 'ar', labelKey: 'ef_localized_input_culture_ar', dir: 'rtl' },
                { code: 'en', labelKey: 'ef_localized_input_culture_en', dir: 'ltr' },
            ],
            fallbackTitle: { fr: 'Escada', ar: 'إسكادا' },
        });
        // The shared default is fr, which this list lacks, so its first culture leads.
        expect(host.querySelector('[data-role="preview-title"]')?.textContent?.trim()).toBe('إسكادا');
    });

    it('counter warns past the advised length', () => {
        const { counter } = render({ seoTitle: { fr: 'a'.repeat(61) }, seoDescription: { fr: 'b'.repeat(160) } });
        expect(counter('seoTitle').querySelector('[data-counter-text]')?.textContent?.trim()).toBe('61 / 60 conseillés');
        expect(counter('seoTitle').classList).toContain('is-over');
        expect(counter('seoDescription').classList).not.toContain('is-over');
    });

    it('says the limit as text and announces the moment it is passed', () => {
        const { host, counter, field, type } = render({ seoTitle: { fr: 'a'.repeat(60) } });
        const c = counter('seoTitle');
        expect(c.querySelector('.eli-counter__sr')?.textContent).toContain('ef_seo_fields_counter_hint');
        expect(field('seoTitle.fr').getAttribute('aria-describedby')).toContain(c.id);
        const live = host.querySelector<HTMLElement>('ef-localized-input[name="seoTitle"] [data-over-message]')!;
        expect(live.textContent).not.toContain('ef_seo_fields_over_hint');
        type('seoTitle.fr', 'a'.repeat(61));
        expect(live.textContent?.trim()).toBe('Français : ef_seo_fields_over_hint');
        expect(live.getAttribute('aria-live')).toBe('polite');
    });

    it('caps the fields at the server limits', () => {
        const { field } = render();
        expect(field('seoTitle.fr').getAttribute('maxlength')).toBe('256');
        expect(field('seoDescription.fr').getAttribute('maxlength')).toBe('512');
    });

    it('takes the length inputs', () => {
        const { field, counter } = render({ titleMax: 100, descriptionMax: 200, titleAdvised: 30, descriptionAdvised: 80 });
        expect(field('seoTitle.fr').getAttribute('maxlength')).toBe('100');
        expect(field('seoDescription.fr').getAttribute('maxlength')).toBe('200');
        expect(counter('seoTitle').textContent).toContain('0 / 30');
        expect(counter('seoDescription').textContent).toContain('0 / 80');
    });

    it('shares the content cultures with the localized input', () => {
        expect(EF_SEO_DEFAULT_LOCALES).toBe(EF_DEFAULT_CONTENT_CULTURES);
    });
});
