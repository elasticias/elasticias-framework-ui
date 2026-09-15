import { inject, InjectionToken, Provider } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { from, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/** Pulls one language's messages in. Typically a `() => import('./fr.json')`. */
export type EfTranslationImport = () => Promise<TranslationObject | { default: TranslationObject }>;

export interface EfBundledTranslateLoaderConfig {
    /**
     * One entry per language the app ships.
     *
     * Each value must be a *literal* dynamic import, written out per language
     * rather than built from a variable:
     *
     * ```ts
     * { fr: () => import('./assets/i18n/fr.json'), ar: () => import('./assets/i18n/ar.json') }
     * ```
     *
     * The bundler has to see the specifier to emit a chunk for it; an
     * `import(`./${lang}.json`)` is opaque to it and silently resolves to
     * nothing at runtime.
     */
    loaders: Record<string, EfTranslationImport>;
}

export const EF_BUNDLED_TRANSLATIONS = new InjectionToken<EfBundledTranslateLoaderConfig>(
    'EF_BUNDLED_TRANSLATIONS',
);

/**
 * Translation loader that imports each language as a lazy chunk instead of
 * fetching a file from `/assets`.
 *
 * The staleness this removes is structural rather than incidental. A file
 * under `/assets` is copied verbatim by the build, so its URL is the same in
 * every release and a cached copy has nothing to invalidate it; the usual
 * remedies — a revalidating cache header, a `?v=` stamp — are ways of telling
 * the browser that a stable URL is not to be trusted. An imported chunk has
 * the content hash in its filename, so a changed message is a different file
 * and an unchanged one is genuinely immutable. There is no cache to bust.
 *
 * It also removes a request from startup. The chunk is a module like any
 * other, so it resolves through the same loader as the rest of the app rather
 * than waiting on an XHR issued after bootstrap.
 *
 * The cost is that messages become build output: they can no longer be edited
 * on a running server, and a language the map does not name cannot be added
 * without a deploy. For an app that redeploys per release that is a fair
 * trade; for one that expects translators to drop a file onto a server it is
 * not, and {@link EfVersionedTranslateLoader} is the better fit.
 */
export class EfBundledTranslateLoader implements TranslateLoader {
    private readonly cfg = inject(EF_BUNDLED_TRANSLATIONS);

    getTranslation(lang: string): Observable<TranslationObject> {
        const load = this.cfg.loaders[lang];

        // An unknown language resolves to nothing rather than throwing, which
        // is what ngx-translate expects: it then falls back, and the app shows
        // keys for that language instead of failing to start.
        if (!load) return of({} as TranslationObject);

        return from(load()).pipe(
            // A JSON module arrives under `default` in some build setups and
            // bare in others; accept either rather than depending on which.
            map(mod => ((mod as { default?: TranslationObject }).default ?? mod) as TranslationObject),
        );
    }
}

/**
 * Provide the bundled loader in place of an HTTP one.
 *
 * ```ts
 * provideTranslateService({ lang }),
 * provideEfBundledTranslateLoader({
 *   loaders: {
 *     fr: () => import('./assets/i18n/fr.json'),
 *     ar: () => import('./assets/i18n/ar.json'),
 *   },
 * }),
 * ```
 */
export function provideEfBundledTranslateLoader(
    config: EfBundledTranslateLoaderConfig,
): Provider[] {
    return [
        { provide: EF_BUNDLED_TRANSLATIONS, useValue: config },
        { provide: TranslateLoader, useClass: EfBundledTranslateLoader },
    ];
}
