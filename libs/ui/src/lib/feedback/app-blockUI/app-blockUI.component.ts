import { Component, Input } from '@angular/core';
import { BlockUIModule } from 'primeng/blockui';

@Component({
  selector: 'ef-block-ui',
  standalone: true,
  templateUrl: './app-blockUI.component.html',
  styleUrls: ['./app-blockUI.component.scss'],
  imports: [BlockUIModule],
})
export class AppBlockUIComponent {
  @Input() isLoading = false;
  @Input() contentPanel!: any;
}
