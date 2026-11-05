import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Select } from 'primeng/select';
import { EF_SELECT_FILTER_THRESHOLD, EfSelectComponent } from './ef-select.component';

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

describe('EfSelectComponent comptoir variant', () => {
  @Component({
    standalone: true,
    imports: [EfSelectComponent],
    template: `<ef-select name="s" variant="comptoir" [placeholder]="placeholder" [options]="options" optionLabel="name" optionValue="id" />`,
  })
  class ComptoirHostComponent {
    @ViewChild(EfSelectComponent) select!: EfSelectComponent;
    placeholder = '';
    options = [{ id: 1, name: 'A' }];
  }

  function render(placeholder = '') {
    TestBed.configureTestingModule({ imports: [ComptoirHostComponent, TranslateModule.forRoot()] });
    const f = TestBed.createComponent(ComptoirHostComponent);
    f.componentInstance.placeholder = placeholder;
    f.detectChanges();
    return f;
  }

  const triggerText = (f: ComponentFixture<ComptoirHostComponent>) =>
    (f.nativeElement.querySelector('.p-select-label')?.textContent ?? '').replace(/\u00a0/g, ' ').trim();

  it('renders the PrimeNG select, never a native <select>', () => {
    const f = render();
    expect(f.nativeElement.querySelector('select')).toBeNull();
    expect(f.debugElement.query(By.directive(Select))).toBeTruthy();
  });

  it('keeps the comptoir modifier and sends its panel to body', () => {
    const f = render();
    const select = f.debugElement.query(By.directive(Select)).componentInstance as Select;
    expect(f.componentInstance.select.effectiveStyleClass.split(' ')).toEqual(['es', 'es--comptoir']);
    expect(select.appendTo()).toBe('body');
  });

  it('hands PrimeNG only the real options, so the unset state has no blank row', () => {
    const f = render('Aucune');
    const select = f.debugElement.query(By.directive(Select)).componentInstance as Select;
    expect(select.options).toEqual([{ id: 1, name: 'A' }]);
  });

  it('shows the placeholder text as is, with no dashes added', () => {
    expect(triggerText(render('Aucune'))).toBe('Aucune');
  });

  it.each(['', ' ', '—', '— —', '-'])('shows nothing for the unset state when the placeholder is %j', (ph) => {
    const f = render(ph);
    expect(f.componentInstance.select.placeholderText).toBe('');
    expect(triggerText(f)).not.toMatch(/[\u2014\u2013-]/);
  });
});

describe('EfSelectComponent filter threshold', () => {
  @Component({
    standalone: true,
    imports: [EfSelectComponent],
    template: `
      @if (bound) {
        <ef-select name="s" [filter]="filter" [options]="options" optionLabel="name" optionValue="id" />
      } @else {
        <ef-select name="s" [options]="options" optionLabel="name" optionValue="id" />
      }
    `,
  })
  class FilterHostComponent {
    @ViewChild(EfSelectComponent) select!: EfSelectComponent;
    bound = false;
    filter: boolean | undefined = undefined;
    options: { id: number; name: string }[] = [];
  }

  const opts = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, name: `O${i}` }));

  function render(count: number, filter?: boolean) {
    TestBed.configureTestingModule({ imports: [FilterHostComponent, TranslateModule.forRoot()] });
    const f = TestBed.createComponent(FilterHostComponent);
    f.componentInstance.options = opts(count);
    if (filter !== undefined) {
      f.componentInstance.bound = true;
      f.componentInstance.filter = filter;
    }
    f.detectChanges();
    const prime = f.debugElement.query(By.directive(Select)).componentInstance as Select;
    return { ef: f.componentInstance.select, prime };
  }

  it(`stays off at ${EF_SELECT_FILTER_THRESHOLD} options when unset`, () => {
    const { ef, prime } = render(EF_SELECT_FILTER_THRESHOLD);
    expect(ef.effectiveFilter).toBe(false);
    expect(prime.filter).toBe(false);
  });

  it(`turns on past ${EF_SELECT_FILTER_THRESHOLD} options when unset`, () => {
    const { ef, prime } = render(EF_SELECT_FILTER_THRESHOLD + 1);
    expect(ef.effectiveFilter).toBe(true);
    expect(prime.filter).toBe(true);
  });

  it('respects an explicit false on a long list', () => {
    expect(render(EF_SELECT_FILTER_THRESHOLD + 1, false).ef.effectiveFilter).toBe(false);
  });

  it('respects an explicit true on a short list', () => {
    expect(render(2, true).ef.effectiveFilter).toBe(true);
  });

  it('treats a bound null as unset', () => {
    expect(render(EF_SELECT_FILTER_THRESHOLD + 1, null as unknown as boolean).ef.effectiveFilter).toBe(true);
  });
});

describe('EfSelectComponent selected value versus placeholder', () => {
  @Component({
    standalone: true,
    imports: [EfSelectComponent],
    template: `<ef-select name="s" variant="comptoir" [placeholder]="placeholder" [options]="options" optionLabel="name" optionValue="id" [value]="value" />`,
  })
  class ValueHostComponent {
    @ViewChild(EfSelectComponent) select!: EfSelectComponent;
    placeholder = 'Aucune';
    options: { id: string | null; name: string }[] = [];
    value: string | null | undefined = null;
  }

  async function render(options: ValueHostComponent['options'], value: ValueHostComponent['value']) {
    TestBed.configureTestingModule({ imports: [ValueHostComponent, TranslateModule.forRoot()] });
    const f = TestBed.createComponent(ValueHostComponent);
    f.componentInstance.options = options;
    f.componentInstance.value = value;
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const label = f.nativeElement.querySelector('.p-select-label') as HTMLElement;
    return { f, label, text: (label.textContent ?? '').replace(/\u00a0/g, ' ').trim() };
  }

  it('renders a selected null option as a value, even when its label equals the placeholder', async () => {
    const { label, text, f } = await render([{ id: null, name: 'Aucune' }, { id: 'p1', name: 'Promo' }], null);
    expect(text).toBe('Aucune');
    expect(label.classList).not.toContain('p-placeholder');
    expect(f.componentInstance.select.hasSelectedOption).toBe(true);
  });

  it('treats an unbound (undefined) value as null, so the null option still matches', async () => {
    const { label, text } = await render([{ id: null, name: 'Aucune' }], undefined);
    expect(text).toBe('Aucune');
    expect(label.classList).not.toContain('p-placeholder');
  });

  it("renders a selected '' option as a value", async () => {
    const { label, text } = await render([{ id: '', name: 'Aucune' }, { id: 'p1', name: 'Promo' }], '');
    expect(text).toBe('Aucune');
    expect(label.classList).not.toContain('p-placeholder');
  });

  it('keeps the placeholder style when no option matches', async () => {
    const { label, text, f } = await render([{ id: 'p1', name: 'Promo' }], null);
    expect(text).toBe('Aucune');
    expect(label.classList).toContain('p-placeholder');
    expect(f.componentInstance.select.hasSelectedOption).toBe(false);
  });

  it('renders a real option as a value', async () => {
    const { label, text } = await render([{ id: 'p1', name: 'Promo' }], 'p1');
    expect(text).toBe('Promo');
    expect(label.classList).not.toContain('p-placeholder');
  });
});
