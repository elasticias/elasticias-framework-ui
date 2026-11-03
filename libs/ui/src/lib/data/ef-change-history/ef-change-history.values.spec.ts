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

describe('ef-change-history note formatter', () => {
    async function make(noteFormatter: any, note: string) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfChangeHistoryComponent, TranslateModule.forRoot()],
        }).compileComponents();
        const fixture = TestBed.createComponent(EfChangeHistoryComponent);
        fixture.componentRef.setInput('entries', [{ operation: 'note', note }]);
        if (noteFormatter) fixture.componentRef.setInput('noteFormatter', noteFormatter);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }
    const note = (el: HTMLElement) => el.querySelector('.ch-note')?.textContent?.trim();

    it('shows the raw note without a formatter', async () => {
        expect(note(await make(null, 'a:b'))).toBe('a:b');
    });

    it('shows the formatted note', async () => {
        expect(note(await make((n: string) => n.toUpperCase(), 'a:b'))).toBe('A:B');
    });

    it('falls back to the raw note when the formatter returns null', async () => {
        expect(note(await make(() => null, 'a:b'))).toBe('a:b');
    });

    it('renders markup as text, never as HTML', async () => {
        const el = await make(() => '<b>x</b>', 'a:b');
        expect(el.querySelector('.ch-note b')).toBeNull();
        expect(note(el)).toBe('<b>x</b>');
    });
});

describe('ef-change-history value direction', () => {
    it('isolates each before/after value as its own direction', async () => {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfChangeHistoryComponent, TranslateModule.forRoot()],
        }).compileComponents();
        const fixture = TestBed.createComponent(EfChangeHistoryComponent);
        fixture.componentRef.setInput('entries', [
            { operation: 'updated', changes: [{ field: 'phone', oldValue: '+212600000000', newValue: '+212611111111' }] },
            { operation: 'status_changed', fromStatus: 'A', toStatus: 'B' },
        ]);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const values = el.querySelectorAll('.ch-changes li span:not(.ch-field), .ch-status span');
        expect(values.length).toBe(4);
        values.forEach((v) => expect(v.getAttribute('dir')).toBe('auto'));
    });
});
