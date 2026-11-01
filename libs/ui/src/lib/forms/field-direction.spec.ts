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
type Inputs = Record<string, unknown>;

const CONTROLS: [string, Type<unknown>, Inputs][] = [
  ['ef-input-text', EfInputTextComponent, {}],
  ['ef-textarea', EfTextareaComponent, {}],
  ['ef-inputnumber', EfInputNumberComponent, {}],
  ['ef-select', EfSelectComponent, {}],
  ['ef-multi-select', EfMultiSelectComponent, {}],
  ['ef-password', EfPasswordComponent, {}],
  ['ef-datepicker', EfDatepickerComponent, {}],
  ['ef-datepicker-advanced', EfDatepickerAdvancedComponent, { mode: 'field' }],
];

/* The control is the fixture's root, with `dir` set as an app sets it, on the
   host element. (A host template built from a template literal would read
   the same, but angular-eslint cannot parse an interpolated inline template.) */
function render(cmp: Type<unknown>, inputs: Inputs, dir: string | null) {
  TestBed.configureTestingModule({ imports: [cmp, TranslateModule.forRoot()] });
  const fixture = TestBed.createComponent(cmp);
  const host = fixture.nativeElement as HTMLElement;
  if (dir !== null) host.setAttribute('dir', dir);
  for (const [name, value] of Object.entries({ name: 'field', label: 'Titre (arabe)', ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const control = host.querySelector('.ef-field-control') as HTMLElement;
  const part = control.firstElementChild as HTMLElement;
  return { fixture, host, control, part };
}

const direction = (el: Element) => getComputedStyle(el).direction;

describe.each(CONTROLS)('%s: the label follows the page, the control follows its dir', (_selector, cmp, inputs) => {
  it('renders its label beside an .ef-field-control', () => {
    const { host, control } = render(cmp, inputs, 'rtl');
    expect(host.querySelector('label')?.textContent).toContain('Titre (arabe)');
    expect(control).toBeTruthy();
    expect(control.contains(host.querySelector('label'))).toBe(false);
  });

  it.each(['rtl', 'ltr', 'auto'])('keeps the surrounding direction on the host when dir="%s"', (dir) => {
    const { host } = render(cmp, inputs, dir);
    expect(host.getAttribute('dir')).toBe(dir);
    expect(direction(host)).toBe('inherit');
  });

  it.each(['rtl', 'ltr'])('gives the control part dir="%s"', (dir) => {
    const { part } = render(cmp, inputs, dir);
    expect(direction(part)).toBe(dir);
  });

  it('declares no direction without a dir attribute', () => {
    const { host, part } = render(cmp, inputs, null);
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
    (_selector, cmp, native) => {
      const { host } = render(cmp, {}, 'auto');
      expect(getComputedStyle(host.querySelector(native) as HTMLElement).unicodeBidi).toBe('plaintext');
    },
  );

  it('leaves the native control alone otherwise', () => {
    const { host } = render(EfInputTextComponent, {}, 'rtl');
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
