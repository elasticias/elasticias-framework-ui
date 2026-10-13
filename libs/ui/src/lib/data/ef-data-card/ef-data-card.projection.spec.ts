import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { EfDataCardComponent } from './ef-data-card.component';

@Component({
    standalone: true,
    imports: [EfDataCardComponent],
    template: `
        <ef-data-card [columns]="cols" [rows]="[]" [loading]="loading()">
            <span empty-state>SENTINEL_DESKTOP</span>
            <span empty-state-mobile>SENTINEL_MOBILE</span>
        </ef-data-card>
    `,
})
class HostComponent {
    readonly loading = signal(false);
    cols = [{ id: 'name', field: 'name', header: 'Name' }];
}

function viewport(mobile: boolean) {
    return {
        current: signal(mobile ? 'mobile' : 'desktop'),
        isMobile: signal(mobile),
        isTablet: signal(false),
        isDesktop: signal(!mobile),
        isTabletOrBelow: signal(mobile),
    };
}

describe('ef-data-card projected empty-state slots', () => {
    for (const mobile of [false, true]) {
        const sentinel = mobile ? 'SENTINEL_MOBILE' : 'SENTINEL_DESKTOP';
        it(`${mobile ? 'mobile' : 'desktop'}: projects at idle, hides while loading`, async () => {
            TestBed.resetTestingModule();
            await TestBed.configureTestingModule({
                imports: [HostComponent, TranslateModule.forRoot()],
                providers: [{ provide: EfViewportService, useValue: viewport(mobile) }],
            }).compileComponents();
            const fixture = TestBed.createComponent(HostComponent);
            fixture.detectChanges();
            const el = fixture.nativeElement as HTMLElement;
            expect(el.textContent).toContain(sentinel);

            fixture.componentInstance.loading.set(true);
            fixture.detectChanges();
            expect(el.textContent).not.toContain(sentinel);
            expect(el.querySelectorAll('ef-skeleton').length).toBeGreaterThan(0);

            fixture.componentInstance.loading.set(false);
            fixture.detectChanges();
            expect(el.textContent).toContain(sentinel);
        });
    }
});

describe('ef-data-card horizontal scroller', () => {
    it('puts the table in its own scroller inside the clipping shell, outside the head and pager', async () => {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [HostComponent, TranslateModule.forRoot()],
            providers: [{ provide: EfViewportService, useValue: viewport(false) }],
        }).compileComponents();
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const table = el.querySelector('table.tbl')!;
        expect(table.parentElement!.classList).toContain('tbl-scroll');
        expect(table.parentElement!.parentElement!.classList).toContain('tbl-wrap');
        expect(el.querySelector('.tbl-scroll .tbl-head')).toBeNull();
    });
});

describe('ef-data-card clipping shell', () => {
    it('keeps .tbl-wrap clipped while a row menu is open, so no count of open row menus can leave it unclipped', async () => {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [HostComponent, TranslateModule.forRoot()],
            providers: [{ provide: EfViewportService, useValue: viewport(false) }],
        }).compileComponents();
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const wrap = el.querySelector('.tbl-wrap') as HTMLElement;
        // What ef-row-actions dispatches when a row menu opens. Row menus are
        // fixed to the viewport, so the shell has no reason to unclip.
        wrap.querySelector('table')!.dispatchEvent(
            new CustomEvent('ef-row-actions-toggle', { bubbles: true, detail: { open: true } }),
        );
        fixture.detectChanges();
        expect(wrap.classList).not.toContain('has-open-menu');
    });
});
