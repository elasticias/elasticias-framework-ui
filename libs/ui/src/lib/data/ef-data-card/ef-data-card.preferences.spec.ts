import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EF_PREFERENCE_STORE, efTablePrefsKey } from '@elasticias/core';
import { EfDataCardComponent } from './ef-data-card.component';

describe('ef-data-card preferences through the store', () => {
    function make(data: Record<string, string>, columns: unknown[] = [{ id: 'name', field: 'name', header: 'Name' }]) {
        TestBed.configureTestingModule({
            imports: [EfDataCardComponent, TranslateModule.forRoot()],
            providers: [{
                provide: EF_PREFERENCE_STORE,
                useValue: { get: (k: string) => data[k] ?? null, set: (k: string, v: string) => { data[k] = v; }, remove: (k: string) => { delete data[k]; } },
            }],
        });
        const fixture = TestBed.createComponent(EfDataCardComponent);
        fixture.componentRef.setInput('tableKey', 'clients');
        fixture.componentRef.setInput('columns', columns);
        fixture.componentRef.setInput('rows', []);
        fixture.detectChanges();
        return fixture.componentInstance;
    }

    it('restores density and hidden columns from the store under the table key', () => {
        const key = efTablePrefsKey('clients');
        expect(key).toBe('Elasticias_TABLE_PREFS_clients');
        const comp = make({ [key]: JSON.stringify({ density: 'compact', hiddenColumnIds: ['name'] }) });
        expect(comp.density()).toBe('compact');
        expect(comp.hiddenColumnIds()).toEqual(['name']);
    });

    describe('defaultHidden columns', () => {
        const key = efTablePrefsKey('clients');
        const columns = [
            { id: 'name', field: 'name', header: 'Name' },
            { id: 'position', field: 'position', header: 'Position', defaultHidden: true },
            { id: 'locked', field: 'locked', header: 'Locked', defaultHidden: true, hideable: false },
        ];
        const visibleIds = (comp: EfDataCardComponent) => comp.effectiveColumns().map(c => c.id);

        it('starts hidden when nothing is saved, and the column picker still offers it', () => {
            const comp = make({}, columns);
            expect(comp.hiddenColumnIds()).toEqual(['position']);
            expect(visibleIds(comp)).not.toContain('position');
            expect(comp.hideableColumns().map(c => c.id)).toContain('position');
            expect(comp.isColumnHidden('position')).toBe(true);
        });

        it('never hides a column the viewer could not show again', () => {
            const comp = make({}, columns);
            expect(visibleIds(comp)).toContain('locked');
        });

        it('writes nothing to the store on a first visit', () => {
            const data: Record<string, string> = {};
            make(data, columns);
            expect(data[key]).toBeUndefined();
        });

        it('a saved list wins, even an empty one', () => {
            const comp = make({ [key]: JSON.stringify({ density: 'default', hiddenColumnIds: [] }) }, columns);
            expect(comp.hiddenColumnIds()).toEqual([]);
            expect(visibleIds(comp)).toContain('position');
        });

        it('showing it from the picker is saved through the store', () => {
            const data: Record<string, string> = {};
            const comp = make(data, columns);
            comp.toggleColumn('position');
            expect(visibleIds(comp)).toContain('position');
            expect(JSON.parse(data[key]).hiddenColumnIds).toEqual([]);
        });

        it('a density change keeps it hidden, in the shape every store already saves', () => {
            const data: Record<string, string> = {};
            const comp = make(data, columns);
            comp.setDensity('compact');
            expect(JSON.parse(data[key])).toEqual({ density: 'compact', hiddenColumnIds: ['position'] });
            TestBed.resetTestingModule();
            const again = make(data, columns);
            expect(again.isColumnHidden('position')).toBe(true);
        });

        it('hiding it again from the picker is saved too', () => {
            const data: Record<string, string> = {};
            const comp = make(data, columns);
            comp.toggleColumn('position');
            comp.toggleColumn('position');
            expect(comp.isColumnHidden('position')).toBe(true);
            expect(JSON.parse(data[key]).hiddenColumnIds).toEqual(['position']);
        });

        it('follows columns that arrive after the first render', () => {
            TestBed.configureTestingModule({
                imports: [EfDataCardComponent, TranslateModule.forRoot()],
                providers: [{ provide: EF_PREFERENCE_STORE, useValue: { get: () => null, set: () => undefined, remove: () => undefined } }],
            });
            const fixture = TestBed.createComponent(EfDataCardComponent);
            fixture.componentRef.setInput('tableKey', 'clients');
            fixture.componentRef.setInput('rows', []);
            fixture.detectChanges();
            fixture.componentRef.setInput('columns', columns);
            fixture.detectChanges();
            expect(fixture.componentInstance.isColumnHidden('position')).toBe(true);
        });

        it('"show all columns" shows it too', () => {
            const data: Record<string, string> = {};
            const comp = make(data, columns);
            comp.resetColumns();
            expect(visibleIds(comp)).toContain('position');
            expect(JSON.parse(data[key]).hiddenColumnIds).toEqual([]);
        });
    });
});
