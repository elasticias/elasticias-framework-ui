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

/**
 * Opening a row. This had no coverage at all, which is how it shipped needing
 * a double-click on desktop and offering no way in at all on a phone.
 */
describe('ef-data-card row activation', () => {
    const rows = [
        { id: '1', name: 'Acme', total: 3, ref: 'A-1' },
        { id: '2', name: 'Globex', total: 9, ref: 'B-2' },
    ];

    async function make(mobile: boolean, navigable: boolean) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfDataCardComponent, TranslateModule.forRoot()],
            providers: [{ provide: EfViewportService, useValue: makeViewport(mobile) }],
        }).compileComponents();
        const fixture = TestBed.createComponent(EfDataCardComponent);
        fixture.componentRef.setInput('columns', [
            { id: 'name', field: 'name', header: 'Name' },
            { id: 'ref', field: 'ref', header: 'Ref' },
            { id: 'total', field: 'total', header: 'Total', type: 'number' },
        ]);
        fixture.componentRef.setInput('rows', rows);
        fixture.componentRef.setInput('rowDoubleClickable', navigable);
        const opened: unknown[] = [];
        fixture.componentInstance.rowDoubleClick.subscribe((r: unknown) => opened.push(r));
        fixture.detectChanges();
        return { fixture, el: fixture.nativeElement as HTMLElement, opened };
    }

    describe('desktop', () => {
        it('opens the row on a single click', async () => {
            const { el, opened } = await make(false, true);
            el.querySelectorAll('tbody tr')[0].querySelector('td')!.click();
            expect(opened).toEqual([rows[0]]);
        });

        it('stays shut when the screen wired no navigation', async () => {
            const { el, opened } = await make(false, false);
            el.querySelectorAll('tbody tr')[0].querySelector('td')!.click();
            expect(opened).toEqual([]);
        });

        it('ignores a click that lands on a control inside the row', async () => {
            const { fixture, el, opened } = await make(false, true);
            const cell = el.querySelectorAll('tbody tr')[0].querySelector('td')!;
            const btn = document.createElement('button');
            cell.appendChild(btn);
            fixture.detectChanges();
            btn.click();
            expect(opened).toEqual([]);
        });

        it('does not throw away a text selection the click just finished', async () => {
            const { el, opened } = await make(false, true);
            const cell = el.querySelectorAll('tbody tr')[0].querySelector('td')!;
            const range = document.createRange();
            range.selectNodeContents(cell);
            const sel = window.getSelection()!;
            sel.removeAllRanges();
            sel.addRange(range);
            cell.click();
            expect(opened).toEqual([]);
            sel.removeAllRanges();
        });
    });

    describe('mobile', () => {
        it('opens the record when the head is tapped', async () => {
            const { el, opened } = await make(true, true);
            (el.querySelector('.mrow__head') as HTMLElement).click();
            expect(opened).toEqual([rows[0]]);
        });

        it('keeps expansion reachable through the chevron', async () => {
            const { fixture, el, opened } = await make(true, true);
            const toggle = el.querySelector('.mrow__disclosure') as HTMLButtonElement;
            expect(toggle).not.toBeNull();
            expect(toggle.getAttribute('aria-expanded')).toBe('false');
            toggle.click();
            fixture.detectChanges();
            // expands, and does NOT also navigate
            expect(el.querySelector('.mrow')!.classList).toContain('is-open');
            expect(opened).toEqual([]);
        });

        it('falls back to expanding the head when no navigation is wired', async () => {
            const { fixture, el, opened } = await make(true, false);
            expect(el.querySelector('.mrow__disclosure')).toBeNull();
            const head = el.querySelector('.mrow__head') as HTMLElement;
            expect(head.getAttribute('aria-expanded')).toBe('false');
            head.click();
            fixture.detectChanges();
            expect(el.querySelector('.mrow')!.classList).toContain('is-open');
            expect(opened).toEqual([]);
        });

        it('does not put aria-expanded on a head that navigates', async () => {
            const { el } = await make(true, true);
            const head = el.querySelector('.mrow__head') as HTMLElement;
            expect(head.getAttribute('role')).toBe('button');
            expect(head.getAttribute('aria-expanded')).toBeNull();
        });
    });
});
