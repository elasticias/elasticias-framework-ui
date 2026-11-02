import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfSeoPreviewComponent } from './ef-seo-preview.component';

/**
 * The search-result preview shared by the product and collection SEO cards:
 * what a search engine would show for a page, cut at the lengths it cuts at.
 */
describe('EfSeoPreviewComponent', () => {
    function render(inputs: Record<string, unknown>, lang = 'fr') {
        TestBed.configureTestingModule({ imports: [EfSeoPreviewComponent, TranslateModule.forRoot()] });
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('fr', { ef_seo_preview_label: 'Aperçu dans Google', custom_label: 'Aperçu perso' });
        translate.use(lang);
        const fixture = TestBed.createComponent(EfSeoPreviewComponent);
        for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;
        const q = (role: string) => host.querySelector<HTMLElement>(`[data-role="${role}"]`);
        return { fixture, host, q };
    }

    it('shows the title, the url and the description', () => {
        const { q } = render({ pageTitle: 'Escada', url: 'shop.test/collections/escada', description: 'Parfums' });
        expect(q('preview-title')?.textContent?.trim()).toBe('Escada');
        expect(q('preview-url')?.textContent?.trim()).toBe('shop.test/collections/escada');
        expect(q('preview-description')?.textContent?.trim()).toBe('Parfums');
    });

    it('translates its label from a default key', () => {
        expect(render({}).q('preview-label')?.textContent?.trim()).toBe('Aperçu dans Google');
    });

    it('translates its label from the key it is given', () => {
        expect(render({ labelKey: 'custom_label' }).q('preview-label')?.textContent?.trim()).toBe('Aperçu perso');
    });

    it('cuts the description at 160 characters with an ellipsis', () => {
        const { q } = render({ description: 'a'.repeat(200) });
        expect(q('preview-description')?.textContent?.trim()).toBe(`${'a'.repeat(160)}…`);
    });

    it('cuts the title at 60 characters with an ellipsis', () => {
        const { q } = render({ pageTitle: 'b'.repeat(80) });
        expect(q('preview-title')?.textContent?.trim()).toBe(`${'b'.repeat(60)}…`);
    });

    it('leaves text at the limit untouched', () => {
        const { q } = render({ pageTitle: 'b'.repeat(60), description: 'a'.repeat(160) });
        expect(q('preview-title')?.textContent?.trim()).toBe('b'.repeat(60));
        expect(q('preview-description')?.textContent?.trim()).toBe('a'.repeat(160));
    });

    it('takes the limits as inputs', () => {
        expect(render({ pageTitle: 'abcdefghij', titleMaxLength: 5 }).q('preview-title')?.textContent?.trim()).toBe('abcde…');
    });

    it('shows the text whole when the limit is null', () => {
        const { q } = render({ description: 'a'.repeat(300), descriptionMaxLength: null });
        expect(q('preview-description')?.textContent?.trim()).toBe('a'.repeat(300));
    });

    it('cuts Arabic text on a word edge without a dangling space before the ellipsis', () => {
        const { q } = render({ description: 'عطر شرقي فاخر', descriptionMaxLength: 4 });
        expect(q('preview-description')?.textContent?.trim()).toBe('عطر…');
    });

    it('keeps the url left to right and lets the text follow its own direction (RTL)', () => {
        const { q } = render({ pageTitle: 'عطور', url: 'shop.test/c/x', description: 'وصف' });
        expect(q('preview-url')?.getAttribute('dir')).toBe('ltr');
        expect(q('preview-title')?.getAttribute('dir')).toBe('auto');
        expect(q('preview-description')?.getAttribute('dir')).toBe('auto');
    });

    it('sets the language of the shown text when given', () => {
        const { q } = render({ contentLang: 'ar' });
        expect(q('preview-box')?.getAttribute('lang')).toBe('ar');
    });

    it('is a labelled group for assistive tech', () => {
        const { host, q } = render({});
        expect(host.getAttribute('role')).toBe('group');
        const labelId = host.getAttribute('aria-labelledby');
        expect(labelId).toBeTruthy();
        expect(q('preview-label')?.id).toBe(labelId);
    });

    it('renders empty lines as nothing, not as the word undefined', () => {
        const { host } = render({ pageTitle: null, url: undefined, description: null });
        expect(host.textContent).not.toContain('undefined');
        expect(host.textContent).not.toContain('null');
    });

    it('is mobile first: every text line can shrink and wrap, with no fixed width', () => {
        const { host } = render({ pageTitle: 'x', url: 'y', description: 'z' });
        expect(host.classList.contains('ef-seo-preview')).toBe(true);
        expect(host.querySelector('[style]')).toBeNull();
    });
});
