import {
  booleanAttribute,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'ef-button',
  standalone: true,
  templateUrl: './ef-button.component.html',
  imports: [ButtonModule, TooltipModule, TranslateModule],
})
export class EfButtonComponent {
  /** Direct label text (not translated) */
  @Input() label?: string;
  /** Translation key — takes priority over label */
  @Input() labelKey?: string;

  @Input() icon?: string;
  @Input() severity: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast' = 'primary';
  @Input() size: 'small' | 'large' = 'small';
  @Input({ transform: booleanAttribute }) disabled: boolean = false;
  @Input({ transform: booleanAttribute }) rounded: boolean = false;
  @Input({ transform: booleanAttribute }) outlined: boolean = false;
  @Input({ transform: booleanAttribute }) raised: boolean = false;
  @Input({ transform: booleanAttribute }) text: boolean = false;
  @Input({ transform: booleanAttribute }) loading: boolean = false;
  @Input() styleClass?: string;
  @Input() type: 'button' | 'submit' = 'button';
  @Input() badge?: string;
  @Input() badgeSeverity?: 'success' | 'info' | 'warn' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast';

  /** Direct tooltip text (not translated) */
  @Input() tooltip?: string;
  /** Translation key for tooltip — takes priority over tooltip */
  @Input() tooltipKey?: string;
  @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

  @Output() onClick = new EventEmitter<Event>();

  handleClick(event: Event): void {
    this.onClick.emit(event);
  }
}
