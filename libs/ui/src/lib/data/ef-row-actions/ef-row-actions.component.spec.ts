import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfRowActionsComponent } from './ef-row-actions.component';
import { EfRowAction } from './ef-row-actions.types';

describe('EfRowActionsComponent — keyboard shortcuts', () => {
    let fixture: ComponentFixture<EfRowActionsComponent>;
    let component: EfRowActionsComponent;
    let view: ReturnType<typeof vi.fn>;

    function pressEnter(): void {
        document.dispatchEvent(
            new KeyboardEvent('keydown', { bubbles: true, cancelable: true, code: 'Enter', key: 'Enter' }),
        );
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EfRowActionsComponent, TranslateModule.forRoot()],
        }).compileComponents();

        fixture = TestBed.createComponent(EfRowActionsComponent);
        component = fixture.componentInstance;

        view = vi.fn();
        const items: EfRowAction[] = [
            { id: 'view', labelKey: 'common_view', command: view },
            { id: 'edit', labelKey: 'common_edit', command: vi.fn() },
        ];
        fixture.componentRef.setInput('items', items);
        fixture.detectChanges();
    });

    it('does not run the view action on Enter while the menu is closed', () => {
        pressEnter();
        expect(view).not.toHaveBeenCalled();
    });

    it('runs the view action on Enter while the menu is open, and closes it', () => {
        component.toggle(new MouseEvent('click'));
        fixture.detectChanges();
        expect(component.open()).toBe(true);

        pressEnter();

        expect(view).toHaveBeenCalledTimes(1);
        expect(component.open()).toBe(false);
    });

    it('stops reacting to Enter once the menu is closed again', () => {
        component.toggle(new MouseEvent('click'));
        component.close();
        fixture.detectChanges();

        pressEnter();

        expect(view).not.toHaveBeenCalled();
    });
});
