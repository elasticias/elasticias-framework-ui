import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EfFieldsetComponent } from '../../layout/ef-fieldset/ef-fieldset.component';
import { EfFormGridComponent } from '../../layout/ef-form-grid/ef-form-grid.component';
import { EfSeoPreviewComponent } from '../../data/ef-seo-preview/ef-seo-preview.component';
import { EfInputTextComponent } from '../ef-input-text/ef-input-text.component';
import { EfTextareaComponent } from '../ef-textarea/ef-textarea.component';

/** A language the SEO texts are written in. */
export interface EfSeoLocale {
    code: string;
    labelKey: string;
    dir: 'auto' | 'rtl' | 'ltr';
}

/** What the fields write back: French is the scalar, every other language a dictionary entry. */
export interface EfSeoPatch {
    seoTitle?: string;
    seoDescription?: string;
    seoTitleTranslations?: Record<string, string>;
    seoDescriptionTranslations?: Record<string, string>;
}

let nextId = 0;

type Field = 'title' | 'description';

export const EF_SEO_DEFAULT_LOCALES: ReadonlyArray<EfSeoLocale> = [
    { code: 'fr', labelKey: 'ef_seo_fields_locale_fr', dir: 'auto' },
    { code: 'ar', labelKey: 'ef_seo_fields_locale_ar', dir: 'rtl' },
    { code: 'en', labelKey: 'ef_seo_fields_locale_en', dir: 'ltr' },
];

/**
 * SEO title and description per language, each with a counter against what a
 * search engine shows (60 / 160), capped at the server's limits (256 / 512),
 * and the shared `ef-seo-preview` of the French result with the entity's own
 * title and description as the fallback the shop uses. Card-less: each screen
 * wraps it in its own `ef-card`.
 *
 * The French controls carry the backend names (`seoTitle`, `seoDescription`)
 * so `[efServerErrors]` links their errors; the others (`seoTitleAr`, ...) are
 * dictionary entries whose errors are toasted (ADR-010).
 *
 * ```html
 * <ef-seo-fields [seoTitle]="p.seoTitle" ... [previewUrl]="url()" (seoChange)="patch($event)" />
 * ```
 */
@Component({
    selector: 'ef-seo-fields',
    standalone: true,
    imports: [TranslateModule, EfFieldsetComponent, EfFormGridComponent, EfInputTextComponent, EfTextareaComponent, EfSeoPreviewComponent],
    templateUrl: './ef-seo-fields.component.html',
    styleUrl: './ef-seo-fields.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfSeoFieldsComponent {
    readonly seoTitle = input<string | null | undefined>('');
    readonly seoDescription = input<string | null | undefined>('');
    readonly seoTitleTranslations = input<Record<string, string> | null | undefined>({});
    readonly seoDescriptionTranslations = input<Record<string, string> | null | undefined>({});
    /** The entity's own texts, which the shop uses when SEO is empty. */
    readonly fallbackTitle = input<string | null | undefined>('');
    readonly fallbackDescription = input<string | null | undefined>('');
    /** The page address shown in the preview, computed by the app. */
    readonly previewUrl = input<string>('');
    readonly titleMax = input(256);
    readonly descriptionMax = input(512);
    readonly titleAdvised = input(60);
    readonly descriptionAdvised = input(160);
    readonly locales = input<ReadonlyArray<EfSeoLocale>>(EF_SEO_DEFAULT_LOCALES);

    readonly seoChange = output<EfSeoPatch>();

    text(locale: string, field: Field): string {
        if (locale === 'fr') return (field === 'title' ? this.seoTitle() : this.seoDescription()) ?? '';
        const dict = field === 'title' ? this.seoTitleTranslations() : this.seoDescriptionTranslations();
        return dict?.[locale] ?? '';
    }

    /** Id of a counter, which the field it counts points at with `aria-describedby`. */
    counterId(locale: string, field: Field): string {
        return `${this.uid}-${this.name(locale, field)}-counter`;
    }

    private readonly uid = `ef-seo-fields-${nextId++}`;

    /** French matches the backend property; the others are unique for the label link. */
    name(locale: string, field: Field): string {
        const base = field === 'title' ? 'seoTitle' : 'seoDescription';
        return locale === 'fr' ? base : `${base}${locale.charAt(0).toUpperCase()}${locale.slice(1)}`;
    }

    setText(locale: string, field: Field, value: string): void {
        if (locale === 'fr') {
            this.seoChange.emit(field === 'title' ? { seoTitle: value } : { seoDescription: value });
            return;
        }
        const key = field === 'title' ? 'seoTitleTranslations' : 'seoDescriptionTranslations';
        const next = { ...((field === 'title' ? this.seoTitleTranslations() : this.seoDescriptionTranslations()) ?? {}) };
        // A cleared field removes the entry, so the shop falls back instead of showing nothing.
        if (value) next[locale] = value;
        else delete next[locale];
        this.seoChange.emit({ [key]: next });
    }

    protected readonly previewTitle = computed(() => (this.seoTitle() || this.fallbackTitle() || '').trim());
    protected readonly previewDescription = computed(() => (this.seoDescription() || this.fallbackDescription() || '').trim());
}
