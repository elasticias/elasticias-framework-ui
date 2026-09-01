import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfPasswordComponent } from './ef-password.component';
import { EfServerErrorsDirective } from '../ef-server-errors.directive';

/**
 * Verifies the server-error retrofit on ef-password (one of the standalone
 * controls that doesn't extend AbstractEfFormControl — see ADR-010): the
 * explicit `[errors]` input and the enclosing `[efServerErrors]` scope both
 * surface a message and flip the invalid state.
 */
@Component({
  standalone: true,
  imports: [FormsModule, EfPasswordComponent],
  template: `<ef-password name="password" [errors]="errors" />`,
})
class ExplicitHost {
  @ViewChild(EfPasswordComponent) cmp!: EfPasswordComponent;
  errors: string[] | null = null;
}

@Component({
  standalone: true,
  imports: [FormsModule, EfPasswordComponent, EfServerErrorsDirective],
  template: `<div [efServerErrors]="map"><ef-password name="password" /></div>`,
})
class ScopeHost {
  @ViewChild(EfPasswordComponent) cmp!: EfPasswordComponent;
  map: { [k: string]: string[] } | null = null;
}

const messageText = (fixture: ComponentFixture<unknown>): string =>
  (fixture.nativeElement.querySelector('small.text-danger.block')?.textContent ?? '').trim();

describe('EfPasswordComponent — server errors', () => {
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
    fixture.componentInstance.errors = ['Mot de passe trop faible.'];
    fixture.detectChanges();
    await fixture.whenStable();

    expect(messageText(fixture)).toBe('Mot de passe trop faible.');
    expect(fixture.componentInstance.cmp.isInvalid).toBeTruthy();
  });

  it('auto-links errors from the enclosing [efServerErrors] scope by name', async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ScopeHost, TranslateModule.forRoot()],
    }).createComponent(ScopeHost);
    fixture.componentInstance.map = { password: ['Le mot de passe est requis.'] };
    fixture.detectChanges();
    await fixture.whenStable();

    expect(messageText(fixture)).toBe('Le mot de passe est requis.');
    expect(fixture.componentInstance.cmp.isInvalid).toBeTruthy();
  });
});
