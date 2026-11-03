import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfChangeHistoryComponent } from './ef-change-history.component';

const entries = [
    {
        operation: 'status_changed',
        fromStatus: 'Received',
        toStatus: 'Confirmed',
        changes: [{ field: 'orderStatus', oldValue: 'Received', newValue: 'Confirmed' }],
    },
];

describe('ef-change-history value labels', () => {
    async function make(valueLists?: any) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfChangeHistoryComponent, TranslateModule.forRoot()],
        }).compileComponents();
        TestBed.inject(TranslateService).setTranslation('fr', { st_conf: 'Confirmée' });
        TestBed.inject(TranslateService).use('fr');
        const fixture = TestBed.createComponent(EfChangeHistoryComponent);
        fixture.componentRef.setInput('entries', entries);
        if (valueLists) fixture.componentRef.setInput('valueLists', valueLists);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('shows raw values by default', async () => {
        const el = await make();
        expect(el.textContent).toContain('Received');
        expect(el.textContent).toContain('Confirmed');
    });

    it('maps change values and status from/to through the lists, translating keys', async () => {
        const list = [
            { code: 'received', label: 'Reçue' },
            { code: 'Confirmed', label: 'st_conf' },
        ];
        const el = await make({ orderStatus: list, status: list });
        const text = el.textContent ?? '';
        expect(text).toContain('Reçue');
        expect(text).toContain('Confirmée');
        expect(text).not.toContain('Received');
        expect(text).not.toContain('Confirmed');
    });

    it('keeps the raw value when no item matches', async () => {
        const el = await make({ orderStatus: [{ code: 'other', label: 'Autre' }] });
        expect(el.textContent).toContain('Received');
    });
});
