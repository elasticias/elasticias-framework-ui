import { InjectionToken } from '@angular/core';

/**
 * Which build of the app is running.
 *
 * Apps generate this at build time — the framework cannot know it — and
 * provide it here so shared chrome can show it without importing anything
 * app-specific. `EfBuildStampComponent` is the intended consumer.
 *
 * ```ts
 * // app.config.ts
 * { provide: EF_BUILD_INFO, useValue: BUILD_INFO }
 * ```
 */
export interface EfBuildInfo {
    /** Package version, when the app maintains one. */
    version: string;

    /** Short commit hash the build came from. */
    commit: string;

    /** Commit date as `YYYY-MM-DD` — what a reader actually recognises. */
    date: string;

    /** Branch the build came from, useful for telling develop from a release. */
    branch: string;
}

export const EF_BUILD_INFO = new InjectionToken<EfBuildInfo>('EF_BUILD_INFO');
