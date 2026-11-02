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
