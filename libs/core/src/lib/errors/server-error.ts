/**
 * Reading a server refusal the same way everywhere.
 *
 * An app's HTTP interceptor toasts the refusals it understands (a 400, 403,
 * 404, 409, 422 or 500) and rethrows. What a subscriber then receives depends
 * on the chain: the parsed `application/problem+json` object (400/409/422),
 * the raw `HttpErrorResponse`, or the exception an NSwag-generated client
 * wraps it in (`ApiException` / `SwaggerException`, which carries `status`,
 * `response` and a parsed `result`). A screen that catches such an error must
 * not toast a second time; {@link isServerReported} decides that from the
 * error's shape, so no app type and no `instanceof` on a generated class is
 * needed.
 *
 * ```ts
 * catchError(err => {
 *     if (!isServerReported(err)) this.toast.showError(this.translate.instant('save_failed'));
 *     return EMPTY;
 * })
 * ```
 */

/** Statuses an Elastic interceptor already shows a toast for. */
export const EF_SERVER_REPORTED_STATUSES: ReadonlyArray<number> = [400, 403, 404, 409, 422, 500];

/** The part of an RFC 9457 problem a screen reads. */
export interface EfProblem {
    status?: number;
    title?: string;
    detail?: string;
    /** Business-rule code, for example `BR_COL_0004`. */
    ruleCode?: string;
    /**
     * Values the rule's message interpolates, for example `{ token: 'x' }`
     * for `BR_EM_0001`. Only string values are kept; absent when the server
     * sent none.
     */
    ruleArgs?: Record<string, string>;
    /** Per-field messages, always as arrays. Empty when the server sent none. */
    errors: Record<string, string[]>;
}

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
    return typeof value === 'object' && value !== null;
}

function numericStatus(value: unknown): number | undefined {
    return isDict(value) && typeof value['status'] === 'number' ? (value['status'] as number) : undefined;
}

function hasErrorsMap(value: unknown): boolean {
    const errors = isDict(value) ? value['errors'] : undefined;
    return isDict(errors) && !Array.isArray(errors) && Object.keys(errors).length > 0;
}

/**
 * True when the error is a server refusal the app's interceptor already
 * surfaced to the user, so the caller should not show another message.
 *
 * Recognised by shape: a numeric `status` in {@link EF_SERVER_REPORTED_STATUSES}
 * (an `HttpErrorResponse`, an NSwag exception, a parsed problem), or a problem
 * payload with a non-empty `errors` map or a `ruleCode`. A plain `Error`, a
 * network failure (status 0), a 401 (redirect, no toast) or any other status
 * is not reported.
 */
export function isServerReported(error: unknown): boolean {
    if (!isDict(error)) return false;
    const status = numericStatus(error);
    if (status !== undefined) return EF_SERVER_REPORTED_STATUSES.includes(status);
    return hasErrorsMap(error) || typeof error['ruleCode'] === 'string';
}

function parseJson(text: unknown): Dict | null {
    if (typeof text !== 'string' || text.trim() === '') return null;
    try {
        const parsed: unknown = JSON.parse(text);
        return isDict(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function looksLikeProblem(value: unknown): value is Dict {
    return (
        isDict(value) &&
        ('detail' in value || 'errors' in value || 'ruleCode' in value || 'title' in value || 'type' in value)
    );
}

/** Locates the problem payload inside whatever the chain threw. */
function findPayload(error: Dict): Dict | null {
    // HttpErrorResponse: the body is `error.error` (already parsed, or a JSON string).
    const body = error['error'];
    if (isDict(body) && looksLikeProblem(body)) return body;
    const bodyText = parseJson(body);
    if (bodyText) return bodyText;
    // NSwag exception: `result` is the parsed body, `response` the raw text.
    if (looksLikeProblem(error['result'])) return error['result'] as Dict;
    const raw = parseJson(error['response']);
    if (raw) return raw;
    // The parsed problem itself, as the interceptor rethrows it.
    return looksLikeProblem(error) ? error : null;
}

function asString(value: unknown): string | undefined {
    return typeof value === 'string' && value !== '' ? value : undefined;
}

function normaliseErrors(errors: unknown): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    if (!isDict(errors) || Array.isArray(errors)) return out;
    for (const [field, value] of Object.entries(errors)) {
        const messages = (Array.isArray(value) ? value : [value]).filter(
            (m): m is string => typeof m === 'string' && m !== '',
        );
        if (messages.length > 0) out[field] = messages;
    }
    return out;
}

function stringArgs(args: unknown): Record<string, string> | undefined {
    if (!isDict(args) || Array.isArray(args)) return undefined;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(args)) {
        if (typeof value === 'string') out[key] = value;
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Extracts `status`, `detail`, `ruleCode`, `ruleArgs` and the per-field `errors` from a
 * server error of any of the shapes above. Returns `null` when the value is
 * not a server error at all (a plain `Error`, a string, nothing).
 */
export function extractProblem(error: unknown): EfProblem | null {
    if (!isDict(error)) return null;
    const payload = findPayload(error);
    const status = numericStatus(error) ?? numericStatus(payload);
    if (!payload && status === undefined) return null;

    const problem: EfProblem = { errors: normaliseErrors(payload?.['errors']) };
    if (status !== undefined) problem.status = status;
    const title = asString(payload?.['title']);
    if (title) problem.title = title;
    const detail = asString(payload?.['detail']);
    if (detail) problem.detail = detail;
    const ruleCode = asString(payload?.['ruleCode']);
    if (ruleCode) problem.ruleCode = ruleCode;
    const ruleArgs = stringArgs(payload?.['ruleArgs']);
    if (ruleArgs) problem.ruleArgs = ruleArgs;
    return problem;
}
