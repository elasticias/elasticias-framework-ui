import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EfServerErrorsDirective } from '../ef-server-errors.directive';
import { EfSeoFieldsComponent, EfSeoPatch } from './ef-seo-fields.component';

/** The SEO texts per language, shared by every entity the shop shows. */
describe('EfSeoFieldsComponent', () => {
    function render(inputs: Record<string, unknown> = {}) {
        TestBed.configureTestingModule({ imports: [EfSeoFieldsComponent, TranslateModule.forRoot()] });
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
        return { fixture, host, field, type, patches };
    }

    it('emits a French title as the scalar', () => {
        const { type, patches } = render();
        type('seoTitle', 'Escada');
        expect(patches.at(-1)).toEqual({ seoTitle: 'Escada' });
    });

    it('removes a cleared Arabic translation', () => {
        const { type, patches } = render({ seoTitleTranslations: { ar: 'عطور', en: 'Perfumes' } });
        type('seoTitleAr', '');
        expect(patches.at(-1)).toEqual({ seoTitleTranslations: { en: 'Perfumes' } });
    });

    it('adds an English description to the dictionary', () => {
        const { type, patches } = render({ seoDescriptionTranslations: { ar: 'وصف' } });
        type('seoDescriptionEn', 'Fine perfumes');
        expect(patches.at(-1)).toEqual({ seoDescriptionTranslations: { ar: 'وصف', en: 'Fine perfumes' } });
    });

    it('counter warns past the advised length', () => {
        const { host } = render({ seoTitle: 'a'.repeat(61), seoDescription: 'b'.repeat(160) });
        const title = host.querySelector('[data-counter="fr-title"]')!;
        const description = host.querySelector('[data-counter="fr-description"]')!;
        expect(title.textContent?.trim()).toBe('61 / 60');
        expect(title.classList).toContain('is-over');
        expect(description.classList).not.toContain('is-over');
    });

    it('colours an over-limit counter with the warning token, not the default', () => {
        const { host } = render({ seoTitle: 'a'.repeat(61), seoDescription: 'b' });
        const over = host.querySelector<HTMLElement>('[data-counter="fr-title"]')!;
        const ok = host.querySelector<HTMLElement>('[data-counter="fr-description"]')!;
        expect(getComputedStyle(over).color).toBe('var(--st-pending-fg)');
        expect(getComputedStyle(ok).color).not.toBe('var(--st-pending-fg)');
    });

    it('links each counter to its field and says the limit as text', () => {
        const { host, field } = render({ seoTitle: 'a'.repeat(61) });
        const counter = host.querySelector<HTMLElement>('[data-counter="fr-title"]')!;
        expect(counter.id).toBeTruthy();
        expect(field('seoTitle').getAttribute('aria-describedby')).toContain(counter.id);
        expect(counter.querySelector('.seo-counter__sr')?.textContent).toContain('ef_seo_fields_counter_hint');
        expect(counter.querySelector('.seo-counter__sr')?.textContent).toContain('ef_seo_fields_over_hint');
        const ok = host.querySelector<HTMLElement>('[data-counter="fr-description"]')!;
        expect(ok.querySelector('.seo-counter__sr')?.textContent).not.toContain('ef_seo_fields_over_hint');
    });

    it('keeps the counter digits left to right in an RTL page', () => {
        const { host } = render({ seoTitle: 'a'.repeat(74) });
        const bdi = host.querySelector('[data-counter="fr-title"] bdi')!;
        expect(bdi.getAttribute('dir')).toBe('ltr');
        expect(bdi.textContent?.trim()).toBe('74 / 60');
    });

    it('names the French controls for server errors', () => {
        const { field } = render();
        expect(field('seoTitle')).toBeTruthy();
        expect(field('seoDescription')).toBeTruthy();
        expect(field('seoTitleAr')).toBeTruthy();
        expect(field('seoDescriptionEn')).toBeTruthy();
    });

    it('renders rtl for Arabic', () => {
        const { host } = render();
        expect(host.querySelector('[name="seoTitleAr"]')!.closest('[dir]')?.getAttribute('dir')).toBe('rtl');
        expect(host.querySelector('[name="seoTitleEn"]')!.closest('[dir]')?.getAttribute('dir')).toBe('ltr');
    });

    it('caps the fields at the server limits', () => {
        const { field } = render();
        expect(field('seoTitle').getAttribute('maxlength')).toBe('256');
        expect(field('seoDescription').getAttribute('maxlength')).toBe('512');
    });

    it('previews the fallback when the French texts are empty', () => {
        const { host } = render({ fallbackTitle: 'Escada', fallbackDescription: 'Parfums', previewUrl: 'shop.test/c/escada' });
        expect(host.querySelector('[data-role="preview-title"]')?.textContent?.trim()).toBe('Escada');
        expect(host.querySelector('[data-role="preview-url"]')?.textContent?.trim()).toBe('shop.test/c/escada');
    });

    it('links server errors on the French control by name', () => {
        @Component({
            standalone: true,
            imports: [EfSeoFieldsComponent, EfServerErrorsDirective],
            template: `<div [efServerErrors]="errors"><ef-seo-fields /></div>`,
        })
        class Host {
            errors = { seoTitle: ['too long'] };
        }
        TestBed.configureTestingModule({ imports: [Host, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('too long');
    });
});
