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
 * `width: 100%` and `min-width: 0` keep a 600px email table scrolling inside
 * the frame on a phone instead of widening the page.
 *
 * ```html
 * <ef-html-preview [html]="previewHtml()" titleKey="email_templates_preview_title" [height]="560" />
 * ```
 */
@Component({
    selector: 'ef-html-preview',
    standalone: true,
    imports: [TranslateModule],
    template: `<iframe
        class="ef-html-preview__frame"
        sandbox=""
        referrerpolicy="no-referrer"
        [srcdoc]="trustedHtml()"
        [attr.title]="titleKey() ? (titleKey() | translate) : null"
        [style.height.px]="height()"
    ></iframe>`,
    styleUrl: './ef-html-preview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfHtmlPreviewComponent {
    /** The full document to show. Sanitized by the server before it gets here. */
    readonly html = input<string>('');
    /** i18n key of the frame's accessible title. */
    readonly titleKey = input<string>('');
    /** Frame height in pixels. */
    readonly height = input<number>(480);

    private readonly sanitizer = inject(DomSanitizer);

    /**
     * Angular's sanitizer strips every `style` attribute and `<style>` block
     * from a bound `srcdoc`, which would preview an email without its
     * layout. Bypassing it is justified only because the frame's sandbox is
     * empty (nothing in the document can run or reach this page) and the
     * server sanitizes the template HTML before storing and rendering it.
     * Do not reuse this bypass for markup rendered outside such a frame.
     */
    protected readonly trustedHtml = computed<SafeHtml>(() =>
        this.sanitizer.bypassSecurityTrustHtml(this.html() ?? ''),
    );
}
