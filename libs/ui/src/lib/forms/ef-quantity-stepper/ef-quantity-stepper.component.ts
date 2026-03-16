import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import {
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
  FormsModule,
} from '@angular/forms';
import { Nullable } from 'primeng/ts-helpers';
import { EfInputNumberComponent } from '../ef-inputnumber/ef-inputnumber.component';

/**
 * EfQuantityStepper is a specialized component for quantity selection with increment/decrement buttons.
 * Perfect for shopping carts, POS systems, and order forms where users need to adjust quantities.
 *
 * Features:
 * - Increment/decrement buttons with customizable styling
 * - Min/max value constraints
 * - Configurable step value
 * - Fully integrated with Angular Forms (ngModel, FormControl)
 * - Rounded button design optimized for touch interfaces
 *
 * @group Components
 */
@Component({
  selector: 'ef-quantity-stepper',
  templateUrl: './ef-quantity-stepper.component.html',
  styleUrls: ['./ef-quantity-stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [EfInputNumberComponent, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EfQuantityStepperComponent),
      multi: true,
    },
  ],
})
export class EfQuantityStepperComponent implements ControlValueAccessor, OnInit {
  /**
   * Current quantity value
   */
  @Input() value: Nullable<number> = 0;

  /**
   * Minimum allowed value
   */
  @Input() min: number = 0;

  /**
   * Maximum allowed value
   */
  @Input() max: number = 999;

  /**
   * Step increment/decrement value
   */
  @Input() step: number = 1;

  /**
   * When present, it specifies that the component should be disabled
   */
  @Input() disabled: boolean = false;

  /**
   * Callback to invoke when the value changes
   */
  @Output() valueChange = new EventEmitter<number>();

  /**
   * Pass Through configuration for custom styling
   */
  ptConfig = {
    root: {
      class: 'flex items-center justify-center gap-2',
    },
    pcInputText: {
      root: {
        class:
          '!w-12 !border-none !rounded-full bg-transparent font-bold text-primary dark:text-primary-contrast text-center',
      },
    },
    decrementButton: {
      class:
        '!w-9 !border-none cursor-pointer !rounded-full !bg-white px-3 py-2 font-bold !text-primary dark:!text-primary-contrast',
    },
    incrementButton: {
      class:
        '!w-9 !border-none cursor-pointer !rounded-full !bg-white px-3 py-2 font-bold !text-primary dark:!text-primary-contrast',
    },
    decrementButtonIcon: {
      innerHTML: '-',
    },
    incrementButtonIcon: {
      innerHTML: '+',
    },
  };

  // ============================================================================
  // CONTROL VALUE ACCESSOR
  // ============================================================================

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    // Component initialization logic if needed
  }

  // ============================================================================
  // CONTROL VALUE ACCESSOR IMPLEMENTATION
  // ============================================================================

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  onValueChange(value: number | null): void {
    this.value = value;
    this.onChange(value);
    this.valueChange.emit(value);
  }

  onBlur(): void {
    this.onTouched();
  }
}
