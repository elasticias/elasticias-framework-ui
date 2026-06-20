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

  it('renders the native comptoir number input by default (ADR-009)', () => {
    expect(host.cmp.variant).toBe('comptoir');
    const el = inputEl();
    expect(el).toBeTruthy();
    expect(el.type).toBe('number');
  });

  it('writes ngModel value into the input', async () => {
    host.val = 42;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(inputEl().value).toBe('42');
  });

  it('propagates input back to ngModel as a number', async () => {
    const el = inputEl();
    el.value = '7';
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.val).toBe(7);
  });
});
