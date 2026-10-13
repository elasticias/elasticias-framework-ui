import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ScreenContext } from '@elasticias/screens';
import { Permissions } from '@elasticias/types';
import { EfDataCardComponent } from '../ef-data-card/ef-data-card.component';
import { EfRowActionsComponent } from './ef-row-actions.component';

/** A duplicate is saved through create, so offering it to a user without
 *  Create only opens a form they cannot save. */
describe('row Duplicate needs Create as well as Duplicate', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EfDataCardComponent, EfRowActionsComponent, TranslateModule.forRoot()],
        }).compileComponents();
    });

    function visibleIds(grants: Permissions[]): string[] {
        const card = TestBed.createComponent(EfDataCardComponent).componentInstance;
        const items = card.defaultRowActions({ id: '1' });
        const fixture = TestBed.createComponent(EfRowActionsComponent);
        fixture.componentRef.setInput('items', items);
        fixture.componentRef.setInput(
            'context',
            new ScreenContext('SEARCH', undefined, undefined, undefined, undefined, grants),
        );
        fixture.detectChanges();
        return fixture.componentInstance
            .visibleItems()
            .filter(a => !a.separator)
            .map(a => a.id as string);
    }

    it('hides Duplicate with Read+Duplicate', () => {
        expect(visibleIds([Permissions.Read, Permissions.Duplicate])).not.toContain('duplicate');
    });

    it('shows Duplicate with Read+Duplicate+Create', () => {
        expect(
            visibleIds([Permissions.Read, Permissions.Duplicate, Permissions.Create]),
        ).toContain('duplicate');
    });

    it('still needs Duplicate: Read+Create alone does not show it', () => {
        expect(visibleIds([Permissions.Read, Permissions.Create])).not.toContain('duplicate');
    });
});
