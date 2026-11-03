import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfPasswordComponent } from './ef-password.component';

@Component({
  standalone: true,
  imports: [FormsModule, EfPasswordComponent],
  template: `<ef-password name="a" /><ef-password name="b" variant="comptoir" />`,
})
class Host {}

describe('EfPasswordComponent variant', () => {
  it('adds the comptoir skin class only when asked; default is unchanged', async () => {
    await TestBed.configureTestingModule({ imports: [Host, TranslateModule.forRoot()] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const roots = fixture.nativeElement.querySelectorAll('p-password') as NodeListOf<HTMLElement>;
    expect(roots[0].classList.contains('ef-password-field')).toBe(true);
    expect(roots[0].classList.contains('ef-password--comptoir')).toBe(false);
    expect(roots[1].classList.contains('ef-password--comptoir')).toBe(true);
  });
});
