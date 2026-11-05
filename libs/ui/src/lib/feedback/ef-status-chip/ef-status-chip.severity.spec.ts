import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SCREEN_REF_DATA_SERVICE } from '@elasticias/screens';
import { EfStatusChipComponent } from './ef-status-chip.component';

const EXPECTED: Record<string, string> = {
    success: 'chip-delivered',
    info: 'chip-processing',
    warn: 'chip-pending',
    warning: 'chip-pending',
    danger: 'chip-cancelled',
    secondary: 'chip-onhold',
    contrast: 'chip-module',
    primary: 'chip-tenant',
    SUCCESS: 'chip-delivered',
    banana: 'chip-neutral',
};

describe('ef-status-chip PrimeNG severity vocabulary', () => {
    for (const [severity, tone] of Object.entries(EXPECTED)) {
        it(`maps metadata.color "${severity}" to ${tone}`, async () => {
            TestBed.resetTestingModule();
            await TestBed.configureTestingModule({
                imports: [EfStatusChipComponent, TranslateModule.forRoot()],
                providers: [
                    {
                        provide: SCREEN_REF_DATA_SERVICE,
                        useValue: {
                            getReference: () =>
                                signal([{ code: 'X', label: 'X', metadata: { color: severity } }]),
                        },
                    },
                ],
            }).compileComponents();
            const fixture = TestBed.createComponent(EfStatusChipComponent);
            fixture.componentRef.setInput('referenceKey', 'k');
            fixture.componentRef.setInput('code', 'X');
            fixture.detectChanges();
            const chip = (fixture.nativeElement as HTMLElement).querySelector('.chip');
            expect(chip?.classList.contains(tone)).toBe(true);
        });
    }
});

describe('ef-status-chip icon', () => {
    async function render(metadata: Record<string, unknown>, icon = '') {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfStatusChipComponent, TranslateModule.forRoot()],
            providers: [
                {
                    provide: SCREEN_REF_DATA_SERVICE,
                    useValue: { getReference: () => signal([{ code: 'X', label: 'X', metadata }]) },
                },
            ],
        }).compileComponents();
        const fixture = TestBed.createComponent(EfStatusChipComponent);
        fixture.componentRef.setInput('referenceKey', 'k');
        fixture.componentRef.setInput('code', 'X');
        if (icon) fixture.componentRef.setInput('icon', icon);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('shows the metadata icon instead of the dot', async () => {
        const el = await render({ color: 'success', icon: 'pi-check' });
        expect(el.querySelector('i.pi.pi-check')).not.toBeNull();
        expect(el.textContent).not.toContain('●');
    });

    it('accepts a bare icon name', async () => {
        const el = await render({ icon: 'check' });
        expect(el.querySelector('i.pi.pi-check')).not.toBeNull();
    });

    it('keeps the dot when no icon is set', async () => {
        const el = await render({ color: 'danger' });
        expect(el.querySelector('i.pi')).toBeNull();
        expect(el.textContent).toContain('●');
    });

    it('lets the icon input override metadata', async () => {
        const el = await render({ icon: 'pi-check' }, 'pi-times');
        expect(el.querySelector('i.pi.pi-times')).not.toBeNull();
        expect(el.querySelector('i.pi.pi-check')).toBeNull();
    });
});
