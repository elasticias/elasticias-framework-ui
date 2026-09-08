import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import {
  EfChangePasswordComponent,
  EfChangePasswordSubmit,
} from './ef-change-password.component';

describe('EfChangePasswordComponent', () => {
  let fixture: ComponentFixture<EfChangePasswordComponent>;
  let component: EfChangePasswordComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfChangePasswordComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(EfChangePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Fill the three signals the template writes to. */
  function fill(current: string, next: string, confirmation: string): void {
    component.currentPassword.set(current);
    component.newPassword.set(next);
    component.confirmation.set(confirmation);
    fixture.detectChanges();
  }

  it('renders the current-password field only when requireCurrent is true', () => {
    fixture.componentRef.setInput('requireCurrent', true);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('ef-password').length,
    ).toBe(3);

    fixture.componentRef.setInput('requireCurrent', false);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('ef-password').length,
    ).toBe(2);
  });

  it('reports the rule each password breaks', () => {
    fill('Ancien1!', 'short', 'short');
    expect(component.validationKeys()).toContain('ef_change_password_too_short');

    fill('Ancien1!', 'lowercase1', 'lowercase1');
    expect(component.validationKeys()).toContain('ef_change_password_uppercase');

    fill('Ancien1!', 'NoDigitsHere', 'NoDigitsHere');
    expect(component.validationKeys()).toContain('ef_change_password_digit');

    fill('Ancien1!', 'Correct1Horse', 'Correct1Mouse');
    expect(component.validationKeys()).toContain('ef_change_password_mismatch');
  });

  it('blocks submission until every rule passes', () => {
    fill('Ancien1!', 'Correct1Horse', 'Correct1Mouse');
    expect(component.canSubmit()).toBe(false);

    fill('Ancien1!', 'Correct1Horse', 'Correct1Horse');
    expect(component.canSubmit()).toBe(true);
  });

  it('blocks submission while busy', () => {
    fill('Ancien1!', 'Correct1Horse', 'Correct1Horse');
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    expect(component.canSubmit()).toBe(false);
  });

  it('requires the current password only when requireCurrent is true', () => {
    fixture.componentRef.setInput('requireCurrent', true);
    fill('', 'Correct1Horse', 'Correct1Horse');
    expect(component.canSubmit()).toBe(false);

    fixture.componentRef.setInput('requireCurrent', false);
    fixture.detectChanges();
    expect(component.canSubmit()).toBe(true);
  });

  it('emits the current password only when it was asked for', () => {
    const emitted: EfChangePasswordSubmit[] = [];
    component.submitted.subscribe((v) => emitted.push(v));

    fixture.componentRef.setInput('requireCurrent', true);
    fill('Ancien1!', 'Correct1Horse', 'Correct1Horse');
    component.submit();

    fixture.componentRef.setInput('requireCurrent', false);
    fixture.detectChanges();
    component.submit();

    expect(emitted).toEqual([
      { currentPassword: 'Ancien1!', newPassword: 'Correct1Horse' },
      { currentPassword: undefined, newPassword: 'Correct1Horse' },
    ]);
  });

  it('does not emit when the form is invalid', () => {
    const emitted: EfChangePasswordSubmit[] = [];
    component.submitted.subscribe((v) => emitted.push(v));

    fill('Ancien1!', 'Correct1Horse', 'Correct1Mouse');
    component.submit();

    expect(emitted).toEqual([]);
  });
});
