import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { EfDataCardComponent } from './ef-data-card.component';

function makeViewport(mobile: boolean) {
    return {
        current: signal(mobile ? 'mobile' : 'desktop'),
        isMobile: signal(mobile),
        isTablet: signal(false),
        isDesktop: signal(!mobile),
        isTabletOrBelow: signal(mobile),
    };
}

describe('ef-data-card loading vs empty', () => {
    async function make(mobile: boolean, loading: boolean, rows: any[], pageSize = 25) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfDataCardComponent, TranslateModule.forRoot()],
            providers: [{ provide: EfViewportService, useValue: makeViewport(mobile) }],
        }).compileComponents();
        const fixture = TestBed.createComponent(EfDataCardComponent);
        fixture.componentRef.setInput('columns', [
            { id: 'name', field: 'name', header: 'Name' },
            { id: 'total', field: 'total', header: 'Total', type: 'number' },
        ]);
        fixture.componentRef.setInput('rows', rows);
        fixture.componentRef.setInput('loading', loading);
        fixture.componentRef.setInput('pageSize', pageSize);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    const row = { id: '1', name: 'Acme', total: 3 };

    for (const mobile of [false, true]) {
        const label = mobile ? 'mobile' : 'desktop';

        it(`${label}: loading + no rows -> skeleton, no empty state, aria-busy`, async () => {
            const el = await make(mobile, true, []);
            expect(el.querySelectorAll('ef-skeleton').length).toBeGreaterThan(0);
            expect(el.querySelector('.tbl-empty')).toBeNull();
            expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
        });

        it(`${label}: loading + rows -> keeps rows, no skeleton, aria-busy`, async () => {
            const el = await make(mobile, true, [row]);
            expect(el.querySelectorAll('ef-skeleton').length).toBe(0);
            expect(el.textContent).toContain('Acme');
            expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
        });

        it(`${label}: idle + no rows -> empty state, no skeleton, no aria-busy`, async () => {
            const el = await make(mobile, false, []);
            expect(el.querySelectorAll('ef-skeleton').length).toBe(0);
            expect(el.querySelector('.tbl-empty')).not.toBeNull();
            expect(el.querySelector('[aria-busy="true"]')).toBeNull();
        });

        it(`${label}: idle + rows -> rows only`, async () => {
            const el = await make(mobile, false, [row]);
            expect(el.querySelectorAll('ef-skeleton').length).toBe(0);
            expect(el.querySelector('.tbl-empty')).toBeNull();
            expect(el.textContent).toContain('Acme');
        });
    }

    it('skeleton row count is clamped to 3..10 from pageSize', async () => {
        const wide = await make(false, true, [], 100);
        expect(wide.querySelectorAll('tbody tr').length).toBe(10);
        const narrow = await make(false, true, [], 1);
        expect(narrow.querySelectorAll('tbody tr').length).toBe(3);
        const mid = await make(false, true, [], 5);
        expect(mid.querySelectorAll('tbody tr').length).toBe(5);
        // one placeholder cell per visible column
        expect(mid.querySelectorAll('tbody tr')[0].querySelectorAll('td').length).toBe(
            mid.querySelectorAll('thead th').length,
        );
    });
});
