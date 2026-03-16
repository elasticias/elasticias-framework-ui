import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BlockUIModule } from 'primeng/blockui';

@Component({
  selector: 'app-blockUI',
  standalone: true,
  templateUrl: './app-blockUI.component.html',
  styleUrls: ['./app-blockUI.component.scss'],
  imports: [CommonModule, BlockUIModule],
})
export class AppBlockUIComponent {
  @Input() isLoading: boolean = false;
  @Input() contentPanel!: any;
}
