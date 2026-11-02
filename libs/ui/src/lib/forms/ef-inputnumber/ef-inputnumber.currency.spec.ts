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

  it('clearing while focused empties the box, so typing does not append to the old amount', () => {
    const { input, focus, fixture } = render({ value: 30, locale: 'fr-MA' });
    focus();
    expect(input().value).toBe('30,00');
    fixture.componentInstance.clearValue();
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBeNull();
    expect(input().value).toBe('');
  });

  it('a stepper or form write while focused shows the new amount', () => {
    const { input, focus, fixture } = render({ value: 30, locale: 'fr-MA', step: 5 });
    focus();
    fixture.componentInstance.step$(1);
    fixture.detectChanges();
    expect(input().value).toBe('35,00');
    fixture.componentInstance.writeValue(12.5);
    fixture.detectChanges();
    expect(input().value).toBe('12,50');
  });

  it.each([
    ['1.234,50', 1234.5],
    ['1,234.50', 1234.5],
    ['1 234,50', 1234.5],
  ])('typing the grouped form "%s" keeps the amount (%s)', (text, expected) => {
    const { focus, type, blur, fixture } = render({ value: null, locale: 'fr-MA' });
    focus();
    type(text);
    blur();
    expect(fixture.componentInstance.value).toBe(expected);
  });

  /* Money safety: with at most 2 decimals, the locale's own group separator
     followed by groups of exactly 3 digits is grouping, never a decimal.
     "1.500" typed into a fr-MA MAD field is 1 500 MAD, not 1,50. */
  it.each([
    ['fr-MA', '1.500', 1500],
    ['fr-MA', '1 500', 1500],
    ['fr-MA', '1.234.567', 1234567],
    ['fr-MA', '1,5', 1.5],
    ['fr-MA', '1,500', 1.5],
    ['fr-MA', '12.50', 12.5],
    ['fr-MA', '0.500', 0.5],
    ['fr-MA', '1.234,50 MAD', 1234.5],
    ['fr-MA', '\u200f1.500', 1500],
    ['ar-MA', '1.500', 1500],
    ['ar-MA', '1,5', 1.5],
    ['ar-MA', '\u200f1.234,50 \u062f.\u0645.\u200f', 1234.5],
    ['ar', '1,500', 1500],
    ['ar', '1.5', 1.5],
    ['fr', '1\u202f500', 1500],
    ['fr', '1,5', 1.5],
    ['en-US', '1,500', 1500],
    ['en-US', '1.5', 1.5],
    ['en-US', 'MAD 1,234.50', 1234.5],
    ['en-US', '-1,500', -1500],
  ])('%s: typed or pasted "%s" is %s', (locale, text, expected) => {
    const { focus, type, blur, fixture } = render({ value: null, locale });
    focus();
    type(text);
    blur();
    expect(fixture.componentInstance.value).toBe(expected);
  });

  it('a currency field with 3 decimals keeps the separator as a decimal', () => {
    const { focus, type, blur, fixture } = render({ value: null, locale: 'fr-MA', currency: 'TND' });
    focus();
    type('1.500');
    blur();
    expect(fixture.componentInstance.value).toBe(1.5);
  });

  it('decimal mode keeps reading a lone separator as the decimal', () => {
    const { input, fixture } = render({ value: null, locale: 'fr-MA', mode: 'decimal' });
    input().value = '1.500';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value).toBe(1.5);
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

  it('does not build number formatters on every change detection', () => {
    const { fixture, focus, blur } = render({ value: 1234.5, locale: 'fr-MA' });
    focus();
    blur();
    const spy = vi.spyOn(Intl, 'NumberFormat');
    for (let i = 0; i < 5; i++) {
      fixture.componentInstance.value = 1234.5 + i;
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();
    }
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
