import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfSelectComponent } from './ef-select.component';

@Component({
  standalone: true,
  imports: [FormsModule, EfSelectComponent],
  template: `
    <form #testForm="ngForm">
      <ef-select
        [(ngModel)]="selectedValue"
        name="testField"
        [options]="options"
        [optionLabel]="optionLabel"
        [optionValue]="optionValue"
        [required]="required"
        [showClear]="showClear"
      />
    </form>
  `,
})
class TestHostComponent {
  @ViewChild(EfSelectComponent) selectComponent!: EfSelectComponent;
  @ViewChild('testForm') form!: NgForm;
  selectedValue: any = null;
  options: any[] = [];
  optionLabel = 'name';
  optionValue: string | undefined = 'id';
  required = false;
  showClear = false;
}

describe('EfSelectComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let select: EfSelectComponent;

  const MOCK_OPTIONS = [
    { id: 1, name: 'Option A' },
    { id: 2, name: 'Option B' },
    { id: 3, name: 'Option C' },
  ];

  const STATUS_OPTIONS = [
    { label: 'Active', value: 'active' },
    { label: 'Prospect', value: 'prospect' },
    { label: 'Inactive', value: 'inactive' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    host.options = MOCK_OPTIONS;
    fixture.detectChanges();
    await fixture.whenStable();
    select = host.selectComponent;
  });

  describe('ControlValueAccessor', () => {
    it('should write value from ngModel to internal value', async () => {
      host.selectedValue = 2;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(select.value).toBe(2);
    });

    it('should propagate selection back to ngModel', () => {
      select.handleSelectionChange({ value: 3 });
      fixture.detectChanges();

      expect(host.selectedValue).toBe(3);
    });

    it('should update NgForm control value after selection', async () => {
      select.handleSelectionChange({ value: 2 });
      fixture.detectChanges();
      await fixture.whenStable();

      const control = host.form.controls['testField'];
      expect(control).toBeTruthy();
      expect(control.value).toBe(2);
    });

    it('should propagate null on clear', () => {
      host.selectedValue = 1;
      fixture.detectChanges();

      select.handleClear();
      fixture.detectChanges();

      expect(host.selectedValue).toBeNull();
    });

    it('should not have undefined value after writeValue(null)', () => {
      select.writeValue(null);
      expect(select.value).toBeNull();
      expect(select.value).not.toBeUndefined();
    });

    it('should normalize writeValue(undefined) to null', () => {
      select.writeValue(undefined);
      expect(select.value).toBeNull();
    });
  });

  describe('required field — NgForm integration', () => {
    beforeEach(async () => {
      host.required = true;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should mark form invalid when required and no value', () => {
      const control = host.form.controls['testField'];
      expect(control).toBeTruthy();
      expect(control.hasError('required')).toBe(true);
    });

    it('should mark form valid after selection when required', async () => {
      select.handleSelectionChange({ value: 1 });
      fixture.detectChanges();
      await fixture.whenStable();

      const control = host.form.controls['testField'];
      expect(control.value).toBe(1);
      expect(control.hasError('required')).toBe(false);
      expect(control.valid).toBe(true);
    });

    it('should propagate selection when required', () => {
      select.handleSelectionChange({ value: 1 });
      fixture.detectChanges();

      expect(host.selectedValue).toBe(1);
      expect(select.value).toBe(1);
    });

    it('should not leave value as undefined after selection when required', () => {
      select.handleSelectionChange({ value: 2 });
      fixture.detectChanges();

      expect(host.selectedValue).not.toBeUndefined();
      expect(select.value).not.toBeUndefined();
    });

    it('should update model with each new selection when required', () => {
      select.handleSelectionChange({ value: 1 });
      fixture.detectChanges();
      expect(host.selectedValue).toBe(1);

      select.handleSelectionChange({ value: 3 });
      fixture.detectChanges();
      expect(host.selectedValue).toBe(3);
    });

    it('should handle selection of value 0 (falsy but valid)', () => {
      select.handleSelectionChange({ value: 0 });
      fixture.detectChanges();

      expect(host.selectedValue).toBe(0);
      expect(select.value).toBe(0);
    });
  });

  describe('status-style options (label/value pattern)', () => {
    beforeEach(async () => {
      host.options = STATUS_OPTIONS;
      host.optionValue = 'value';
      host.required = true;
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should propagate string value from status-style options', async () => {
      select.handleSelectionChange({ value: 'prospect' });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(host.selectedValue).toBe('prospect');
      expect(select.value).toBe('prospect');

      const control = host.form.controls['testField'];
      expect(control.value).toBe('prospect');
      expect(control.valid).toBe(true);
    });

    it('should not treat empty string as null', async () => {
      select.handleSelectionChange({ value: '' });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(host.selectedValue).toBe('');
      expect(select.value).toBe('');
    });
  });

  describe('optionValue binding', () => {
    it('should pass options to filteredOptions correctly', () => {
      expect(select.filteredOptions).toEqual(MOCK_OPTIONS);
    });

    it('should work when optionValue is undefined (whole object mode)', () => {
      host.optionValue = undefined;
      fixture.detectChanges();

      const wholeOption = MOCK_OPTIONS[0];
      select.handleSelectionChange({ value: wholeOption });
      fixture.detectChanges();

      expect(host.selectedValue).toBe(wholeOption);
    });
  });

  describe('options filtering', () => {
    it('should update filteredOptions when options change', () => {
      const newOptions = [{ id: 10, name: 'New' }];
      host.options = newOptions;
      fixture.detectChanges();

      expect(select.filteredOptions).toEqual(newOptions);
    });

    it('should handle null/undefined options', () => {
      host.options = null as any;
      fixture.detectChanges();

      expect(select.filteredOptions).toEqual([]);
    });
  });
});
