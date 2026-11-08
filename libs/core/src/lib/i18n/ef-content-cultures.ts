import { InjectionToken, Signal, signal } from '@angular/core';
import type { LocalizedText } from '@elasticias/types';

/** A culture a screen can edit owner-written content in. */
export interface EfCulture {
    code: string;
    labelKey: string;
    dir: 'auto' | 'rtl' | 'ltr';
}

export interface EfContentCultures {
    cultures: ReadonlyArray<EfCulture>;
    defaultCulture: string;
}

export const EF_DEFAULT_CONTENT_CULTURES: ReadonlyArray<EfCulture> = [
    { code: 'fr', labelKey: 'ef_localized_input_culture_fr', dir: 'auto' },
    { code: 'ar', labelKey: 'ef_localized_input_culture_ar', dir: 'rtl' },
    { code: 'en', labelKey: 'ef_localized_input_culture_en', dir: 'ltr' },
];

/** The cultures content is edited in; an app overrides it from its tenant settings. */
export const EF_CONTENT_CULTURES = new InjectionToken<Signal<EfContentCultures>>('EF_CONTENT_CULTURES', {
    factory: () => signal({ cultures: EF_DEFAULT_CONTENT_CULTURES, defaultCulture: 'fr' }),
});

/** Trims every value and drops the blank ones, so an empty field never reaches the API. */
export function cleanLocalizedText(v: LocalizedText | null | undefined): LocalizedText {
    const out: LocalizedText = {};
    for (const [k, val] of Object.entries(v ?? {})) {
        const t = val?.trim();
        if (t) out[k] = t;
    }
    return out;
}
