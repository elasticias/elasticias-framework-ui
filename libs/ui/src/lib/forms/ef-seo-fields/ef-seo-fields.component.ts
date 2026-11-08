import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EF_CONTENT_CULTURES, EF_DEFAULT_CONTENT_CULTURES, type EfCulture } from '@elasticias/core';
import type { LocalizedText } from '@elasticias/types';
import { EfSeoPreviewComponent } from '../../data/ef-seo-preview/ef-seo-preview.component';
import { EfLocalizedInputComponent } from '../ef-localized-input/ef-localized-input.component';

/** A language the SEO texts are written in: the same shape as every content culture. */
export type EfSeoLocale = EfCulture;

/**
 * What the fields write back: the whole object of the field that changed,
 * blank languages removed. Only the field that changed is present.
 */
export interface EfSeoPatch {
    seoTitle?: LocalizedText;
    seoDescription?: LocalizedText;
}

/**
 * The content cultures the SEO fields start from, shared with `ef-localized-input`.
 * @deprecated use `EF_DEFAULT_CONTENT_CULTURES` from `@elasticias/core`.
 */
export const EF_SEO_DEFAULT_LOCALES: ReadonlyArray<EfSeoLocale> = EF_DEFAULT_CONTENT_CULTURES;

/**
 * SEO title and description in every content language, each an
 * `ef-localized-input` with a counter against what a search engine shows
 * (60 / 160, read out to screen readers), capped at the server's limits
 * (256 / 512), and the shared `ef-seo-preview` of the default language's
 * result with the entity's own title and description as the fallback the shop
 * uses. Card-less: each screen wraps it in its own `ef-card`.
 *
 * The controls are named `seoTitle` and `seoDescription`, so under
 * `[efServerErrors]` a `seoTitle.ar` error lands on the Arabic tab and shows
 * under its field. Languages come from `EF_CONTENT_CULTURES` unless `cultures`
 * is set.
 *
 * i18n keys the app's bundles must define, besides those of
 * `ef-localized-input`:
 *
 * | key | fr | ar | en |
 * |---|---|---|---|
 * | `ef_seo_fields_title_label` | Titre SEO | عنوان SEO | SEO title |
 * | `ef_seo_fields_description_label` | Description SEO | وصف SEO | SEO description |
 * | `ef_seo_fields_counter_hint` | Au-delà de {{max}} caractères, Google coupe le texte. | بعد {{max}} حرفا، يقتطع Google النص. | Past {{max}} characters, Google cuts the text. |
 * | `ef_seo_fields_over_hint` | Le texte dépasse {{max}} caractères. | النص يتجاوز {{max}} حرفا. | The text is over {{max}} characters. |
 * | `ef_seo_fields_preview` | Aperçu dans Google | المعاينة في Google | Google preview |
 * | `ef_seo_fields_fallback_hint` | Vide : la boutique reprend le titre et la description. | فارغ: يستخدم المتجر العنوان والوصف. | Empty: the shop uses the title and description. |
 *
 * ```html
 * <ef-seo-fields [seoTitle]="p.seoTitle" [seoDescription]="p.seoDescription"
 *     [fallbackTitle]="p.title" [fallbackDescription]="p.description"
 *     [previewUrl]="url()" (seoChange)="patch($event)" />
 * ```
 */
@Component({
    selector: 'ef-seo-fields',
    standalone: true,
    imports: [TranslateModule, EfLocalizedInputComponent, EfSeoPreviewComponent],
    templateUrl: './ef-seo-fields.component.html',
    styleUrl: './ef-seo-fields.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfSeoFieldsComponent {
    readonly seoTitle = input<LocalizedText | null | undefined>(null);
    readonly seoDescription = input<LocalizedText | null | undefined>(null);
    /** The entity's own texts, which the shop uses when SEO is empty. */
    readonly fallbackTitle = input<LocalizedText | null | undefined>(null);
    readonly fallbackDescription = input<LocalizedText | null | undefined>(null);
    /** The page address shown in the preview, computed by the app. */
    readonly previewUrl = input<string>('');
    readonly titleMax = input(256);
    readonly descriptionMax = input(512);
    readonly titleAdvised = input(60);
    readonly descriptionAdvised = input(160);
    /** Overrides the `EF_CONTENT_CULTURES` list for both fields. */
    readonly cultures = input<ReadonlyArray<EfSeoLocale> | undefined>(undefined);

    readonly seoChange = output<EfSeoPatch>();

    private readonly contentCultures = inject(EF_CONTENT_CULTURES);

    /** The language the preview shows: the tenant's default if listed, else the first listed. */
    protected readonly previewCode = computed(() => {
        const list = this.cultures() ?? this.contentCultures().cultures;
        const preferred = this.contentCultures().defaultCulture;
        return list.some(c => c.code === preferred) ? preferred : (list[0]?.code ?? preferred);
    });

    protected readonly previewTitle = computed(() => this.shown(this.seoTitle(), this.fallbackTitle()));
    protected readonly previewDescription = computed(() => this.shown(this.seoDescription(), this.fallbackDescription()));

    private shown(seo: LocalizedText | null | undefined, fallback: LocalizedText | null | undefined): string {
        const code = this.previewCode();
        return (seo?.[code]?.trim() || fallback?.[code]?.trim() || '');
    }
}
