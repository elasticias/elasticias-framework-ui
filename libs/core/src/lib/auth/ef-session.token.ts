import { InjectionToken } from '@angular/core';

/**
 * The bit of an app's session that shared chrome needs to act on.
 *
 * Signing out belongs to the app — it owns the auth client, the grant
 * refresh timer and where to land afterwards — but the control that
 * triggers it belongs to the shell. This token is the seam between them,
 * the same shape as `SCREEN_REF_DATA_SERVICE`.
 *
 * Components inject it optionally and hide their affordance when nothing
 * provides it, so an app that has not opted in shows no dead button.
 *
 * ```ts
 * // app.config.ts
 * { provide: EF_SESSION, useExisting: AuthorizeService }
 * ```
 */
export interface EfSession {
    /** End the session and send the user wherever the app decides. */
    logout(): void;
}

export const EF_SESSION = new InjectionToken<EfSession>('EF_SESSION');
