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
