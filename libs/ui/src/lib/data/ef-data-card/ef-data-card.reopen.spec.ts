import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { EfDataCardComponent } from './ef-data-card.component';

describe('ef-data-card row menus', () => {
  it('opens the next row menu in the same click that closes the open one', async () => {
    await TestBed.configureTestingModule({
      imports: [EfDataCardComponent, TranslateModule.forRoot()],
      providers: [{ provide: EfViewportService, useValue: { current: signal('desktop'), isMobile: signal(false), isTablet: signal(false), isDesktop: signal(true) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(EfDataCardComponent<any>);
    fixture.componentRef.setInput('columns', [{ id: 'name', field: 'name', header: 'Name' }]);
    fixture.componentRef.setInput('rows', [{ id: '1', name: 'A' }, { id: '2', name: 'B' }]);
    fixture.componentRef.setInput('hasActionsColumn', true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    const trig = () => Array.from(el.querySelectorAll<HTMLElement>('.row-actions__trigger'));
    const open = () => Array.from(el.querySelectorAll('ef-row-actions')).map(e => !!e.querySelector('.row-actions__menu'));
    expect(trig().length).toBe(2);
    trig()[0].click(); fixture.detectChanges();
    expect(open()).toEqual([true, false]);
    trig()[1].click(); fixture.detectChanges();
    await new Promise(r => setTimeout(r, 50)); fixture.detectChanges();
    expect(open()).toEqual([false, true]);
  });
});
