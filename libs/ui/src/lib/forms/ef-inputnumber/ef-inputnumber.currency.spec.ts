import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfInputNumberComponent } from './ef-inputnumber.component';

/**
 * `mode="currency"` on the default comptoir variant: the field shows the
 * amount formatted for the locale (2 decimals, Latin digits) with the
 * currency as an addon, so apps stop adding a manual `suffix="MAD"`.
 *
 * The invariant: whatever text sits in the box while it can be edited must
 * parse back to the same number. So the formatted text is shown only while
 * the field is not focused; on focus it switches to the ungrouped canonical
 * text, and nothing is reformatted while the user types.
 */
type Inputs = Record<string, unknown>;

function render(inputs: Inputs, localeId = 'fr-MA') {
  TestBed.configureTestingModule({
    imports: [EfInputNumberComponent, TranslateModule.forRoot()],
    providers: [{ provide: LOCALE_ID, useValue: localeId }],
  });
  const fixture = TestBed.createComponent(EfInputNumberComponent);
  for (const [name, value] of Object.entries({ name: 'fee', mode: 'currency', currency: 'MAD', ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const input = () => host.querySelector('input') as HTMLInputElement;
  const addon = () => host.querySelector('.ef-input-addon.is-currency') as HTMLElement | null;
  const emitted: (number | null)[] = [];
  fixture.componentInstance.valueChangeEvent.subscribe((v) => emitted.push(v));
  const focus = () => { input().dispatchEvent(new Event('focus')); fixture.detectChanges(); };
  const blur = () => { input().dispatchEvent(new Event('blur')); fixture.detectChanges(); };
  const type = (text: string) => {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, host, input, addon, focus, blur, type, emitted };
}

/* Bidi marks (U+200E/U+200F/U+061C) are layout hints, not content. */
const BIDI = /[‎‏؜]/;

describe('ef-inputnumber currency mode (comptoir)', () => {
  it.each([
    ['fr-MA', '1.234,50', 'MAD', 'suffix'],
    ['ar-MA', '1.234,50', 'د.م.', 'suffix'],
    ['fr', '1 234,50', 'MAD', 'suffix'],
    ['en-US', '1,234.50', 'MAD', 'prefix'],
  ])('%s: shows %s with %s as the %s addon', (locale, text, symbol, side) => {
    const { input, addon } = render({ value: 1234.5, locale });
    expect(input().value).toBe(text);
    expect(BIDI.test(input().value)).toBe(false);
    expect(addon()?.textContent?.trim()).toBe(symbol);
    expect(addon()?.classList).toContain(side === 'prefix' ? 'is-prefix' : 'is-suffix');
  });

  it('takes the locale from LOCALE_ID when none is given', () => {
    const { input, addon } = render({ value: 30 }, 'ar-MA');
    expect(input().value).toBe('30,00');
    expect(addon()?.textContent?.trim()).toBe('د.م.');
  });

  it('always uses Latin digits, even for a locale whose default is Arabic-Indic', () => {
    const { input } = render({ value: 30, locale: 'ar' });
    expect(input().value).toMatch(/^30[.,]00$/);
  });

  it.each(['fr-MA', 'ar-MA', 'ar', 'fr', 'en-US'])(
    '%s: the text shown on focus parses back to the same number',
    (locale) => {
      const { input, focus, type, blur, fixture } = render({ value: 1234.5, locale });
      focus();
      const editable = input().value;
      expect(editable).not.toMatch(/[\s ]/);
      type(editable);
      blur();
      expect(fixture.componentInstance.value).toBe(1234.5);
    },
  );

  it('does not reformat while the user types', () => {
    const { input, focus, type } = render({ value: null, locale: 'fr-MA' });
    focus();
    type('23,');
    expect(input().value).toBe('23,');
    type('23,5');
    expect(input().value).toBe('23,5');
  });

  it('formats again on blur and rounds the model to the fraction digits', () => {
    const { input, focus, type, blur, emitted, fixture } = render({ value: null, locale: 'fr-MA' });
    focus();
    type('12,345');
    blur();
    expect(fixture.componentInstance.value).toBe(12.35);
    expect(emitted.at(-1)).toBe(12.35);
    expect(input().value).toBe('12,35');
  });

  it('honours maxFractionDigits', () => {
    const { input } = render({ value: 7, locale: 'fr-MA', minFractionDigits: 0, maxFractionDigits: 0 });
    expect(input().value).toBe('7');
  });

  it('parses a pasted formatted amount with a bidi mark', () => {
    const { focus, type, fixture } = render({ value: null, locale: 'ar-MA' });
    focus();
    type('‏30,50');
    expect(fixture.componentInstance.value).toBe(30.5);
  });

  it('an explicit suffix wins over the currency symbol, so the unit shows once', () => {
    const { host, addon } = render({ value: 30, locale: 'fr-MA', suffix: 'MAD' });
    expect(addon()).toBeNull();
    const units = [...host.querySelectorAll('.ef-input-addon')].map((a) => a.textContent?.trim());
    expect(units).toEqual(['MAD']);
  });

  it('links the currency to the field so a screen reader reads the unit', () => {
    const { input, addon } = render({ value: 30, locale: 'fr-MA' });
    expect(addon()?.getAttribute('aria-hidden')).toBeNull();
    expect(input().getAttribute('aria-describedby')?.split(' ')).toContain(addon()?.id);
  });

  it('shows an empty field for no value', () => {
    const { input } = render({ value: null, locale: 'fr-MA' });
    expect(input().value).toBe('');
  });

  it('leaves decimal mode unformatted (existing behaviour)', () => {
    const { input, addon } = render({ value: 1234.5, locale: 'fr-MA', mode: 'decimal' });
    expect(input().value).toBe('1234.5');
    expect(addon()).toBeNull();
  });
});
