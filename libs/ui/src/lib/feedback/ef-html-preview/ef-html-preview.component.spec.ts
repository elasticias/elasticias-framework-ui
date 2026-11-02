import { reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfHtmlPreviewComponent } from './ef-html-preview.component';

/**
 * The preview shows template HTML the server sanitized but a user wrote. It
 * lives in a frame with an empty `sandbox` (no scripts, no same origin, no
 * forms, no popups) and its document comes from `srcdoc`, so it has no URL
 * and no new origin for the CSP.
 */
describe('EfHtmlPreviewComponent', () => {
    const html =
        '<style>p { color: #123456; }</style>' +
        '<p style="color: red; font-weight: 700">Bonjour {{customer_name}}</p>';

    function render(inputs: Record<string, unknown> = {}) {
        TestBed.configureTestingModule({ imports: [EfHtmlPreviewComponent, TranslateModule.forRoot()] });
        TestBed.inject(TranslateService).setTranslation('fr', { preview_title: 'Aperçu du message', ef_html_preview_title: 'Aperçu' });
        TestBed.inject(TranslateService).use('fr');
        const fixture = TestBed.createComponent(EfHtmlPreviewComponent);
        fixture.componentRef.setInput('html', html);
        for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;
        return { fixture, host, frame: host.querySelector('iframe') as HTMLIFrameElement };
    }

    function srcdocOf(frame: HTMLIFrameElement): string {
        return frame.getAttribute('srcdoc') ?? frame.srcdoc ?? '';
    }

    it('ef-html-preview renders an iframe whose sandbox attribute is present and empty', () => {
        const { frame } = render();
        expect(frame).toBeTruthy();
        expect(frame.hasAttribute('sandbox')).toBe(true);
        expect(frame.getAttribute('sandbox')).toBe('');
        expect(frame.hasAttribute('src')).toBe(false);
    });

    it('ef-html-preview exposes no input that could loosen the sandbox', () => {
        // Any new input is a deliberate contract change; none may reach the frame's flags.
        const inputs = (reflectComponentType(EfHtmlPreviewComponent)?.inputs ?? []).map((i) => i.propName);
        expect(inputs.sort()).toEqual(['height', 'html', 'titleKey']);
        expect(render().frame.getAttribute('sandbox')).toBe('');
    });

    it('ef-html-preview keeps inline styles in srcdoc', () => {
        const { frame } = render();
        const doc = srcdocOf(frame);
        expect(doc).toContain('style="color: red; font-weight: 700"');
        expect(doc).toContain('<style>p { color: #123456; }</style>');
        expect(doc).toContain('Bonjour {{customer_name}}');
    });

    it('ef-html-preview follows a change of html', () => {
        const { fixture, frame } = render();
        fixture.componentRef.setInput('html', '<p>Merci</p>');
        fixture.detectChanges();
        expect(srcdocOf(frame)).toBe('<p>Merci</p>');
    });

    it('ef-html-preview titles the frame from titleKey', () => {
        const { frame } = render({ titleKey: 'preview_title' });
        expect(frame.getAttribute('title')).toBe('Aperçu du message');
    });

    it('ef-html-preview always names the frame, with ef_html_preview_title by default', () => {
        // An iframe without a title fails WCAG 4.1.2.
        expect(render().frame.getAttribute('title')).toBe('Aperçu');
        TestBed.resetTestingModule();
        expect(render({ titleKey: '' }).frame.getAttribute('title')).toBe('Aperçu');
    });

    it('ef-html-preview is 480px tall by default and takes a height', () => {
        expect(render().frame.style.height).toBe('480px');
        TestBed.resetTestingModule();
        expect(render({ height: 320 }).frame.style.height).toBe('320px');
    });

    it('ef-html-preview does not widen its host at 390', () => {
        // jsdom has no layout: assert the rules that keep a 600px email
        // table from sizing the column (the frame scrolls inside itself).
        const { host, frame } = render();
        const hostStyle = getComputedStyle(host);
        expect(hostStyle.display).toBe('block');
        expect(hostStyle.minWidth).toBe('0');
        const frameStyle = getComputedStyle(frame);
        expect(frameStyle.width).toBe('100%');
        expect(frameStyle.display).toBe('block');
        expect(frameStyle.maxWidth).toBe('100%');
    });
});
