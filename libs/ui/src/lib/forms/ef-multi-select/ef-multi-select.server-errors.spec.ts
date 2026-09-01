import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfMultiSelectComponent } from './ef-multi-select.component';
import { EfServerErrorsDirective } from '../ef-server-errors.directive';

/**
 * Verifies the server-error retrofit on ef-multi-select (now extends
 * AbstractEfFormControl — see ADR-010). It exposes `serverErrors` (no
 * `isInvalid`), so we assert the rendered message via the explicit `[errors]`
 * input and the enclosing `[efServerErrors]` scope.
 */
@Component({
  standalone: true,
  imports: [FormsModule, EfMultiSelectComponent],
  template: `<ef-multi-select name="roles" [options]="[]" [errors]="errors" />`,
})
class ExplicitHost {
  @ViewChild(EfMultiSelectComponent) cmp!: EfMultiSelectComponent;
  errors: string[] | null = null;
}

@Component({
  standalone: true,
  imports: [FormsModule, EfMultiSelectComponent, EfServerErrorsDirective],
  template: `<div [efServerErrors]="map"><ef-multi-select name="roles" [options]="[]" /></div>`,
})
class ScopeHost {
  map: { [k: string]: string[] } | null = null;
}

const messageText = (fixture: ComponentFixture<unknown>): string =>
  (fixture.nativeElement.querySelector('small.text-danger.block')?.textContent ?? '').trim();

describe('EfMultiSelectComponent — server errors', () => {
  it('shows no message without errors', async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ExplicitHost, TranslateModule.forRoot()],
    }).createComponent(ExplicitHost);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(messageText(fixture)).toBe('');
  });

  it('renders the explicit [errors] message', async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ExplicitHost, TranslateModule.forRoot()],
    }).createComponent(ExplicitHost);
    fixture.componentInstance.errors = ['Au moins un rôle est requis.'];
    fixture.detectChanges();
    await fixture.whenStable();

    expect(messageText(fixture)).toBe('Au moins un rôle est requis.');
  });

  it('auto-links errors from the enclosing [efServerErrors] scope by name', async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ScopeHost, TranslateModule.forRoot()],
    }).createComponent(ScopeHost);
    fixture.componentInstance.map = { roles: ['Sélection invalide.'] };
    fixture.detectChanges();
    await fixture.whenStable();

    expect(messageText(fixture)).toBe('Sélection invalide.');
  });
});
