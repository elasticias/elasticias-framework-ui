import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
    EF_MODULES_TOKEN,
    EfActiveModuleService,
    EfModule,
    EfPermissionService,
    EF_PREFERENCE_STORE,
    EfPreferenceStore,
} from '@elasticias/core';
import { Subject } from 'rxjs';
import { EfAppShellComponent } from './ef-app-shell.component';

const MODULES = [
    {
        id: 'sales',
        labelKey: 'm_sales',
        icon: 'pi pi-shopping-bag',
        accent: 'm-sales',
        defaultRoute: '/sales',
        navSections: [
            {
                id: 'sales',
                items: [
                    { id: 'SalesOrders', labelKey: 'orders', route: '/sales/orders', screenCode: 'SalesOrders' },
                    { id: 'Free', labelKey: 'free', route: '/sales/free' },
                ],
            },
            {
                id: 'catalog',
                items: [
                    { id: 'CatalogProducts', labelKey: 'products', route: '/sales/products', screenCode: 'CatalogProducts' },
                ],
            },
        ],
    },
] as unknown as EfModule[];

describe('EfAppShellComponent mobile sheet per-screen filter', () => {
    function setup() {
        TestBed.configureTestingModule({
            imports: [EfAppShellComponent, TranslateModule.forRoot()],
            providers: [provideRouter([]), { provide: EF_MODULES_TOKEN, useValue: MODULES }],
        });
        TestBed.inject(EfPermissionService).setPermissions([{ module: 'sales', level: 'admin' }]);
        TestBed.inject(EfActiveModuleService).setActiveModule('sales');
        return {
            perms: TestBed.inject(EfPermissionService),
            comp: TestBed.createComponent(EfAppShellComponent).componentInstance,
        };
    }

    const ids = (c: EfAppShellComponent) =>
        c.moduleSections().map(s => [s.id, s.items.map(i => i.id)]);

    it('keeps screenCode items when no screen grants were ever set', () => {
        const { comp } = setup();
        expect(ids(comp)).toEqual([
            ['sales', ['SalesOrders', 'Free']],
            ['catalog', ['CatalogProducts']],
        ]);
    });

    it('hides items without Read and drops sections left empty; items without screenCode stay', () => {
        const { comp, perms } = setup();
        perms.setScreenGrants({ SalesOrders: { permissions: ['Read', 'Delete'] } });
        expect(ids(comp)).toEqual([['sales', ['SalesOrders', 'Free']]]);
        perms.setScreenGrants({ SalesOrders: { permissions: ['Edit'] } });
        expect(ids(comp)).toEqual([['sales', ['Free']]]);
    });

    it('shows an item once Read is granted', () => {
        const { comp, perms } = setup();
        perms.setScreenGrants({ CatalogProducts: { permissions: ['Read'] } });
        expect(ids(comp)).toEqual([
            ['sales', ['Free']],
            ['catalog', ['CatalogProducts']],
        ]);
    });
});

describe('EfAppShellComponent side-panel preference store', () => {
    function fakeStore(initial: Record<string, string> = {}) {
        const data = { ...initial };
        const changes = new Subject<string>();
        return {
            data,
            changes,
            store: {
                get: (k: string) => data[k] ?? null,
                set: (k: string, v: string) => { data[k] = v; },
                remove: (k: string) => { delete data[k]; },
                changes: changes.asObservable(),
            } satisfies EfPreferenceStore,
        };
    }

    function create(store: EfPreferenceStore) {
        TestBed.configureTestingModule({
            imports: [EfAppShellComponent, TranslateModule.forRoot()],
            providers: [
                provideRouter([]),
                { provide: EF_MODULES_TOKEN, useValue: MODULES },
                { provide: EF_PREFERENCE_STORE, useValue: store },
            ],
        });
        return TestBed.createComponent(EfAppShellComponent).componentInstance;
    }

    it('reads the fold from the store and writes the toggle back to it', () => {
        const f = fakeStore({ 'ef.shell.side-collapsed': '1' });
        const comp = create(f.store);
        expect(comp.sideCollapsed()).toBe(true);
        comp.toggleSide();
        expect(f.data['ef.shell.side-collapsed']).toBe('0');
        expect(comp.sideCollapsed()).toBe(false);
    });

    it('follows a hydrate announced by the store', () => {
        const f = fakeStore();
        const comp = create(f.store);
        expect(comp.sideCollapsed()).toBe(false);
        f.data['ef.shell.side-collapsed'] = '1';
        f.changes.next('ef.shell.side-collapsed');
        expect(comp.sideCollapsed()).toBe(true);
    });
});
