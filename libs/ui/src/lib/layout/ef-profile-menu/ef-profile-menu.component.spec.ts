import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { EfProfileMenuComponent } from './ef-profile-menu.component';
import { EfProfileMenuItem } from './ef-profile-menu.types';

describe('EfProfileMenuComponent', () => {
  let fixture: ComponentFixture<EfProfileMenuComponent>;
  let component: EfProfileMenuComponent;
  let invoked: string[];

  function items(): EfProfileMenuItem[] {
    return [
      { id: 'profile', labelKey: 'a', icon: 'pi pi-user', command: () => invoked.push('profile') },
      {
        id: 'appearance',
        labelKey: 'b',
        icon: 'pi pi-cog',
        children: [
          { id: 'light', labelKey: 'c', command: () => invoked.push('light') },
          { id: 'dark', labelKey: 'd', command: () => invoked.push('dark') },
        ],
      },
      { id: 'logout', labelKey: 'e', severity: 'danger', groupStart: true, command: () => invoked.push('logout') },
    ];
  }

  beforeEach(async () => {
    invoked = [];
    await TestBed.configureTestingModule({
      imports: [EfProfileMenuComponent, TranslateModule.forRoot(), NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(EfProfileMenuComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', items());
    fixture.componentRef.setInput('variant', 'list');
    fixture.componentRef.setInput('name', 'Ayoub');
    fixture.componentRef.setInput('secondary', 'ayoub@example.com');
    fixture.detectChanges();
  });

  it('renders a flat list with no chip and no popover in list variant', () => {
    expect(fixture.nativeElement.querySelector('ef-profile-chip')).toBeNull();
    expect(fixture.nativeElement.querySelector('p-popover')).toBeNull();
    expect(
      fixture.nativeElement.querySelectorAll('.ef-profile-menu__item').length,
    ).toBe(3);
  });

  it('renders the chip trigger in chip variant', () => {
    fixture.componentRef.setInput('variant', 'chip');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ef-profile-chip')).not.toBeNull();
  });

  it('shows the identity header', () => {
    const head = fixture.nativeElement.querySelector('.ef-profile-menu__head');
    expect(head.textContent).toContain('Ayoub');
    expect(head.textContent).toContain('ayoub@example.com');
  });

  it('marks the item that starts a group', () => {
    const marked = fixture.nativeElement.querySelectorAll('.is-group-start');
    expect(marked.length).toBe(1);
  });

  it('runs the command and emits when a leaf is chosen', () => {
    const emitted: EfProfileMenuItem[] = [];
    component.itemSelected.subscribe((i) => emitted.push(i));

    component.select(component.items()[0]);

    expect(invoked).toEqual(['profile']);
    expect(emitted.map((i) => i.id)).toEqual(['profile']);
  });

  it('expands a parent instead of running it', () => {
    const emitted: EfProfileMenuItem[] = [];
    component.itemSelected.subscribe((i) => emitted.push(i));

    const parent = component.items()[1];
    expect(component.isExpanded('appearance')).toBe(false);

    component.select(parent);
    expect(component.isExpanded('appearance')).toBe(true);
    expect(invoked).toEqual([]);
    expect(emitted).toEqual([]);

    component.select(parent);
    expect(component.isExpanded('appearance')).toBe(false);
  });

  it('renders children only while the parent is expanded', () => {
    expect(fixture.nativeElement.querySelectorAll('.ef-profile-menu__item.is-child').length).toBe(0);

    component.select(component.items()[1]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.ef-profile-menu__item.is-child').length).toBe(2);
  });

  it('hides the popover after a leaf is chosen', () => {
    let hidden = 0;
    component.select(component.items()[0], { hide: () => hidden++ });
    expect(hidden).toBe(1);
  });

  it('leaves the popover open when a parent is expanded', () => {
    let hidden = 0;
    component.select(component.items()[1], { hide: () => hidden++ });
    expect(hidden).toBe(0);
  });
});
