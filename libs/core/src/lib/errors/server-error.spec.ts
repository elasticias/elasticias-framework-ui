import { HttpErrorResponse } from '@angular/common/http';
import { extractProblem, isServerReported } from './server-error';

/** Mirrors the NSwag-generated `SwaggerException` of an ElasticERP client. */
class FakeSwaggerException extends Error {
    protected isSwaggerException = true;
    constructor(
        override message: string,
        public status: number,
        public response: string,
        public headers: Record<string, unknown> = {},
        public result: unknown = null,
    ) {
        super();
    }
}

describe('isServerReported', () => {
    it('recognises the parsed problem+json the interceptor rethrows for a 422', () => {
        const pd = { type: 'about:blank', title: 'Unprocessable', status: 422, detail: 'BR_COL_0004', ruleCode: 'BR_COL_0004' };
        expect(isServerReported(pd)).toBe(true);
    });

    it('recognises a validation problem even when it carries no status', () => {
        expect(isServerReported({ errors: { title: ['required'] } })).toBe(true);
    });

    it('recognises an HttpErrorResponse for the statuses the interceptor toasts', () => {
        for (const status of [400, 403, 404, 409, 422, 500]) {
            expect(isServerReported(new HttpErrorResponse({ status }))).toBe(true);
        }
    });

    it('recognises the NSwag exception a 500 becomes, by shape', () => {
        const ex = new FakeSwaggerException('An unexpected error occurred.', 500, '{}');
        expect(isServerReported(ex)).toBe(true);
    });

    it('does not recognise a status the interceptor stays quiet about', () => {
        expect(isServerReported(new HttpErrorResponse({ status: 401 }))).toBe(false);
        expect(isServerReported(new HttpErrorResponse({ status: 0 }))).toBe(false);
        expect(isServerReported(new HttpErrorResponse({ status: 502 }))).toBe(false);
        expect(isServerReported(new FakeSwaggerException('x', 413, ''))).toBe(false);
    });

    it('does not recognise a plain Error, a string or nothing', () => {
        expect(isServerReported(new Error('boom'))).toBe(false);
        expect(isServerReported(new TypeError('x is undefined'))).toBe(false);
        expect(isServerReported('oops')).toBe(false);
        expect(isServerReported(null)).toBe(false);
        expect(isServerReported(undefined)).toBe(false);
    });

    it('ignores a status that is not a number', () => {
        expect(isServerReported({ status: '422' })).toBe(false);
    });
});

describe('extractProblem', () => {
    it('reads detail, ruleCode and a normalised errors map from a parsed problem', () => {
        const p = extractProblem({
            status: 409,
            title: 'Conflict',
            detail: 'collection_slug_exists',
            ruleCode: 'BR_COL_0001',
            errors: { slug: ['collection_slug_exists'], title: 'required' },
        });
        expect(p).toEqual({
            status: 409,
            title: 'Conflict',
            detail: 'collection_slug_exists',
            ruleCode: 'BR_COL_0001',
            errors: { slug: ['collection_slug_exists'], title: ['required'] },
        });
    });

    it('reads the problem from an HttpErrorResponse body', () => {
        const err = new HttpErrorResponse({ status: 422, error: { status: 422, detail: 'nope', ruleCode: 'BR_X' } });
        const p = extractProblem(err);
        expect(p?.detail).toBe('nope');
        expect(p?.ruleCode).toBe('BR_X');
        expect(p?.status).toBe(422);
        expect(p?.errors).toEqual({});
    });

    it('reads the problem NSwag parsed into `result`', () => {
        const ex = new FakeSwaggerException('x', 400, '', {}, { detail: 'bad', errors: { name: ['too long'] } });
        const p = extractProblem(ex);
        expect(p?.status).toBe(400);
        expect(p?.detail).toBe('bad');
        expect(p?.errors).toEqual({ name: ['too long'] });
    });

    it('falls back to parsing the raw `response` text of an NSwag exception', () => {
        const ex = new FakeSwaggerException('x', 422, JSON.stringify({ detail: 'raw', ruleCode: 'BR_Y' }));
        expect(extractProblem(ex)?.ruleCode).toBe('BR_Y');
    });

    it('keeps the status of a bodiless HttpErrorResponse and nothing else', () => {
        const p = extractProblem(new HttpErrorResponse({ status: 500 }));
        expect(p).toEqual({ status: 500, errors: {} });
    });

    it('extracts ruleArgs and drops non-string values', () => {
        // BR_EM_0001 carries the unknown placeholder as `token`; the screen
        // interpolates it into the translated message.
        const p = extractProblem({
            status: 422,
            ruleCode: 'BR_EM_0001',
            ruleArgs: { token: 'customer_nam', count: 3, flag: true, nested: { a: 'b' }, gone: null },
        });
        expect(p?.ruleArgs).toEqual({ token: 'customer_nam' });
    });

    it('leaves ruleArgs out when the server sent none or none was a string', () => {
        expect(extractProblem({ status: 422, ruleCode: 'BR_X' })).not.toHaveProperty('ruleArgs');
        expect(extractProblem({ status: 422, ruleCode: 'BR_X', ruleArgs: { n: 1 } })).not.toHaveProperty('ruleArgs');
        expect(extractProblem({ status: 422, ruleCode: 'BR_X', ruleArgs: ['a'] })).not.toHaveProperty('ruleArgs');
    });

    it('reads ruleArgs from an HttpErrorResponse body', () => {
        const err = new HttpErrorResponse({
            status: 422,
            error: { status: 422, ruleCode: 'BR_EM_0002', ruleArgs: { removed: 'script,iframe' } },
        });
        expect(extractProblem(err)?.ruleArgs).toEqual({ removed: 'script,iframe' });
    });

    it('returns null for something that is no server error', () => {
        expect(extractProblem(new Error('boom'))).toBeNull();
        expect(extractProblem(null)).toBeNull();
        expect(extractProblem(new FakeSwaggerException('x', 500, 'not json'))?.status).toBe(500);
    });
});
