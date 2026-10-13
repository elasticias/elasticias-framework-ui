import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
    EF_MODULES_TOKEN,
    EfActiveModuleService,
    EfModule,
    EfPermissionService,
} from '@elasticias/core';
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
