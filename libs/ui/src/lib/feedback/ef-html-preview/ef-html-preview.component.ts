import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Shows a complete HTML document (an email template, rendered with sample
 * data) inside a frame that cannot act.
 *
 * The frame's `sandbox` attribute is written in the template and empty, and
 * no input reaches it: the document runs no script, has an opaque origin
 * (no cookies, no storage, no access to the parent), cannot submit a form,
 * open a popup or navigate the top window. The document comes from
 * `srcdoc`, so there is no URL to load and no new origin for the CSP; it
 * inherits the host page's policy, whose `style-src 'unsafe-inline'` lets
 * the template's own styles apply.
 *
 * The frame always has an accessible name (WCAG 4.1.2): `titleKey`, or the
 * shared `preview.title` key when none is given. Consuming apps define it:
 * fr "Aperçu", ar "معاينة", en "Preview".
 *
 * `width: 100%` and `min-width: 0` keep a 600px email table scrolling inside
 * the frame on a phone instead of widening the page.
 *
 * ```html
 * <ef-html-preview [html]="previewHtml()" titleKey="email_templates_preview_title" [height]="560" />
 * ```
 */
/** The title key the frame falls back to; apps add it to fr.json, ar.json and en.json. */
export const EF_HTML_PREVIEW_DEFAULT_TITLE_KEY = 'preview.title';

@Component({
    selector: 'ef-html-preview',
    standalone: true,
    imports: [TranslateModule],
    template: `<iframe
        class="ef-html-preview__frame"
        sandbox=""
        referrerpolicy="no-referrer"
        [srcdoc]="trustedHtml()"
        [attr.title]="effectiveTitleKey() | translate"
        [style.height.px]="height()"
    ></iframe>`,
    styleUrl: './ef-html-preview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfHtmlPreviewComponent {
    /** The full document to show. Sanitized by the server before it gets here. */
    readonly html = input<string>('');
    /** i18n key of the frame's accessible title; `preview.title` when empty. */
    readonly titleKey = input<string>('');
    /** Frame height in pixels. */
    readonly height = input<number>(480);

    private readonly sanitizer = inject(DomSanitizer);

    protected readonly effectiveTitleKey = computed(() => this.titleKey() || EF_HTML_PREVIEW_DEFAULT_TITLE_KEY);

    /**
     * Angular's sanitizer strips every `style` attribute and `<style>` block
     * from a bound `srcdoc`, which would preview an email without its
     * layout, so the HTML is trusted explicitly. The guarantee is the frame's
     * empty sandbox: nothing in the document can run, submit, open a window
     * or reach this page, even for raw author HTML of an unsaved edit. The
     * server's sanitization of stored templates is a second layer, not the
     * reason this is safe. Never reuse this bypass for markup rendered
     * outside such a frame.
     */
    protected readonly trustedHtml = computed<SafeHtml>(() =>
        this.sanitizer.bypassSecurityTrustHtml(this.html() ?? ''),
    );
}
