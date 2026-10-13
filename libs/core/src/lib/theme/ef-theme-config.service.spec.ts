import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { EF_PREFERENCE_STORE, EfPreferenceStore } from '../preferences/ef-preference-store';
import { DEFAULT_APP_STATE } from './app-state';
import { EfThemeConfigService } from './ef-theme-config.service';

describe('EfThemeConfigService with a preference store', () => {
    const KEY = 'Elasticias_APP_CONFIG_STATE';

    function setup(initial: Record<string, string> = {}) {
        const data = { ...initial };
        const changes = new Subject<string>();
        const store: EfPreferenceStore = {
            get: (k) => data[k] ?? null,
            set: (k, v) => { data[k] = v; },
            remove: (k) => { delete data[k]; },
            changes: changes.asObservable(),
        };
        TestBed.configureTestingModule({ providers: [{ provide: EF_PREFERENCE_STORE, useValue: store }] });
        return { data, changes, svc: TestBed.inject(EfThemeConfigService) };
    }

    it('starts from the stored state and persists changes under the historical key', () => {
        const { data, svc } = setup({ [KEY]: JSON.stringify({ ...DEFAULT_APP_STATE, darkTheme: true }) });
        expect(svc.appState().darkTheme).toBe(true);
        svc.appState.update((s) => ({ ...s, darkTheme: false }));
        TestBed.tick();
        expect(JSON.parse(data[KEY]).darkTheme).toBe(false);
    });

    it('adopts a state the store hydrates later', () => {
        const { data, changes, svc } = setup();
        expect(svc.appState().darkTheme).toBe(DEFAULT_APP_STATE.darkTheme);
        data[KEY] = JSON.stringify({ ...DEFAULT_APP_STATE, darkTheme: !DEFAULT_APP_STATE.darkTheme });
        changes.next(KEY);
        expect(svc.appState().darkTheme).toBe(!DEFAULT_APP_STATE.darkTheme);
    });

    it('does not write on startup when the stored state is unchanged', () => {
        const state = JSON.stringify({ ...DEFAULT_APP_STATE });
        const { data, svc } = setup({ [KEY]: state });
        const set = vi.spyOn(TestBed.inject(EF_PREFERENCE_STORE), 'set');
        TestBed.tick();
        expect(set).not.toHaveBeenCalled();
        expect(data[KEY]).toBe(state);
        expect(svc.appState()).toBeTruthy();
    });

    it('merges a partial hydrate over the live state and does not echo it back', () => {
        const { data, changes, svc } = setup();
        TestBed.tick();
        svc.appState.update((s) => ({ ...s, primary: 'teal', RTL: true }));
        TestBed.tick();
        const set = vi.spyOn(TestBed.inject(EF_PREFERENCE_STORE), 'set');
        data[KEY] = JSON.stringify({ darkTheme: true });
        changes.next(KEY);
        TestBed.tick();
        expect(svc.appState().darkTheme).toBe(true);
        expect(svc.appState().primary).toBe('teal');
        expect(svc.appState().RTL).toBe(true);
        expect(set).not.toHaveBeenCalled();
        expect(data[KEY]).toBe(JSON.stringify({ darkTheme: true }));
    });

    it('resets to defaults when a hydrate removes the key', () => {
        const { data, changes, svc } = setup({ [KEY]: JSON.stringify({ ...DEFAULT_APP_STATE, darkTheme: !DEFAULT_APP_STATE.darkTheme }) });
        delete data[KEY];
        changes.next(KEY);
        TestBed.tick();
        expect(svc.appState().darkTheme).toBe(DEFAULT_APP_STATE.darkTheme);
        expect(data[KEY]).toBeUndefined();
    });
});
