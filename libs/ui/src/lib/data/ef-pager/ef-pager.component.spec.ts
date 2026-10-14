import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { EfPagerComponent } from './ef-pager.component';

function makeViewport(mobile: boolean) {
    return {
        current: signal(mobile ? 'mobile' : 'desktop'),
        isMobile: signal(mobile),
        isTablet: signal(false),
        isDesktop: signal(!mobile),
    };
}

/**
 * The full page window (‹ 1 … 4 5 6 … N ›) is nine 48px touch targets,
 * about 464px, and a 390px phone has about 316px inside the card. It ran
 * off the card's right edge and the card clipped it, taking "next" and the
 * last page with it. On a phone the pager is first · prev · "5 of N" ·
 * next · last, which reaches every page the window offered.
 */
describe('ef-pager', () => {
    async function make(mobile: boolean, page: number, total = 500, size = 25) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfPagerComponent, TranslateModule.forRoot()],
            providers: [{ provide: EfViewportService, useValue: makeViewport(mobile) }],
        }).compileComponents();
        const fixture = TestBed.createComponent(EfPagerComponent);
        fixture.componentRef.setInput('pageNumber', page);
        fixture.componentRef.setInput('pageSize', size);
        fixture.componentRef.setInput('totalCount', total);
        fixture.componentRef.setInput('hideSize', true);
        const emitted: number[] = [];
        fixture.componentInstance.pageChange.subscribe((p: number) => emitted.push(p));
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const buttons = () => [...el.querySelectorAll<HTMLButtonElement>('.pages button.pg')];
        return { el, emitted, buttons };
    }

    describe('desktop', () => {
        it('shows the windowed page list', async () => {
            const { buttons } = await make(false, 5);
            expect(buttons().map(b => b.textContent!.trim())).toEqual(['‹', '1', '4', '5', '6', '20', '›']);
        });

        it('has no compact status', async () => {
            const { el } = await make(false, 5);
            expect(el.querySelector('.pg-status')).toBeNull();
        });
    });

    describe('phone', () => {
        it('shows first, previous, next and last only, with no numbered buttons', async () => {
            const { buttons } = await make(true, 5);
            expect(buttons().map(b => b.getAttribute('aria-label'))).toEqual([
                'common_page_first',
                'common_page_previous',
                'common_page_next',
                'common_page_last',
            ]);
        });

        it('states the current page and the total', async () => {
            const { el } = await make(true, 5);
            expect(el.querySelector('.pg-status')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('5 common_of 20');
        });

        it('jumps to the first and the last page', async () => {
            const { buttons, emitted } = await make(true, 5);
            buttons()[0].click();
            buttons()[3].click();
            expect(emitted).toEqual([1, 20]);
        });

        it('steps one page back and forward', async () => {
            const { buttons, emitted } = await make(true, 5);
            buttons()[1].click();
            buttons()[2].click();
            expect(emitted).toEqual([4, 6]);
        });

        it('disables first and previous on the first page', async () => {
            const { buttons } = await make(true, 1);
            expect(buttons().map(b => b.disabled)).toEqual([true, true, false, false]);
        });

        it('disables next and last on the last page', async () => {
            const { buttons } = await make(true, 20);
            expect(buttons().map(b => b.disabled)).toEqual([false, false, true, true]);
        });
    });
});
