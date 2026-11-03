import { vi } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfPasswordComponent } from './ef-password.component';

@Component({
  standalone: true,
  imports: [FormsModule, EfPasswordComponent],
  template: `<ef-password name="b" hint="Some hint" />`,
})
class Host {}

describe('EfPasswordComponent aria-describedby writes', () => {
  it('does not rewrite aria-describedby on later renders when it is unchanged', async () => {
    await TestBed.configureTestingModule({
      imports: [Host, TranslateModule.forRoot()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
    const set = vi.spyOn(input, 'setAttribute');
    const remove = vi.spyOn(input, 'removeAttribute');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(set.mock.calls.filter(c => c[0] === 'aria-describedby')).toEqual([]);
    expect(remove.mock.calls.filter(c => c[0] === 'aria-describedby')).toEqual([]);
  });
});
