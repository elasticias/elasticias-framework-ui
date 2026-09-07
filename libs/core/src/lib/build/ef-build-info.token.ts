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
    /** Release version. Empty when the app maintains none — consumers should
     *  omit it rather than print a placeholder. */
    version: string;

    /** Short commit hash the build came from. */
    commit: string;

    /** Commit date as `YYYY-MM-DD` — what a reader actually recognises. */
    date: string;

    /** Branch the build came from, useful for telling develop from a release. */
    branch: string;

    /**
     * Which deployment this build was made for: `production`, `staging`,
     * `develop`, or `local`. Decided at build time from the ref, because a
     * production build is made from a tag rather than a branch.
     */
    environment: string;

    /**
     * The shared `@elasticias/*` packages this build was compiled against,
     * in the order the app wants them listed.
     *
     * Optional: an app that ships no shared packages, or generates its stamp
     * without resolving them, simply omits the key and consumers render
     * nothing rather than an empty group.
     */
    packages?: EfBuildPackage[];
}

/** One shared package and the version that went into the build. */
export interface EfBuildPackage {
    /** Package name as it appears in `package.json`, e.g. `@elasticias/ui`. */
    name: string;

    /** The version actually installed, not the range the app declared. */
    version: string;
}

export const EF_BUILD_INFO = new InjectionToken<EfBuildInfo>('EF_BUILD_INFO');
