import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';
import localeFr from '@angular/common/locales/fr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EfDatepickerAdvancedComponent } from './ef-datepicker-advanced.component';

/**
 * Locale details of the panel: the typed-date placeholder follows the
 * reader's language but always the order and digits the parser accepts,
 * and the month arrows mirror in a right-to-left page.
 */

registerLocaleData(localeAr);
registerLocaleData(localeFr);

describe('EfDatepickerAdvancedComponent locale', () => {
    let fixture: ComponentFixture<EfDatepickerAdvancedComponent>;

    async function make(locale: string): Promise<HTMLElement> {
        await TestBed.configureTestingModule({
            imports: [EfDatepickerAdvancedComponent, TranslateModule.forRoot()],
            providers: [{ provide: LOCALE_ID, useValue: locale }],
        }).compileComponents();
        fixture = TestBed.createComponent(EfDatepickerAdvancedComponent);
        fixture.componentRef.setInput('mode', 'field');
        fixture.componentRef.setInput('selectionMode', 'single');
        fixture.componentRef.setInput('showTime', true);
        fixture.detectChanges();
        document.body.appendChild(fixture.nativeElement);
        (fixture.nativeElement.querySelector('.dp__field-trigger') as HTMLButtonElement).click();
        fixture.detectChanges();
        return document.body.querySelector('.dp__panel') as HTMLElement;
    }

    const dateInput = (panel: HTMLElement) =>
        panel.querySelector('.dp__field input') as HTMLInputElement;

    afterEach(() => {
        fixture?.destroy();
        fixture?.nativeElement.remove();
    });

    it('shows JJ/MM/AAAA in French', async () => {
        expect(dateInput(await make('fr')).placeholder).toBe('JJ/MM/AAAA');
    });

    it('shows the Latin-digit DD/MM/YYYY pattern in Arabic, not the French one', async () => {
        const placeholder = dateInput(await make('ar')).placeholder;
        expect(placeholder).toBe('DD/MM/YYYY');
        expect(placeholder).not.toContain('JJ');
    });

    it('the placeholder matches what the parser accepts', async () => {
        const panel = await make('ar');
        const input = dateInput(panel);
        input.value = '04/11/2026';
        input.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        expect(input.value).toBe('04/11/2026');
        // Arabic-Indic digits are not a date to this field; it reverts.
        input.value = '٠٤/١١/٢٠٢٦';
        input.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        expect(input.value).toBe('04/11/2026');
    });

    it('an app can set the placeholder per language with date_input_placeholder', async () => {
        const panel = await make('ar');
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('ar', { date_input_placeholder: 'يوم/شهر/سنة' });
        translate.use('ar');
        fixture.detectChanges();
        expect(dateInput(panel).placeholder).toBe('يوم/شهر/سنة');
    });

    it('keeps the previous-month control first, so RTL places it on the right', async () => {
        const nav = Array.from((await make('ar')).querySelectorAll<HTMLButtonElement>('.dp__cal-head .dp__cal-nav'));
        expect(nav.map(b => b.getAttribute('aria-label'))).toEqual(['date_prev_month', 'date_next_month']);
        expect(nav[0].querySelector('i')?.classList).toContain('pi-chevron-left');
    });

    it('mirrors the month arrows in RTL (icon glyphs do not mirror on their own)', () => {
        const css = readFileSync(resolve(__dirname, '../../_patterns.scss'), 'utf8');
        expect(css).toMatch(/\[dir='rtl'\] \.dp__cal-nav i\s*\{\s*transform: scaleX\(-1\);/);
    });
});
