import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'ef-quantity-selector',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <div class="flex items-center gap-2">
      <p-button
        [autofocus]="false"
        [buttonProps]="noAutofocus"
        icon="pi pi-minus"
        [rounded]="true"
        [text]="true"
        size="small"
        (onClick)="decrement()"
        [disabled]="quantity() <= 1"
      />
      <span class="w-8 text-center font-medium">{{ quantity() }}</span>
      <p-button
        [autofocus]="false"
        [buttonProps]="noAutofocus"
        icon="pi pi-plus"
        [rounded]="true"
        [text]="true"
        size="small"
        (onClick)="increment()"
      />
    </div>
  `,
})
export class EfQuantitySelectorComponent {

  /**
   * PrimeNG's Button reads `autofocus || buttonProps?.autofocus`, so a bare
   * `false` collapses to `undefined` and its AutoFocus directive writes the
   * attribute anyway. Passing the flag here too makes it resolve to `false`.
   */
  protected readonly noAutofocus = { autofocus: false };
  readonly quantity = input(1);
  readonly quantityChange = output<number>();

  increment(): void {
    this.quantityChange.emit(this.quantity() + 1);
  }

  decrement(): void {
    if (this.quantity() > 1) {
      this.quantityChange.emit(this.quantity() - 1);
    }
  }
}
