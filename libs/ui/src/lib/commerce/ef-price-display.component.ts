import { Component, input } from '@angular/core';
import { EfCurrencyPipe } from '../pipes/ef-currency.pipe';

@Component({
  selector: 'ef-price-display',
  standalone: true,
  imports: [EfCurrencyPipe],
  template: `<span class="font-medium">{{ amount() | efCurrency }}</span>`,
})
export class EfPriceDisplayComponent {
  readonly amount = input.required<number>();
}
