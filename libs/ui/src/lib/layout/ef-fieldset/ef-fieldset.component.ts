import {
  booleanAttribute,
  Component,
  Input,
} from '@angular/core';
import { FieldsetModule } from 'primeng/fieldset';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'ef-fieldset',
  standalone: true,
  templateUrl: './ef-fieldset.component.html',
  imports: [FieldsetModule, TranslateModule],
})
export class EfFieldsetComponent {
  /** Direct legend text (not translated) */
  @Input() legend?: string;
  /** Translation key — takes priority over legend */
  @Input() legendKey?: string;

  @Input({ transform: booleanAttribute }) toggleable: boolean = false;
  @Input({ transform: booleanAttribute }) collapsed: boolean = false;
  @Input() styleClass?: string;
}
