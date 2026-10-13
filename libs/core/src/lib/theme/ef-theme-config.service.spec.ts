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
});
