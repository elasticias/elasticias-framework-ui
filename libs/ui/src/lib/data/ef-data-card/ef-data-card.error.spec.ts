import { Component, signal } from '@angular/core';
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
 * The failure mode this guards: a search that failed leaves `loading`
 * false and `rows` empty, so the body falls through to the empty state
 * and tells the operator they have no clients. That is not a missing
 * error message, it is a false statement about their data.
 */
describe('ef-data-card error state', () => {
    async function make(
        mobile: boolean,
        opts: { loading?: boolean; errorMsg?: string; rows?: any[] } = {},
    ) {
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
        fixture.componentRef.setInput('rows', opts.rows ?? []);
        fixture.componentRef.setInput('loading', opts.loading ?? false);
        fixture.componentRef.setInput('errorMsg', opts.errorMsg ?? '');
        fixture.detectChanges();
        return fixture;
    }

    const row = { id: '1', name: 'Acme', total: 3 };
    const httpish = 'Http failure response for /api/clients: 500 Internal Server Error';

    for (const mobile of [false, true]) {
        const label = mobile ? 'mobile' : 'desktop';

        it(`${label}: error + no rows -> error state, not the empty state`, async () => {
            const fixture = await make(mobile, { errorMsg: httpish });
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('.tbl-empty--error')).not.toBeNull();
            // The empty state's own words must be nowhere on screen.
            expect(el.textContent).not.toContain('common_empty_none_yet');
            expect(el.querySelectorAll('ef-skeleton').length).toBe(0);
        });

        it(`${label}: error state offers a way out`, async () => {
            const fixture = await make(mobile, { errorMsg: httpish });
            const el = fixture.nativeElement as HTMLElement;
            const btn = el.querySelector<HTMLButtonElement>('.tbl-empty--error .tbl-empty__action');
            expect(btn).not.toBeNull();

            let retried = 0;
            fixture.componentInstance.retry.subscribe(() => retried++);
            btn!.click();
            expect(retried).toBe(1);
        });

        it(`${label}: the raw error message never reaches the body copy`, async () => {
            const fixture = await make(mobile, { errorMsg: httpish });
            const body = (fixture.nativeElement as HTMLElement).querySelector('.tbl-empty--error');
            expect(body!.textContent).not.toContain('500');
            expect(body!.textContent).not.toContain('Http failure');
        });

        it(`${label}: error state is announced, and is not a busy state`, async () => {
            const fixture = await make(mobile, { errorMsg: httpish });
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('[role="alert"]')).not.toBeNull();
            expect(el.querySelector('[aria-busy="true"]')).toBeNull();
            // A role on a row or cell would take the table semantics down
            // with it, so the alert lives on the box, not on its host.
            expect(el.querySelector('tr[role="alert"], td[role="alert"], li[role="alert"]'))
                .toBeNull();
        });

        it(`${label}: a retry in flight shows progress, not the error it is clearing`, async () => {
            const fixture = await make(mobile, { errorMsg: httpish, loading: true });
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('.tbl-empty--error')).toBeNull();
            expect(el.querySelectorAll('ef-skeleton').length).toBeGreaterThan(0);
        });

        it(`${label}: a failed refresh with rows keeps the rows`, async () => {
            const fixture = await make(mobile, { errorMsg: httpish, rows: [row] });
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('.tbl-empty--error')).toBeNull();
            expect(el.textContent).toContain('Acme');
        });

        // The chip is the whole failure signal in that rows-present case, so
        // it is also the last place the raw HTTP string could reach a reader.
        it(`${label}: the head chip names the failure without printing the error`, async () => {
            const fixture = await make(mobile, { errorMsg: httpish, rows: [row] });
            const head = (fixture.nativeElement as HTMLElement).querySelector('.tbl-head .count')!;
            expect(head.textContent).not.toContain('500');
            expect(head.textContent).not.toContain('Http failure');
            expect(head.textContent).toContain('common_error_refresh_failed');
        });

        it(`${label}: the head chip keeps the raw error reachable for diagnosis`, async () => {
            const fixture = await make(mobile, { errorMsg: httpish, rows: [row] });
            const chip = (fixture.nativeElement as HTMLElement)
                .querySelector('.tbl-head .count [role="status"]')!;
            expect(chip).not.toBeNull();
            // On an attribute nothing renders — not `title`, which would put
            // the exception back on screen in a tooltip.
            expect(chip.getAttribute('data-error')).toBe(httpish);
            expect(chip.getAttribute('title')).toBeNull();
        });

        it(`${label}: no error + no rows is still the empty state`, async () => {
            const fixture = await make(mobile, {});
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('.tbl-empty--error')).toBeNull();
            expect(el.querySelector('.tbl-empty')).not.toBeNull();
        });
    }

    it('desktop: the error box spans every column', async () => {
        const fixture = await make(false, { errorMsg: httpish });
        const el = fixture.nativeElement as HTMLElement;
        const cell = el.querySelector('tbody td')!;
        expect(cell.getAttribute('colspan')).toBe(String(el.querySelectorAll('thead th').length));
    });
});

@Component({
    standalone: true,
    imports: [EfDataCardComponent],
    template: `
        <ef-data-card [columns]="cols" [rows]="[]" [errorMsg]="err()">
            <span empty-state>SENTINEL_DESKTOP</span>
            <span empty-state-mobile>SENTINEL_MOBILE</span>
        </ef-data-card>
    `,
})
class HostComponent {
    readonly err = signal('');
    cols = [{ id: 'name', field: 'name', header: 'Name' }];
}

/**
 * ef-order-builder projects its own empty state. Its copy is just as
 * wrong as the default one when the request failed, so the error state
 * replaces it too — and gives it back the moment the error clears.
 */
describe('ef-data-card error vs projected empty-state', () => {
    for (const mobile of [false, true]) {
        const sentinel = mobile ? 'SENTINEL_MOBILE' : 'SENTINEL_DESKTOP';

        it(`${mobile ? 'mobile' : 'desktop'}: error hides the projected slot, clearing restores it`, async () => {
            TestBed.resetTestingModule();
            await TestBed.configureTestingModule({
                imports: [HostComponent, TranslateModule.forRoot()],
                providers: [{ provide: EfViewportService, useValue: makeViewport(mobile) }],
            }).compileComponents();
            const fixture = TestBed.createComponent(HostComponent);
            fixture.detectChanges();
            const el = fixture.nativeElement as HTMLElement;
            expect(el.textContent).toContain(sentinel);

            fixture.componentInstance.err.set('Boom');
            fixture.detectChanges();
            expect(el.textContent).not.toContain(sentinel);
            expect(el.querySelector('.tbl-empty--error')).not.toBeNull();

            fixture.componentInstance.err.set('');
            fixture.detectChanges();
            expect(el.textContent).toContain(sentinel);
            expect(el.querySelector('.tbl-empty--error')).toBeNull();
        });
    }
});
