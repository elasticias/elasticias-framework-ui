import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonGroupModule } from 'primeng/buttongroup';

@Component({
    selector: 'ef-button-group',
    standalone: true,
    template: `<p-buttonGroup><ng-content /></p-buttonGroup>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonGroupModule],
})
export class EfButtonGroupComponent {}
