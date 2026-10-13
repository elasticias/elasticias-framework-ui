import { TestBed } from '@angular/core/testing';
import { EF_PREFERENCE_STORE, LocalStoragePreferenceStore, efPrefKey } from './ef-preference-store';

describe('default preference store', () => {
    beforeEach(() => localStorage.clear());

    it('is localStorage under the exact key given', () => {
        const store = TestBed.inject(EF_PREFERENCE_STORE);
        expect(store).toBeInstanceOf(LocalStoragePreferenceStore);
        store.set('ef.shell.side-collapsed', '1');
        expect(localStorage.getItem('ef.shell.side-collapsed')).toBe('1');
        expect(store.get('ef.shell.side-collapsed')).toBe('1');
        store.remove('ef.shell.side-collapsed');
        expect(store.get('ef.shell.side-collapsed')).toBeNull();
    });

    it('prefixes like StorageUtils', () => {
        expect(efPrefKey('APP_CONFIG_STATE')).toBe('Elasticias_APP_CONFIG_STATE');
    });

    it('never throws when storage is blocked', () => {
        const boom = () => { throw new Error('blocked'); };
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);
        const store = new LocalStoragePreferenceStore();
        expect(store.get('k')).toBeNull();
        expect(() => store.set('k', 'v')).not.toThrow();
        expect(() => store.remove('k')).not.toThrow();
        vi.restoreAllMocks();
    });
});
