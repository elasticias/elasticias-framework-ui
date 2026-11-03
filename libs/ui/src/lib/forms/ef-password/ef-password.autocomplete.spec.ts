import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfPasswordComponent } from './ef-password.component';

@Component({
  standalone: true,
  imports: [FormsModule, EfPasswordComponent],
  template: `<ef-password name="a" autocomplete="new-password" /><ef-password name="b" />`,
})
class Host {}

describe('EfPasswordComponent autocomplete and prefill', () => {
  it('writes autocomplete on the native input, default unchanged, and starts empty', async () => {
    await TestBed.configureTestingModule({
      imports: [Host, TranslateModule.forRoot()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].getAttribute('autocomplete')).toBe('new-password');
    expect(inputs[1].getAttribute('autocomplete')).not.toBe('new-password');
    expect(inputs[0].value).toBe('');
    expect(inputs[1].value).toBe('');
  });
});
