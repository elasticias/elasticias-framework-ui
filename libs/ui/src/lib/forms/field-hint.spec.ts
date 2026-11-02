import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfInputTextComponent } from './ef-input-text/ef-input-text.component';
import { EfTextareaComponent } from './ef-textarea/ef-textarea.component';
import { EfInputNumberComponent } from './ef-inputnumber/ef-inputnumber.component';
import { EfSelectComponent } from './ef-select/ef-select.component';

/**
 * `hintKey` renders a short help text under a field and links it to the
 * focusable element through `aria-describedby`, so a screen reader reads the
 * hint with the field name. The hint is not an alert: it sits outside the
 * `role="alert"` container and is announced on focus, not when it appears.
 *
 * Every assertion reads the element the `<label for>` points at, which for a
 * PrimeNG select is its `span[role=combobox]`, not the host.
 */
type Inputs = Record<string, unknown>;

const CONTROLS: [string, Type<unknown>, Inputs][] = [
  ['ef-input-text (comptoir)', EfInputTextComponent, {}],
  ['ef-input-text (comptoir, suffix)', EfInputTextComponent, { suffix: 'cm' }],
  ['ef-textarea', EfTextareaComponent, {}],
  ['ef-inputnumber (comptoir)', EfInputNumberComponent, {}],
  ['ef-inputnumber (comptoir, suffix)', EfInputNumberComponent, { suffix: 'MAD' }],
  ['ef-inputnumber (primeng)', EfInputNumberComponent, { variant: 'primeng' }],
  ['ef-select (comptoir)', EfSelectComponent, { variant: 'comptoir' }],
  ['ef-select (primeng)', EfSelectComponent, {}],
  ['ef-select (primeng, multiple)', EfSelectComponent, { multiple: true }],
];

function render(cmp: Type<unknown>, inputs: Inputs) {
  TestBed.configureTestingModule({ imports: [cmp, TranslateModule.forRoot()] });
  const translate = TestBed.inject(TranslateService);
  translate.setTranslation('fr', { 'price.hint': 'Prix TTC, livraison comprise.' });
  translate.use('fr');
  const fixture = TestBed.createComponent(cmp);
  for (const [name, value] of Object.entries({ name: 'field', label: 'Prix', ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const forId = host.querySelector('label')?.getAttribute('for') ?? '';
  const target = () => host.querySelector(`[id="${forId}"]`) as HTMLElement;
  return { fixture, host, target };
}

const ids = (el: HTMLElement) => (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);

describe.each(CONTROLS)('%s: hintKey', (_name, cmp, inputs) => {
  it('renders the translated hint and points aria-describedby at it', () => {
    const { host, target } = render(cmp, { ...inputs, hintKey: 'price.hint' });
    const hint = host.querySelector('.ef-field-hint') as HTMLElement;
    expect(hint?.textContent?.trim()).toBe('Prix TTC, livraison comprise.');
    expect(hint.id).toBe('field-hint');
    expect(target()).toBeTruthy();
    expect(ids(target())).toContain('field-hint');
  });

  it('keeps the hint out of the alert region', () => {
    const { host } = render(cmp, { ...inputs, hintKey: 'price.hint', errors: ['Trop cher'] });
    const hint = host.querySelector('.ef-field-hint') as HTMLElement;
    expect(hint.closest('[role="alert"]')).toBeNull();
  });

  it('describes the field by both the hint and the errors when both show', () => {
    const { target } = render(cmp, { ...inputs, hintKey: 'price.hint', errors: ['Trop cher'] });
    expect(ids(target())).toEqual(['field-hint', 'field-errors']);
  });

  it('describes the field by the errors alone when there is no hint', () => {
    const { host, target } = render(cmp, { ...inputs, errors: ['Trop cher'] });
    expect(host.querySelector('.ef-field-hint')).toBeNull();
    expect(ids(target())).toEqual(['field-errors']);
  });

  it('has no aria-describedby without a hint or an error', () => {
    const { target } = render(cmp, inputs);
    expect(target().hasAttribute('aria-describedby')).toBe(false);
  });

  it('accepts a literal hint when no key is given', () => {
    const { host } = render(cmp, { ...inputs, hint: 'Texte libre' });
    expect(host.querySelector('.ef-field-hint')?.textContent?.trim()).toBe('Texte libre');
  });

  it('keeps the page direction on the hint when the field has its own dir', () => {
    const { fixture, host } = render(cmp, { ...inputs, hintKey: 'price.hint' });
    host.setAttribute('dir', 'ltr');
    fixture.detectChanges();
    const hint = host.querySelector('.ef-field-hint') as HTMLElement;
    expect(getComputedStyle(hint).direction).toBe('');
  });
});
