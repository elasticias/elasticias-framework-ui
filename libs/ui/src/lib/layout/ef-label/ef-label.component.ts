import {
  booleanAttribute,
  Component,
  Input,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'ef-label',
  standalone: true,
  template: `<label [attr.for]="for" [class]="styleClass" [class.required]="required">{{ labelKey ? (labelKey | translate) : label }}</label>`,
  styles: [`:host { display: contents; }`],
  imports: [TranslateModule],
})
export class EfLabelComponent {
  /** Direct label text (not translated) */
  @Input() label?: string;
  /** Translation key — takes priority over label */
  @Input() labelKey?: string;
  /** The for attribute linking to an input id */
  @Input() for?: string;
  /** CSS classes for the label element */
  @Input() styleClass = 'form-label';
  /** Show required indicator */
  @Input({ transform: booleanAttribute }) required = false;
}
