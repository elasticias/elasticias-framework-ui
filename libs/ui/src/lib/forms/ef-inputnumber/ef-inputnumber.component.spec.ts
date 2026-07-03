import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfInputNumberComponent } from './ef-inputnumber.component';

/**
 * Guards ADR-009: ef-inputnumber defaults to the native `comptoir` variant.
 * These verify the (now-default) comptoir branch is a working
 * ControlValueAccessor — numeric value in, parsed number out.
 */
@Component({
  standalone: true,
  imports: [FormsModule, EfInputNumberComponent],
  template: `<ef-inputnumber [(ngModel)]="val" [ngModelOptions]="{ standalone: true }" />`,
})
class HostComponent {
  @ViewChild(EfInputNumberComponent) cmp!: EfInputNumberComponent;
  val: number | null = null;
}

describe('EfInputNumberComponent (default comptoir variant)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const inputEl = (): HTMLInputElement =>
    fixture.nativeElement.querySelector('input.ef-input');

  /** Simulates the user typing `text` into the comptoir input. */
  const type = async (text: string): Promise<void> => {
    const el = inputEl();
    el.value = text;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('renders the native comptoir text input by default (ADR-009)', () => {
    expect(host.cmp.variant).toBe('comptoir');
    const el = inputEl();
    expect(el).toBeTruthy();
    // type=text + inputmode=decimal: keeps the mobile numeric keypad
    // while allowing "," as a decimal separator (type=number swallows it).
    expect(el.type).toBe('text');
    expect(el.getAttribute('inputmode')).toBe('decimal');
    expect(el.getAttribute('autocomplete')).toBe('off');
  });

  it('writes ngModel value into the input', async () => {
    host.val = 42;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(inputEl().value).toBe('42');
  });

  it('propagates input back to ngModel as a number', async () => {
    await type('7');
    expect(host.val).toBe(7);
  });

  it('parses a comma decimal ("23,50" → 23.5) — fr-MA data entry', async () => {
    await type('23,50');
    expect(host.val).toBe(23.5);
  });

  it('still parses a dot decimal ("23.50" → 23.5)', async () => {
    await type('23.50');
    expect(host.val).toBe(23.5);
  });

  it('round-trips integers unchanged ("12" → 12)', async () => {
    await type('12');
    expect(host.val).toBe(12);
  });

  it('ignores space group separators ("1 234,5" → 1234.5)', async () => {
    await type('1 234,5');
    expect(host.val).toBe(1234.5);
  });

  it('coerces unparseable text to null (existing empty semantics)', async () => {
    await type('12');
    expect(host.val).toBe(12);

    await type('abc');
    expect(host.val).toBeNull();
  });

  it('clamps to min/max on blur and reflects the canonical text', async () => {
    host.cmp.min = 0;
    host.cmp.max = 100;

    await type('250');
    expect(host.val).toBe(250); // typing itself stays permissive

    const el = inputEl();
    el.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.val).toBe(100);
    expect(el.value).toBe('100');
  });

  it('normalizes a dangling separator on blur ("23," → "23")', async () => {
    await type('23,');
    expect(host.val).toBe(23);

    const el = inputEl();
    el.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.val).toBe(23);
    expect(el.value).toBe('23');
  });
});
