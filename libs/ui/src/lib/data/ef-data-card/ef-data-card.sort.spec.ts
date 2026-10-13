import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { EfDataCardComponent } from './ef-data-card.component';
import { EfDataCardColumn, EfDataCardSort } from './ef-data-card.types';

/**
 * A new column used to start at `desc` unconditionally, which reads as
 * backwards on a name column. `firstSortDirection` lets a column choose;
 * without it the old behaviour holds, so no existing screen changes.
 */
describe('ef-data-card first sort direction', () => {
    const viewport = {
        current: signal('desktop'),
        isMobile: signal(false),
        isTablet: signal(false),
        isDesktop: signal(true),
        isTabletOrBelow: signal(false),
    };

    async function make(columns: EfDataCardColumn[], sort: EfDataCardSort | null = null) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfDataCardComponent, TranslateModule.forRoot()],
            providers: [{ provide: EfViewportService, useValue: viewport }],
        }).compileComponents();
        const fixture = TestBed.createComponent(EfDataCardComponent);
        fixture.componentRef.setInput('columns', columns);
        fixture.componentRef.setInput('rows', [{ id: '1', name: 'Acme', total: 3 }]);
        fixture.componentRef.setInput('sort', sort);
        const emitted: EfDataCardSort[] = [];
        fixture.componentInstance.sortChange.subscribe((s) => emitted.push(s));
        fixture.detectChanges();
        const click = (i: number) => {
            (fixture.nativeElement.querySelectorAll('.tbl-sort')[i] as HTMLButtonElement).click();
            fixture.detectChanges();
        };
        return { fixture, emitted, click };
    }

    const name: EfDataCardColumn = { id: 'name', field: 'name', header: 'Name', type: 'text', sortable: true };
    const total: EfDataCardColumn = { id: 'total', field: 'total', header: 'Total', type: 'money', sortable: true };

    it('starts a column with no option at desc, whatever its type', async () => {
        const { emitted, click } = await make([name, total]);
        click(0);
        click(1);
        expect(emitted.map((e) => e.direction)).toEqual(['desc', 'desc']);
    });

    it('starts at the configured direction on the first click', async () => {
        const { emitted, click } = await make([{ ...name, firstSortDirection: 'asc' }, total]);
        click(0);
        expect(emitted[0]).toEqual({ field: 'name', direction: 'asc' });
    });

    it('honours an explicit desc', async () => {
        const { emitted, click } = await make([{ ...name, firstSortDirection: 'desc' }]);
        click(0);
        expect(emitted[0].direction).toBe('desc');
    });

    it('toggles from the current direction once the column is the sort', async () => {
        const col = { ...name, firstSortDirection: 'asc' as const };
        const asc = await make([col], { field: 'name', direction: 'asc' });
        asc.click(0);
        expect(asc.emitted[0].direction).toBe('desc');

        const desc = await make([col], { field: 'name', direction: 'desc' });
        desc.click(0);
        expect(desc.emitted[0].direction).toBe('asc');
    });

    it('applies the first direction to the sortField a column sorts on', async () => {
        const { emitted, click } = await make(
            [{ id: 'emp', header: 'Employé', type: 'custom', sortable: true, sortField: 'creator.fullName', firstSortDirection: 'asc' }],
            { field: 'orderId', direction: 'desc' },
        );
        click(0);
        expect(emitted[0]).toEqual({ field: 'creator.fullName', direction: 'asc' });
    });
});
