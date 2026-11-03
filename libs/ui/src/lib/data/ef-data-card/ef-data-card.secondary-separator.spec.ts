import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { EfDataCardComponent } from './ef-data-card.component';

describe('ef-data-card mobile secondary line', () => {
    async function parts(rows: object[]) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfDataCardComponent, TranslateModule.forRoot()],
            providers: [{
                provide: EfViewportService,
                useValue: { current: signal('mobile'), isMobile: signal(true), isTablet: signal(false), isDesktop: signal(false), isTabletOrBelow: signal(true) },
            }],
        }).compileComponents();
        const fixture = TestBed.createComponent(EfDataCardComponent<any>);
        fixture.componentRef.setInput('columns', [
            { id: 'name', field: 'name', header: 'Name', mobile: 'primary' },
            { id: 'a', field: 'a', header: 'A', mobile: 'secondary' },
            { id: 'b', field: 'b', header: 'B', mobile: 'secondary' },
            { id: 'c', field: 'c', header: 'C', mobile: 'secondary' },
        ]);
        fixture.componentRef.setInput('rows', rows);
        fixture.componentRef.setInput('mobileLayout', 'row');
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        return Array.from(
            (fixture.nativeElement as HTMLElement).querySelectorAll('.mrow__sec-part'),
        ).map(e => e.textContent?.trim());
    }

    it('renders only the present values, so separators sit between them', async () => {
        expect(await parts([{ name: 'N', a: 'x', b: '', c: 'z' }])).toEqual(['x', 'z']);
        expect(await parts([{ name: 'N', a: null, b: '  ', c: 'z' }])).toEqual(['z']);
        expect(await parts([{ name: 'N', a: 'x', b: 'y', c: 'z' }])).toEqual(['x', 'y', 'z']);
    });
});
