import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfReadOnlyDirective } from './ef-read-only.directive';
import { EfInputTextComponent } from './ef-input-text/ef-input-text.component';
import { EfCheckboxComponent } from './ef-checkbox/ef-checkbox.component';
import { EfSelectComponent } from './ef-select/ef-select.component';
import { EfQuantityStepperComponent } from './ef-quantity-stepper/ef-quantity-stepper.component';
import { EfDatepickerComponent } from './ef-datepicker/ef-datepicker.component';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    EfReadOnlyDirective,
    EfInputTextComponent,
    EfCheckboxComponent,
    EfSelectComponent,
    EfDatepickerComponent,
    EfQuantityStepperComponent,
  ],
  template: `
    <div [efReadOnly]="ro">
      <ef-input-text name="t" />
      <ef-checkbox name="c" labelKey="x" variant="comptoir" />
      <ef-select name="s" [options]="[]" />
      <ef-datepicker name="d" />
      <ef-quantity-stepper [value]="5" />
    </div>
  `,
})
class Host {
  ro = true;
}

async function setup(ro: boolean) {
  const fixture = TestBed.configureTestingModule({
    imports: [Host, TranslateModule.forRoot()],
  }).createComponent(Host);
  fixture.componentInstance.ro = ro;
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function states(fixture: { nativeElement: HTMLElement }) {
  const el = fixture.nativeElement;
  return {
    text: el.querySelector<HTMLInputElement>('ef-input-text input')!.disabled,
    checkbox: el.querySelector<HTMLInputElement>('ef-checkbox input')!.disabled,
    checkboxLabel: el.querySelector('ef-checkbox label.ef-checkbox-native')!.classList.contains('is-disabled'),
    select: !!el.querySelector('ef-select .p-disabled, ef-select [aria-disabled="true"], ef-select [disabled]'),
    stepper: [...el.querySelectorAll<HTMLInputElement | HTMLButtonElement>('ef-quantity-stepper input, ef-quantity-stepper button')].every((e) => e.disabled),
    datepicker: !!el.querySelector('ef-datepicker input[disabled], ef-datepicker .p-disabled'),
  };
}

describe('EfReadOnlyDirective', () => {
  it('disables every control when true', async () => {
    const s = states(await setup(true));
    expect(s).toEqual({ text: true, checkbox: true, checkboxLabel: true, select: true, datepicker: true, stepper: true });
  });

  it('leaves controls enabled when false', async () => {
    const s = states(await setup(false));
    expect(s).toEqual({ text: false, checkbox: false, checkboxLabel: false, select: false, datepicker: false, stepper: false });
  });

  it('re-enables controls when toggled off', async () => {
    const fixture = await setup(true);
    fixture.componentInstance.ro = false;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(states(fixture)).toEqual({ text: false, checkbox: false, checkboxLabel: false, select: false, datepicker: false, stepper: false });
  });
});
