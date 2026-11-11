/**
 * Which deployment and which build an app is talking to, as its own backend
 * reports it (the ERP's `GET /version`). The library never fetches it and
 * never knows the URL: the app reads it through its own client and passes it
 * in, to `ef-environment-badge` and `ef-version-dialog`.
 */
export interface EfVersionInfo {
    /** Stable identifier of the application, e.g. `crescilio-erp`. */
    application: string;
    /** Release (`2026.11.1`) or branch (`develop`) the build came from. */
    version: string;
    /** Short commit hash, or `unknown`. */
    commit: string;
    /** Deployment code as served: `DEV`, `STAGING`, `PROD` or `unknown`. */
    environment: string;
    /** When the answering process started. */
    startedAt?: Date | string | null;
}

/** The deployment codes the badge and the dialog know. Anything else is `unknown`. */
export type EfEnvironmentCode = 'DEV' | 'STAGING' | 'PROD' | 'unknown';

const KNOWN: readonly EfEnvironmentCode[] = ['DEV', 'STAGING', 'PROD'];

/**
 * Normalises a served environment the way the backend reads `CRESCILIO_ENV`:
 * trimmed, case-insensitive. Missing or unrecognised is `unknown`, never
 * production, so a typo cannot silently look like PROD.
 */
export function efEnvironmentCode(raw: string | null | undefined): EfEnvironmentCode {
    const code = (raw ?? '').trim().toUpperCase();
    return (KNOWN as readonly string[]).includes(code) ? (code as EfEnvironmentCode) : 'unknown';
}

/**
 * Whether an environment is flagged on screen. Only the non-production tiers
 * are: production carries no badge, and neither does an unknown deployment,
 * because a badge that might be wrong is worse than none.
 */
export function efEnvironmentIsFlagged(code: EfEnvironmentCode): boolean {
    return code === 'DEV' || code === 'STAGING';
}

/** The i18n key of an environment's full name (`env_name_dev`, ..., `env_name_unknown`). */
export function efEnvironmentNameKey(code: EfEnvironmentCode): string {
    return `env_name_${code.toLowerCase()}`;
}

function known(value: string | null | undefined): string {
    const v = (value ?? '').trim();
    return v && v.toLowerCase() !== 'unknown' ? v : '';
}

/**
 * The one line the Copy button puts on the clipboard, for a support ticket:
 * `crescilio-erp develop+15d6d6b DEV`. Plain ASCII, never translated and with
 * no bidi marks, so it pastes the same from an Arabic page.
 *
 * - The commit joins the version with `+`, the way the build stamps it; an
 *   unknown commit is left out rather than printed as `+unknown`.
 * - An unknown version or environment prints `unknown`, so the line always
 *   has its three fields and says plainly what is missing.
 */
export function efVersionLine(info: EfVersionInfo): string {
    const application = known(info.application) || 'unknown';
    const version = known(info.version) || 'unknown';
    const commit = known(info.commit);
    const build = commit ? `${version}+${commit}` : version;
    return `${application} ${build} ${efEnvironmentCode(info.environment)}`;
}
