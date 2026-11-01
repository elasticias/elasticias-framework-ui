import { Component, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfInputTextComponent } from './ef-input-text/ef-input-text.component';
import { EfTextareaComponent } from './ef-textarea/ef-textarea.component';
import { EfInputNumberComponent } from './ef-inputnumber/ef-inputnumber.component';
import { EfSelectComponent } from './ef-select/ef-select.component';
import { EfMultiSelectComponent } from './ef-multi-select/ef-multi-select.component';
import { EfPasswordComponent } from './ef-password/ef-password.component';
import { EfDatepickerComponent } from './ef-datepicker/ef-datepicker.component';
import { EfDatepickerAdvancedComponent } from './ef-datepicker-advanced/ef-datepicker-advanced.component';

/**
 * A field's `dir` describes the value typed into it (an Arabic title on a
 * French screen, a URL on an Arabic screen), not the field's label. The label
 * belongs to the page, so it keeps the surrounding direction, and only the
 * control part takes the field's own `dir`. `dir` stays on the host, where
 * apps and their specs set and read it.
 *
 * jsdom has no UA stylesheet and no inheritance, so these read the declared
 * values: `inherit` on the host (the browser then gives it the page's
 * direction) and the field's direction on the control part. Keep these
 * stylesheets ASCII: a non-ASCII character makes Sass emit `@charset`, and
 * jsdom then drops the rule that follows it.
 */
const CONTROLS: [string, Type<unknown>, string][] = [
  ['ef-input-text', EfInputTextComponent, ''],
  ['ef-textarea', EfTextareaComponent, ''],
  ['ef-inputnumber', EfInputNumberComponent, ''],
  ['ef-select', EfSelectComponent, ''],
  ['ef-multi-select', EfMultiSelectComponent, ''],
  ['ef-password', EfPasswordComponent, ''],
  ['ef-datepicker', EfDatepickerComponent, ''],
  ['ef-datepicker-advanced', EfDatepickerAdvancedComponent, 'mode="field"'],
];

function render(selector: string, cmp: Type<unknown>, extra: string, dir: string | null) {
  const dirAttr = dir === null ? '' : `dir="${dir}"`;
  @Component({
    standalone: true,
    imports: [cmp],
    template: `<${selector} ${dirAttr} ${extra} name="field" label="Titre (arabe)" />`,
  })
  class HostComponent {}

  TestBed.configureTestingModule({ imports: [HostComponent, TranslateModule.forRoot()] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement.querySelector(selector) as HTMLElement;
  const control = host.querySelector('.ef-field-control') as HTMLElement;
  const part = control.firstElementChild as HTMLElement;
  return { fixture, host, control, part };
}

const direction = (el: Element) => getComputedStyle(el).direction;

describe.each(CONTROLS)('%s: the label follows the page, the control follows its dir', (selector, cmp, extra) => {
  it('renders its label beside an .ef-field-control', () => {
    const { host, control } = render(selector, cmp, extra, 'rtl');
    expect(host.querySelector('label')?.textContent).toContain('Titre (arabe)');
    expect(control).toBeTruthy();
    expect(control.contains(host.querySelector('label'))).toBe(false);
  });

  it.each(['rtl', 'ltr', 'auto'])('keeps the surrounding direction on the host when dir="%s"', (dir) => {
    const { host } = render(selector, cmp, extra, dir);
    expect(host.getAttribute('dir')).toBe(dir);
    expect(direction(host)).toBe('inherit');
  });

  it.each(['rtl', 'ltr'])('gives the control part dir="%s"', (dir) => {
    const { part } = render(selector, cmp, extra, dir);
    expect(direction(part)).toBe(dir);
  });

  it('declares no direction without a dir attribute', () => {
    const { host, part } = render(selector, cmp, extra, null);
    expect(direction(host)).toBe('');
    expect(direction(part)).toBe('');
  });
});

describe('dir="auto" on a text field', () => {
  it.each([
    ['ef-input-text', EfInputTextComponent, 'input'],
    ['ef-textarea', EfTextareaComponent, 'textarea'],
  ] as [string, Type<unknown>, string][])(
    '%s lets the native control take the direction of its own text',
    (selector, cmp, native) => {
      const { host } = render(selector, cmp, '', 'auto');
      expect(getComputedStyle(host.querySelector(native) as HTMLElement).unicodeBidi).toBe('plaintext');
    },
  );

  it('leaves the native control alone otherwise', () => {
    const { host } = render('ef-input-text', EfInputTextComponent, '', 'rtl');
    expect(getComputedStyle(host.querySelector('input') as HTMLElement).unicodeBidi).toBe('');
  });
});

describe('error messages under a field with its own dir', () => {
  @Component({
    standalone: true,
    imports: [EfInputTextComponent],
    template: `<ef-input-text dir="rtl" name="titleAr" label="Titre (arabe)" [errors]="['Le titre est trop long.']" />`,
  })
  class ErrorsHostComponent {}

  it('are in the page language, so they keep the page direction', () => {
    TestBed.configureTestingModule({ imports: [ErrorsHostComponent, TranslateModule.forRoot()] });
    const fixture = TestBed.createComponent(ErrorsHostComponent);
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('ef-input-text [role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Le titre est trop long.');
    expect(direction(alert)).toBe('');
    expect(direction(fixture.nativeElement.querySelector('ef-input-text .ef-input-wrap'))).toBe('rtl');
  });
});
