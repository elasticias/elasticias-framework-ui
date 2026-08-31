import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfInputTextComponent } from './ef-input-text.component';

/**
 * Guards ADR-009: ef-input-text defaults to the native `comptoir` variant.
 * These verify the (now-default) comptoir branch is a working
 * ControlValueAccessor — value in, input out — at the DOM level.
 */
@Component({
  standalone: true,
  imports: [FormsModule, EfInputTextComponent],
  template: `<ef-input-text [(ngModel)]="val" [ngModelOptions]="{ standalone: true }" />`,
})
class HostComponent {
  @ViewChild(EfInputTextComponent) cmp!: EfInputTextComponent;
  val = '';
}

describe('EfInputTextComponent (default comptoir variant)', () => {
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

  it('renders the native comptoir input by default (ADR-009)', () => {
    expect(host.cmp.variant).toBe('comptoir');
    expect(inputEl()).toBeTruthy();
  });

  it('writes ngModel value into the input', async () => {
    host.val = 'hello';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(inputEl().value).toBe('hello');
  });

  it('propagates input back to ngModel', async () => {
    const el = inputEl();
    el.value = 'world';
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.val).toBe('world');
  });
});
