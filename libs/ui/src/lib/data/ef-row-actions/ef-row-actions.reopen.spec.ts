import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfRowActionsComponent } from './ef-row-actions.component';

@Component({
    standalone: true,
    imports: [EfRowActionsComponent],
    template: `
        <ef-row-actions id="a" [items]="items" />
        <ef-row-actions id="b" [items]="items" />
    `,
})
class HostComponent {
    items = [
        { id: 'view', label: 'View', command: () => undefined },
        { id: 'edit', label: 'Edit', command: () => undefined },
    ];
}

describe('EfRowActionsComponent repeated clicks', () => {
    let fixture: ComponentFixture<HostComponent>;
    const root = () => fixture.nativeElement as HTMLElement;
    const trigger = (id: string) => root().querySelector(`#${id} .row-actions__trigger`) as HTMLElement;
    const menus = () => root().querySelectorAll('.row-actions__menu').length;
    const click = (id: string) => {
        trigger(id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HostComponent, TranslateModule.forRoot()],
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        document.body.appendChild(root());
        fixture.detectChanges();
    });

    it('toggles on every click of the same trigger', () => {
        click('a');
        expect(menus()).toBe(1);
        click('a');
        expect(menus()).toBe(0);
        click('a');
        expect(menus()).toBe(1);
        click('a');
        expect(menus()).toBe(0);
    });

    it('opens the other row on a click while one is open', () => {
        click('a');
        click('b');
        expect(root().querySelectorAll('#a .row-actions__menu').length).toBe(0);
        expect(root().querySelectorAll('#b .row-actions__menu').length).toBe(1);
        click('a');
        expect(root().querySelectorAll('#a .row-actions__menu').length).toBe(1);
        expect(root().querySelectorAll('#b .row-actions__menu').length).toBe(0);
    });

    it('reopens after the menu closed by a scroll', () => {
        click('a');
        document.dispatchEvent(new Event('scroll'));
        fixture.detectChanges();
        expect(menus()).toBe(0);
        click('a');
        expect(menus()).toBe(1);
    });
});
