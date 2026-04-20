import { Component, Input } from '@angular/core';
import { BlockUIModule } from 'primeng/blockui';

@Component({
  selector: 'ef-block-ui',
  standalone: true,
  templateUrl: './ef-block-ui.component.html',
  styleUrls: ['./ef-block-ui.component.scss'],
  imports: [BlockUIModule],
})
export class EfBlockUiComponent {
  @Input() isLoading = false;
  @Input() contentPanel!: any;
}
