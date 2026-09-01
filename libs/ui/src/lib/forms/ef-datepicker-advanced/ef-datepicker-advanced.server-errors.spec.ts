import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfDatepickerAdvancedComponent } from './ef-datepicker-advanced.component';
import { EfServerErrorsDirective } from '../ef-server-errors.directive';

/**
 * Verifies the server-error retrofit on ef-datepicker-advanced (a standalone,
 * signal-based control that doesn't extend AbstractEfFormControl — see
 * ADR-010). Errors only render in field mode (`mode="field"`). Inputs are set
 * before the first detectChanges to avoid the component's view-during-CD work
 * tripping NG0100 in the test harness.
 */
@Component({
  standalone: true,
  imports: [EfDatepickerAdvancedComponent],
  template: `<ef-datepicker-advanced mode="field" name="orderDate" [errors]="errors" />`,
})
class ExplicitHost {
  @ViewChild(EfDatepickerAdvancedComponent) cmp!: EfDatepickerAdvancedComponent;
  errors: string[] | null = null;
}

@Component({
  standalone: true,
  imports: [EfDatepickerAdvancedComponent, EfServerErrorsDirective],
  template: `<div [efServerErrors]="map"><ef-datepicker-advanced mode="field" name="orderDate" /></div>`,
})
class ScopeHost {
  @ViewChild(EfDatepickerAdvancedComponent) cmp!: EfDatepickerAdvancedComponent;
  map: { [k: string]: string[] } | null = null;
}

const messageText = (fixture: ComponentFixture<unknown>): string =>
  (fixture.nativeElement.querySelector('small.text-danger.block')?.textContent ?? '').trim();

describe('EfDatepickerAdvancedComponent — server errors (field mode)', () => {
  it('shows no message and is not invalid without errors', async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ExplicitHost, TranslateModule.forRoot()],
    }).createComponent(ExplicitHost);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(messageText(fixture)).toBe('');
    expect(fixture.componentInstance.cmp.isInvalid).toBeFalsy();
  });

  it('renders the explicit [errors] message and marks the field invalid', async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ExplicitHost, TranslateModule.forRoot()],
    }).createComponent(ExplicitHost);
    fixture.componentInstance.errors = ['La date est requise.'];
    fixture.detectChanges();
    await fixture.whenStable();

    expect(messageText(fixture)).toBe('La date est requise.');
    expect(fixture.componentInstance.cmp.isInvalid).toBeTruthy();
  });

  it('auto-links errors from the enclosing [efServerErrors] scope by name', async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ScopeHost, TranslateModule.forRoot()],
    }).createComponent(ScopeHost);
    fixture.componentInstance.map = { orderDate: ['Date invalide.'] };
    fixture.detectChanges();
    await fixture.whenStable();

    expect(messageText(fixture)).toBe('Date invalide.');
    expect(fixture.componentInstance.cmp.isInvalid).toBeTruthy();
  });
});
