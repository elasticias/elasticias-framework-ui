import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

let nextId = 0;

/** Cuts at a code point count (never inside a surrogate pair) and adds an ellipsis. */
function clip(text: string | null | undefined, max: number | null): string {
    const value = (text ?? '').trim();
    if (max === null || max < 0) return value;
    const chars = Array.from(value);
    return chars.length > max ? `${chars.slice(0, max).join('').trimEnd()}…` : value;
}

/**
 * What a search engine would show for a page: the title, the address and the
 * description, cut where the engine cuts them (60 and 160 characters, the
 * same figures the SEO counters advise). One preview for every SEO card.
 *
 * It depicts a search result, so it keeps its own light surface and the
 * familiar link colours in both themes. The address is always left to right;
 * the title and description follow the direction of their own text, so an
 * Arabic page previews right to left inside an LTR or RTL app.
 *
 * ```html
 * <ef-seo-preview
 *     [pageTitle]="seoTitle() || title()"
 *     [url]="'shop.example/collections/' + slug()"
 *     [description]="seoDescription() || description()"
 *     contentLang="fr" />
 * ```
 */
@Component({
    selector: 'ef-seo-preview',
    standalone: true,
    imports: [TranslateModule],
    templateUrl: './ef-seo-preview.component.html',
    styleUrl: './ef-seo-preview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ef-seo-preview',
        role: 'group',
        '[attr.aria-labelledby]': 'labelId',
    },
})
export class EfSeoPreviewComponent {
    /** The page title. Named `pageTitle` so it does not become the host's tooltip. */
    readonly pageTitle = input<string | null | undefined>('');
    /** The address as shown (no scheme needed), always rendered left to right. */
    readonly url = input<string | null | undefined>('');
    readonly description = input<string | null | undefined>('');
    /** i18n key of the small heading above the preview. */
    readonly labelKey = input('ef_seo_preview_label');
    /** Characters kept of the title; `null` shows it whole. */
    readonly titleMaxLength = input<number | null>(60);
    /** Characters kept of the description; `null` shows it whole. */
    readonly descriptionMaxLength = input<number | null>(160);
    /** Language of the previewed text (`fr`, `ar`, `en`), for screen readers and hyphenation. */
    readonly contentLang = input<string | null>(null);

    protected readonly labelId = `ef-seo-preview-label-${++nextId}`;

    protected readonly shownTitle = computed(() => clip(this.pageTitle(), this.titleMaxLength()));
    protected readonly shownUrl = computed(() => (this.url() ?? '').trim());
    protected readonly shownDescription = computed(() => clip(this.description(), this.descriptionMaxLength()));
}
