import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EF_PREFERENCE_STORE, efTablePrefsKey } from '@elasticias/core';
import { EfDataCardComponent } from './ef-data-card.component';

describe('ef-data-card preferences through the store', () => {
    function make(data: Record<string, string>) {
        TestBed.configureTestingModule({
            imports: [EfDataCardComponent, TranslateModule.forRoot()],
            providers: [{
                provide: EF_PREFERENCE_STORE,
                useValue: { get: (k: string) => data[k] ?? null, set: (k: string, v: string) => { data[k] = v; }, remove: (k: string) => { delete data[k]; } },
            }],
        });
        const fixture = TestBed.createComponent(EfDataCardComponent);
        fixture.componentRef.setInput('tableKey', 'clients');
        fixture.componentRef.setInput('columns', [{ id: 'name', field: 'name', header: 'Name' }]);
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
});
