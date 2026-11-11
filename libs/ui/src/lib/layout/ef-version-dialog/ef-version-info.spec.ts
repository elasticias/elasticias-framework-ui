import { efEnvironmentCode, efEnvironmentIsFlagged, efVersionLine } from './ef-version-info';

/** The copy line goes into support tickets as is, so its shape is a contract. */
describe('efVersionLine', () => {
    const base = { application: 'crescilio-erp', version: 'develop', commit: '15d6d6b', environment: 'DEV' };

    it('joins application, version+commit and the environment code', () => {
        expect(efVersionLine(base)).toBe('crescilio-erp develop+15d6d6b DEV');
    });

    it('leaves an unknown commit out instead of printing +unknown', () => {
        expect(efVersionLine({ ...base, version: '1.0.0', commit: 'unknown' })).toBe('crescilio-erp 1.0.0 DEV');
        expect(efVersionLine({ ...base, commit: '' })).toBe('crescilio-erp develop DEV');
    });

    it('keeps three fields when the version or environment is unknown', () => {
        expect(efVersionLine({ ...base, version: '', environment: 'banana' })).toBe('crescilio-erp unknown+15d6d6b unknown');
    });

    it('normalises the environment the way the backend reads it', () => {
        expect(efVersionLine({ ...base, environment: ' staging ' })).toBe('crescilio-erp develop+15d6d6b STAGING');
    });
});

describe('efEnvironmentCode', () => {
    it.each([
        ['DEV', 'DEV'],
        ['staging', 'STAGING'],
        ['Prod', 'PROD'],
        ['unknown', 'unknown'],
        ['PRODUCTION', 'unknown'],
        ['', 'unknown'],
        [null, 'unknown'],
        [undefined, 'unknown'],
    ])('%s is %s, never production by default', (raw, code) => {
        expect(efEnvironmentCode(raw)).toBe(code);
    });

    it('flags only DEV and STAGING', () => {
        expect(['DEV', 'STAGING', 'PROD', 'unknown'].filter((c) => efEnvironmentIsFlagged(c as never))).toEqual(['DEV', 'STAGING']);
    });
});
