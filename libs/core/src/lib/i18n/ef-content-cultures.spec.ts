import { TestBed } from '@angular/core/testing';
import { cleanLocalizedText, EF_CONTENT_CULTURES } from './ef-content-cultures';

describe('ef-content-cultures', () => {
    it('default token gives fr ar en with fr default', () => {
        const v = TestBed.inject(EF_CONTENT_CULTURES)();
        expect(v.cultures.map(c => c.code)).toEqual(['fr', 'ar', 'en']);
        expect(v.cultures.map(c => c.dir)).toEqual(['auto', 'rtl', 'ltr']);
        expect(v.cultures.map(c => c.labelKey)).toEqual([
            'ef_localized_input_culture_fr',
            'ef_localized_input_culture_ar',
            'ef_localized_input_culture_en',
        ]);
        expect(v.defaultCulture).toBe('fr');
    });

    it('cleanLocalizedText removes blank and trims', () => {
        expect(cleanLocalizedText({ fr: ' A ', ar: '' })).toEqual({ fr: 'A' });
        expect(cleanLocalizedText({ fr: '   ', en: undefined })).toEqual({});
    });

    it('null gives {}', () => {
        expect(cleanLocalizedText(null)).toEqual({});
        expect(cleanLocalizedText(undefined)).toEqual({});
    });
});
