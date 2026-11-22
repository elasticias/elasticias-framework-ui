import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfInputTextComponent } from './ef-input-text.component';

/**
 * A trailing action (a button drawn inside the field, after the clear) puts
 * the comptoir input in its group, so the button shares the field's border
 * and height instead of sitting beside it.
 */
@Component({
    standalone: true,
    imports: [EfInputTextComponent],
    template: `
        <ng-template #action><button type="button" data-action>A</button></ng-template>
        <ef-input-text [value]="value()" [trailingTemplate]="withAction() ? action : null" />
    `,
})
class HostComponent {
    readonly value = signal('x');
    readonly withAction = signal(true);
}

describe('EfInputTextComponent trailingTemplate', () => {
    function render(withAction = true) {
        TestBed.configureTestingModule({ imports: [HostComponent, TranslateModule.forRoot()] });
        const fixture = TestBed.createComponent(HostComponent);
        fixture.componentInstance.withAction.set(withAction);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('draws the action inside the input group, after the clear', () => {
        const host = render();
        const group = host.querySelector('.ef-input-group');
        expect(group).not.toBeNull();
        const action = group!.querySelector('[data-action]');
        expect(action).not.toBeNull();
        const clear = group!.querySelector('ef-clear-button');
        expect(clear).not.toBeNull();
        expect(clear!.compareDocumentPosition(action!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('keeps the bare input without one', () => {
        const host = render(false);
        expect(host.querySelector('.ef-input-group')).toBeNull();
        expect(host.querySelector('input.ef-input')).not.toBeNull();
    });
});
