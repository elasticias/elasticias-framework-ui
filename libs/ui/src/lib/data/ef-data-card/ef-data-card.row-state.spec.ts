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
    };
}

type Row = { id: string; name: string; on: boolean; locked: boolean };

/**
 * Row state for a table whose rows are toggles (a multi-select picker). The
 * row is already a button when the screen wires activation; `rowPressed`
 * makes it a toggle button (APG button pattern: Enter and Space, with
 * `aria-pressed`), `rowDisabled` dims it, says so, and stops it toggling.
 * Unset, neither changes anything.
 */
describe('ef-data-card row state', () => {
    const rows: Row[] = [
        { id: '1', name: 'Acme', on: true, locked: false },
        { id: '2', name: 'Globex', on: false, locked: true },
    ];

    async function make(mobile: boolean, withState = true) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfDataCardComponent, TranslateModule.forRoot()],
            providers: [{ provide: EfViewportService, useValue: makeViewport(mobile) }],
        }).compileComponents();
        const fixture = TestBed.createComponent(EfDataCardComponent<Row>);
        fixture.componentRef.setInput('columns', [{ id: 'name', field: 'name', header: 'Name', mobile: 'primary' }]);
        fixture.componentRef.setInput('rows', rows);
        fixture.componentRef.setInput('rowDoubleClickable', true);
        if (withState) {
            fixture.componentRef.setInput('rowPressed', (r: Row) => r.on);
            fixture.componentRef.setInput('rowDisabled', (r: Row) => r.locked);
        }
        const activated: Row[] = [];
        fixture.componentInstance.rowDoubleClick.subscribe((r: Row) => activated.push(r));
        fixture.detectChanges();
        return { fixture, el: fixture.nativeElement as HTMLElement, activated };
    }

    const key = (el: Element, k: string) => {
        const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
        el.dispatchEvent(ev);
        return ev;
    };

    describe('desktop', () => {
        it('announces the pressed state on the row button', async () => {
            const { el } = await make(false);
            const [a, b] = Array.from(el.querySelectorAll('tbody tr'));
            expect(a.getAttribute('role')).toBe('button');
            expect(a.getAttribute('aria-pressed')).toBe('true');
            expect(b.getAttribute('aria-pressed')).toBe('false');
        });

        it('toggles on Space as well as Enter, without scrolling', async () => {
            const { el, activated } = await make(false);
            const row = el.querySelectorAll('tbody tr')[0];
            const space = key(row, ' ');
            key(row, 'Enter');
            expect(space.defaultPrevented).toBe(true);
            expect(activated).toEqual([rows[0], rows[0]]);
        });

        it('leaves Space to a control inside the row', async () => {
            const { fixture, el, activated } = await make(false);
            const cell = el.querySelector('tbody tr td')!;
            const btn = document.createElement('button');
            cell.appendChild(btn);
            fixture.detectChanges();
            key(btn, ' ');
            expect(activated).toEqual([]);
        });

        it('dims a disabled row, says so, and does not activate it', async () => {
            const { el, activated } = await make(false);
            const row = el.querySelectorAll<HTMLElement>('tbody tr')[1];
            expect(row.classList).toContain('is-disabled');
            expect(row.getAttribute('aria-disabled')).toBe('true');
            row.querySelector('td')!.click();
            key(row, ' ');
            key(row, 'Enter');
            expect(activated).toEqual([]);
        });

        it('adds nothing when the inputs are unset', async () => {
            const { el } = await make(false, false);
            const row = el.querySelectorAll('tbody tr')[0];
            expect(row.hasAttribute('aria-pressed')).toBe(false);
            expect(row.hasAttribute('aria-disabled')).toBe(false);
        });
    });

    describe('phone', () => {
        it('puts the same state on the row head', async () => {
            const { el } = await make(true);
            const [a, b] = Array.from(el.querySelectorAll('.mrow__head'));
            expect(a.getAttribute('aria-pressed')).toBe('true');
            expect(b.getAttribute('aria-pressed')).toBe('false');
            expect(b.getAttribute('aria-disabled')).toBe('true');
            expect(b.closest('.mrow')!.classList).toContain('is-disabled');
        });

        it('does not activate a disabled row head', async () => {
            const { el, activated } = await make(true);
            el.querySelectorAll<HTMLElement>('.mrow__head')[1].click();
            expect(activated).toEqual([]);
        });
    });
});
