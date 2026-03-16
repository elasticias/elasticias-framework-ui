import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'ef-quantity-selector',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <div class="flex items-center gap-2">
      <p-button
        icon="pi pi-minus"
        [rounded]="true"
        [text]="true"
        size="small"
        (onClick)="decrement()"
        [disabled]="quantity() <= 1"
      />
      <span class="w-8 text-center font-medium">{{ quantity() }}</span>
      <p-button
        icon="pi pi-plus"
        [rounded]="true"
        [text]="true"
        size="small"
        (onClick)="increment()"
      />
    </div>
  `,
})
export class QuantitySelectorComponent {
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
