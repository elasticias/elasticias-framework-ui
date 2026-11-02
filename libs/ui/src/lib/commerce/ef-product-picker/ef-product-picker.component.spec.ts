import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject, of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { EfSmartBarComponent } from '../../data/ef-smart-bar/ef-smart-bar.component';
import { EfViewportService } from '@elasticias/core';
import { EfProductPickerComponent } from './ef-product-picker.component';
import type { EfPage } from '@elasticias/types';
import { EfProductPickerItem, EfProductPickerQuery } from './ef-product-picker.component.types';

function makeViewport(mobile: boolean) {
    return {
        current: signal(mobile ? 'mobile' : 'desktop'),
        isMobile: signal(mobile),
        isTablet: signal(false),
        isDesktop: signal(!mobile),
    };
}

const CATALOGUE: EfProductPickerItem[] = Array.from({ length: 30 }, (_, i) => ({
    id: `p${i + 1}`,
    reference: String(100 + i),
    title: i % 2 === 0 ? `Escada ${i + 1}` : `Musc ${i + 1}`,
    meta: 'Femme',
    disabled: i === 2,
}));

/** A server stand-in: filters on title or reference, pages by 20. */
function fakeSearch(calls: EfProductPickerQuery[]) {
    return (q: EfProductPickerQuery): Observable<EfPage<EfProductPickerItem>> => {
        calls.push(q);
        const text = q.text.toLowerCase();
        const hits = CATALOGUE.filter(
            p => !text || p.title.toLowerCase().includes(text) || (p.reference ?? '').includes(text),
        );
        const start = (q.pageNumber - 1) * q.pageSize;
        return of({ items: hits.slice(start, start + q.pageSize), totalCount: hits.length });
    };
}

/**
 * The picker adds products to a collection (and later, promotion targets).
 * What it must never do: lose a pick when the operator pages or searches,
 * offer a product that is already in, or leave the parent unable to reopen
 * it.
 */
describe('EfProductPickerComponent', () => {
    async function setup(mobile = false, search?: (q: EfProductPickerQuery) => Observable<EfPage<EfProductPickerItem>>) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfProductPickerComponent, TranslateModule.forRoot()],
            providers: [{ provide: EfViewportService, useValue: makeViewport(mobile) }],
        }).compileComponents();
        const calls: EfProductPickerQuery[] = [];
        const fixture = TestBed.createComponent(EfProductPickerComponent);
        fixture.componentRef.setInput(
            'search',
            search ? (q: EfProductPickerQuery) => (calls.push(q), search(q)) : fakeSearch(calls),
        );
        fixture.componentRef.setInput('titleKey', 'collections_picker_title');
        const confirmed: string[][] = [];
        let closed = 0;
        fixture.componentInstance.confirm.subscribe(ids => confirmed.push(ids));
        fixture.componentInstance.closed.subscribe(() => closed++);
        const open = async () => {
            fixture.componentRef.setInput('open', true);
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
        };
        const shut = () => {
            fixture.componentRef.setInput('open', false);
            fixture.detectChanges();
        };
        const dialog = () => document.querySelector<HTMLElement>('.es-dialog.ef-product-picker-dialog');
        const checkbox = (id: string) =>
            document.querySelector<HTMLInputElement>(`.ef-product-picker-dialog input[data-id="${id}"]`);
        /** The desktop row of a product: the control the operator uses. */
        const row = (id: string) => checkbox(id)?.closest('tr') as HTMLElement;
        const pick = (id: string) => row(id).querySelector<HTMLElement>('td[data-col="title"]')?.click();
        const footerButtons = () =>
            Array.from(document.querySelectorAll<HTMLButtonElement>('.ef-product-picker-dialog .p-dialog-footer .btn'));
        const settle = async () => {
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
        };
        return {
            fixture,
            cmp: fixture.componentInstance,
            calls,
            confirmed,
            closedCount: () => closed,
            open,
            shut,
            dialog,
            checkbox,
            row,
            pick,
            footerButtons,
            settle,
        };
    }

    afterEach(() => document.body.querySelectorAll('.p-dialog-mask').forEach(m => m.remove()));

    it('searches page one with an empty text when it opens', async () => {
        const { open, calls } = await setup();
        await open();
        expect(calls).toEqual([{ text: '', pageNumber: 1, pageSize: 20 }]);
        expect(document.querySelectorAll('.ef-product-picker-dialog tbody tr').length).toBe(20);
    });

    it('keeps the selection across pages and searches', async () => {
        const { open, cmp, checkbox, pick, settle } = await setup();
        await open();

        pick('p1');
        await settle();

        cmp.onPageChange(2);
        await settle();
        pick('p21');
        await settle();

        cmp.onSearch('musc');
        await settle();
        pick('p2');
        await settle();

        cmp.onPageChange(1);
        await settle();
        cmp.onSearch('');
        await settle();

        expect(checkbox('p1')!.checked).toBe(true);
        expect(cmp.selectedIds()).toEqual(['p1', 'p21', 'p2']);
    });

    it('toggles a row from anywhere on it, not only from the checkbox', async () => {
        const { open, cmp, settle } = await setup();
        await open();
        const row = document.querySelectorAll<HTMLElement>('.ef-product-picker-dialog tbody tr')[0];
        row.querySelector<HTMLElement>('td[data-col="title"]')!.click();
        await settle();
        expect(cmp.selectedIds()).toEqual(['p1']);
        row.querySelector<HTMLElement>('td[data-col="title"]')!.click();
        await settle();
        expect(cmp.selectedIds()).toEqual([]);
    });

    it('emits the selected ids on confirm, then closes', async () => {
        const { open, pick, settle, footerButtons, confirmed, closedCount } = await setup();
        await open();
        pick('p1');
        pick('p4');
        await settle();

        const [cancel, add] = footerButtons();
        expect(cancel).toBeTruthy();
        add.click();
        await settle();

        expect(confirmed).toEqual([['p1', 'p4']]);
        expect(closedCount()).toBe(1);
    });

    it('cannot confirm an empty selection', async () => {
        const { open, footerButtons } = await setup();
        await open();
        const add = footerButtons()[1];
        expect(add.disabled).toBe(true);
    });

    it('disables already-selected items passed as disabled', async () => {
        const { open, cmp, row, settle } = await setup();
        await open();
        const tr = row('p3');
        expect(tr.classList).toContain('is-disabled');
        expect(tr.getAttribute('aria-disabled')).toBe('true');

        // Neither the row, the keyboard nor a programmatic toggle can pick it.
        tr.querySelector<HTMLElement>('td[data-col="title"]')!.click();
        tr.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        cmp.toggle(CATALOGUE[2]);
        await settle();
        expect(cmp.selectedIds()).toEqual([]);
    });

    it('is one tab stop per row, toggled by Space and Enter, its state announced', async () => {
        const { open, cmp, row, checkbox, settle } = await setup();
        await open();
        const tr = row('p1');
        expect(tr.getAttribute('role')).toBe('button');
        expect(tr.getAttribute('tabindex')).toBe('0');
        expect(tr.getAttribute('aria-pressed')).toBe('false');
        // The tick is a picture of the state, not a second stop.
        expect(checkbox('p1')!.getAttribute('tabindex')).toBe('-1');
        expect(checkbox('p1')!.getAttribute('aria-hidden')).toBe('true');

        tr.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        await settle();
        expect(cmp.selectedIds()).toEqual(['p1']);
        expect(row('p1').getAttribute('aria-pressed')).toBe('true');

        row('p1').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await settle();
        expect(cmp.selectedIds()).toEqual([]);
    });

    it('keeps the newest answer when an older one arrives late', async () => {
        const answers = new Map<number, Subject<EfPage<EfProductPickerItem>>>();
        const slow = (q: EfProductPickerQuery) => {
            const s = new Subject<EfPage<EfProductPickerItem>>();
            answers.set(q.pageNumber, s);
            return s.asObservable();
        };
        const { open, cmp, settle } = await setup(false, slow);
        await open();
        answers.get(1)!.next({ items: CATALOGUE.slice(0, 20), totalCount: 30 });
        await settle();

        cmp.onPageChange(2);
        const late = answers.get(2)!;
        cmp.onPageChange(1);
        const fresh = answers.get(1)!;
        fresh.next({ items: CATALOGUE.slice(0, 20), totalCount: 30 });
        late.next({ items: CATALOGUE.slice(20), totalCount: 30 });
        await settle();

        const titles = Array.from(document.querySelectorAll('.ef-product-picker-dialog tbody td[data-col="title"]'));
        expect(titles[0].textContent?.trim()).toBe(CATALOGUE[0].title);
    });

    it('shows the error state and retries the same query', async () => {
        let fail = true;
        const flaky = (q: EfProductPickerQuery) =>
            fail
                ? throwError(() => new Error('500'))
                : of({ items: CATALOGUE.slice(0, q.pageSize), totalCount: 30 });
        const { open, calls, settle } = await setup(false, flaky);
        await open();
        const retry = document.querySelector<HTMLButtonElement>('.ef-product-picker-dialog .tbl-empty--error button');
        expect(retry).toBeTruthy();

        fail = false;
        retry!.click();
        await settle();
        expect(calls).toEqual([
            { text: '', pageNumber: 1, pageSize: 20 },
            { text: '', pageNumber: 1, pageSize: 20 },
        ]);
        expect(document.querySelectorAll('.ef-product-picker-dialog tbody tr').length).toBe(20);
    });

    it('emits closed and sets open back to false when the X closes it', async () => {
        const { open, cmp, settle, closedCount } = await setup();
        await open();
        document.querySelector<HTMLButtonElement>('.ef-product-picker-dialog .es-dialog__close')!.click();
        await settle();
        expect(closedCount()).toBe(1);
        expect(cmp.open()).toBe(false);
    });

    it('emits closed on cancel, and starts over when the parent reopens it', async () => {
        const { open, shut, pick, settle, footerButtons, closedCount, cmp, calls, confirmed } = await setup();
        await open();
        pick('p1');
        cmp.onPageChange(2);
        await settle();

        footerButtons()[0].click();
        await settle();
        expect(closedCount()).toBe(1);
        expect(confirmed).toEqual([]);

        // The parent sets [open] back to false on (closed), then reopens.
        shut();
        await open();
        expect(cmp.selectedIds()).toEqual([]);
        expect(calls.at(-1)).toEqual({ text: '', pageNumber: 1, pageSize: 20 });
    });

    it('shows how many products are selected, even while a page loads', async () => {
        const pending = new Subject<EfPage<EfProductPickerItem>>();
        let first = true;
        const search = (q: EfProductPickerQuery) => {
            if (first) {
                first = false;
                return of({ items: CATALOGUE.slice(0, q.pageSize), totalCount: 30 });
            }
            return pending.asObservable();
        };
        const { open, pick, cmp, settle } = await setup(false, search);
        await open();
        pick('p1');
        pick('p2');
        await settle();
        cmp.onPageChange(2);
        await settle();
        const status = document.querySelector('.ef-product-picker-dialog [data-role="selected-count"]')!;
        expect(status.getAttribute('aria-live')).toBe('polite');
        expect(status.textContent).toContain('ef_product_picker_selected');
    });

    it('does not take the screen-wide search shortcut', async () => {
        const { open, fixture } = await setup();
        await open();
        const bar = fixture.debugElement.query(By.directive(EfSmartBarComponent))
            ?? null;
        const instance = (bar?.componentInstance
            ?? fixture.debugElement.injector.get(EfSmartBarComponent, null)) as EfSmartBarComponent | null;
        expect(instance).toBeTruthy();
        expect(instance!.shortcut()).toBeNull();
    });

    it('is full screen at 390 px', async () => {
        const { open, dialog } = await setup(true);
        await open();
        const el = dialog()!;
        expect(el.classList).toContain('es-dialog--full');
        expect(el.classList).toContain('ef-product-picker-dialog--fullscreen');
    });

    it('is a 720 px dialog on a desktop', async () => {
        const { open, dialog } = await setup(false);
        await open();
        const el = dialog()!;
        expect(el.classList).not.toContain('es-dialog--full');
        expect(el.classList).not.toContain('ef-product-picker-dialog--fullscreen');
    });

    it('shows the selection state on a phone, where the table becomes a list', async () => {
        const { open, cmp, settle } = await setup(true);
        await open();
        const head = document.querySelectorAll<HTMLElement>('.ef-product-picker-dialog .mrow__head')[0];
        head.click();
        await settle();
        expect(cmp.selectedIds()).toEqual(['p1']);
        const indicator = document.querySelectorAll<HTMLInputElement>(
            '.ef-product-picker-dialog .mrow__head input[type="checkbox"]',
        )[0];
        expect(indicator.checked).toBe(true);
        expect(indicator.getAttribute('tabindex')).toBe('-1');
    });
});
