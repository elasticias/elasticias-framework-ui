import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { EfDataCardComponent } from './ef-data-card.component';
import { EfDataCardColumn, EfDataCardExportRequest } from './ef-data-card.types';

/**
 * A text column can show a composed label (kind + rule) while the row holds
 * codes. `exportValue` lets the column say what belongs in the file, so the
 * CSV reads like the screen.
 */
describe('ef-data-card export value', () => {
    const viewport = {
        current: signal('desktop'),
        isMobile: signal(false),
        isTablet: signal(false),
        isDesktop: signal(true),
        isTabletOrBelow: signal(false),
    };

    async function request(columns: EfDataCardColumn[]) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfDataCardComponent, TranslateModule.forRoot()],
            providers: [{ provide: EfViewportService, useValue: viewport }],
        }).compileComponents();
        const fixture = TestBed.createComponent(EfDataCardComponent);
        fixture.componentRef.setInput('columns', columns);
        fixture.componentRef.setInput('rows', []);
        fixture.detectChanges();
        let req!: EfDataCardExportRequest;
        fixture.componentInstance.exportRequest.subscribe((r) => (req = r));
        fixture.componentInstance.requestExport();
        return req;
    }

    const row = { kind: 'auto', rule: 'new', total: 4, at: new Date('2026-09-05T12:00:00Z') };

    it('uses exportValue(row) instead of the raw field', async () => {
        const col: EfDataCardColumn = {
            id: 'kind', field: 'kind', header: 'Kind', type: 'text',
            exportValue: (r: any) => `Automatique : ${r.rule === 'new' ? 'nouveautes' : r.rule}`,
        };
        const req = await request([col]);
        expect(req.resolveCell(row, req.columns[0])).toBe('Automatique : nouveautes');
    });

    it('lets exportValue win over the reference lookup and date handling', async () => {
        const col: EfDataCardColumn = {
            id: 'at', field: 'at', header: 'At', type: 'date', exportValue: () => 'custom',
        };
        const req = await request([col]);
        expect(req.resolveCell(row, req.columns[0])).toBe('custom');
    });

    it('writes an empty cell when exportValue returns null or undefined', async () => {
        const col: EfDataCardColumn = {
            id: 'kind', field: 'kind', header: 'Kind', type: 'text', exportValue: () => null,
        };
        const req = await request([col]);
        expect(req.resolveCell(row, req.columns[0])).toBe('');
    });

    it('leaves a column without exportValue as before', async () => {
        const col: EfDataCardColumn = { id: 'total', field: 'total', header: 'Total', type: 'number' };
        const req = await request([col]);
        expect(req.resolveCell(row, req.columns[0])).toBe(4);
    });
});
