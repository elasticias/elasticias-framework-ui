import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, InjectionToken, Provider } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { EF_BUILD_INFO } from '../build/ef-build-info.token';

/**
 * Where the translation files live, and how their URL is stamped.
 */
export interface EfVersionedTranslateLoaderConfig {
    /** Path the language file sits under. Defaults to `/assets/i18n/`. */
    prefix?: string;

    /** File extension. Defaults to `.json`. */
    suffix?: string;

    /**
     * Build identifier appended as `?v=`. Defaults to `EF_BUILD_INFO.commit`,
     * which the app already regenerates on every build, so a release changes
     * every translation URL without anyone maintaining a second number.
     */
    version?: string;

    /**
     * Bypass the HTTP interceptor chain. On by default: a translation file is
     * a static asset, and putting it through the app's auth interceptor means
     * a 401 handler can fire before the app knows how to say anything.
     */
    useHttpBackend?: boolean;
}

export const EF_TRANSLATE_LOADER_CONFIG = new InjectionToken<EfVersionedTranslateLoaderConfig>(
    'EF_TRANSLATE_LOADER_CONFIG',
);

/**
 * Translation loader that puts the build id in the URL.
 *
 * Angular content-hashes its JS and CSS but copies `/assets` verbatim, so a
 * translation file ships new content at a URL that never changes — the one
 * case HTTP caching handles worst. Two things follow from that.
 *
 * The first is ordinary staleness: a device holding yesterday's copy has no
 * reason to ask for today's, so a newly added key renders as its raw key.
 *
 * The second is worse and is why this exists rather than a cache header. A
 * device that cached the file while the server was still sending
 * `max-age=31536000, immutable` will not re-request it for up to a year, and
 * therefore never sees whatever header we send next. Headers only reach
 * browsers that ask. A URL they have never seen has no cache entry at all, so
 * changing the URL is the only thing that reaches them.
 *
 * Stamping the build id also means the URL is stable *within* a release, so
 * the file can go back to being cached hard instead of revalidated on every
 * single page load.
 */
export class EfVersionedTranslateLoader implements TranslateLoader {
    private readonly cfg = inject(EF_TRANSLATE_LOADER_CONFIG, { optional: true }) ?? {};
    private readonly buildInfo = inject(EF_BUILD_INFO, { optional: true });

    /**
     * Built from `HttpBackend` rather than injecting `HttpClient`, so the
     * request skips interceptors. See `useHttpBackend`.
     */
    private readonly http =
        this.cfg.useHttpBackend === false
            ? inject(HttpClient)
            : new HttpClient(inject(HttpBackend));

    getTranslation(lang: string): Observable<TranslationObject> {
        const prefix = this.cfg.prefix ?? '/assets/i18n/';
        const suffix = this.cfg.suffix ?? '.json';
        const version = this.cfg.version ?? this.buildInfo?.commit ?? '';

        // No build id (a bare `ng serve`, or an app that ships no stamp) means
        // no query string at all, rather than `?v=` — a URL that changes shape
        // between environments is harder to reason about than one that doesn't.
        const url = `${prefix}${lang}${suffix}${version ? `?v=${encodeURIComponent(version)}` : ''}`;
        return this.http.get<TranslationObject>(url);
    }
}

/**
 * Provide the versioned loader in place of `provideTranslateHttpLoader`.
 *
 * ```ts
 * provideTranslateService({ fallbackLang: 'fr', lang }),
 * provideEfTranslateLoader({ prefix: '/assets/i18n/' }),
 * ```
 *
 * Pair it with a long-lived cache header on the translation files: the URL now
 * carries the release, so there is nothing left to revalidate against.
 */
export function provideEfTranslateLoader(
    config: EfVersionedTranslateLoaderConfig = {},
): Provider[] {
    return [
        { provide: EF_TRANSLATE_LOADER_CONFIG, useValue: config },
        { provide: TranslateLoader, useClass: EfVersionedTranslateLoader },
    ];
}
