import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfInputTextComponent } from './ef-input-text.component';

@Component({
  standalone: true,
  imports: [FormsModule, EfInputTextComponent],
  template: `<ef-input-text labelKey="t.label" [labelParams]="{ n: 'Acme' }"
    placeholderKey="t.ph" [placeholderParams]="{ last4: '1234' }"
    hintKey="t.hint" [hintParams]="{ n: 'Acme' }" />`,
})
class ParamsHost {}

@Component({
  standalone: true,
  imports: [FormsModule, EfInputTextComponent],
  template: `<ef-input-text labelKey="t.label" placeholderKey="t.ph" />`,
})
class PlainHost {}

describe('AbstractEfFormControl translation params', () => {
  async function setup<T>(host: new () => T) {
    await TestBed.configureTestingModule({
      imports: [host as never, TranslateModule.forRoot()],
    }).compileComponents();
    const ts = TestBed.inject(TranslateService);
    ts.setTranslation('en', {
      t: { label: 'Name {{n}}', ph: 'ends in {{last4}}', hint: 'Hint {{n}}' },
    });
    ts.use('en');
    const fixture = TestBed.createComponent(host as never);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('applies params to label, placeholder and hint', async () => {
    const el = await setup(ParamsHost);
    expect(el.querySelector('input')?.getAttribute('placeholder')).toBe('ends in 1234');
    expect(el.querySelector('label')?.textContent?.trim()).toBe('Name Acme');
    expect(el.querySelector('.ef-field-hint')?.textContent?.trim()).toBe('Hint Acme');
  });

  it('leaves behaviour unchanged without params', async () => {
    const el = await setup(PlainHost);
    expect(el.querySelector('input')?.getAttribute('placeholder')).toBe('ends in {{last4}}');
    expect(el.querySelector('label')?.textContent?.trim()).toBe('Name {{n}}');
  });
});
