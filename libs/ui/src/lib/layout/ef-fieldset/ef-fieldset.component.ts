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
  styleUrl: './ef-fieldset.component.scss',
  host: {
    '[class.ef-fieldset--plain]': "variant === 'plain'",
  },
})
export class EfFieldsetComponent {
  /** Direct legend text (not translated) */
  @Input() legend?: string;
  /** Translation key — takes priority over legend */
  @Input() legendKey?: string;

  /**
   * `framed` (default) is the bordered PrimeNG fieldset. `plain` drops the
   * frame and padding and sets the legend as a section heading: use it inside
   * an `ef-card`, so fields keep their full width at 390px. It stays a real
   * fieldset/legend, and it is never toggleable.
   */
  @Input() variant: 'framed' | 'plain' = 'framed';

  @Input({ transform: booleanAttribute }) toggleable = false;
  @Input({ transform: booleanAttribute }) collapsed = false;
  @Input() styleClass?: string;
}
