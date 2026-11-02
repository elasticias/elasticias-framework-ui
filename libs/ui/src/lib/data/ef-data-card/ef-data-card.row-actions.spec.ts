import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { EfDataCardComponent } from './ef-data-card.component';

type Row = { id: string; name: string; status: 'draft' | 'live' };

/**
 * `rowActionState` decides per row whether a built-in row action is shown,
 * disabled or left alone, so a screen does not let the user click Delete on
 * a live row just to answer with a toast. Unset, every row keeps every
 * action as before.
 */
describe('ef-data-card row action state', () => {
  const rows: Row[] = [
    { id: '1', name: 'Acme', status: 'draft' },
    { id: '2', name: 'Globex', status: 'live' },
  ];

  async function make(mobile: boolean, state?: (a: string, r: Row) => 'hidden' | 'disabled' | null | undefined) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [EfDataCardComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: EfViewportService,
          useValue: {
            current: signal(mobile ? 'mobile' : 'desktop'),
            isMobile: signal(mobile),
            isTablet: signal(false),
            isDesktop: signal(!mobile),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EfDataCardComponent<Row>);
    fixture.componentRef.setInput('columns', [{ id: 'name', field: 'name', header: 'Name', mobile: 'primary' }]);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('hasActionsColumn', true);
    if (state) fixture.componentRef.setInput('rowActionState', state);
    fixture.detectChanges();
    return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const ids = (items: ReadonlyArray<{ id?: string; separator?: boolean }>) =>
    items.filter((i) => !i.separator).map((i) => i.id);

  it('offers every action on every row when no state is given', async () => {
    const { cmp } = await make(false);
    expect(ids(cmp.defaultRowActions(rows[1]))).toEqual(['view', 'edit', 'duplicate', 'delete']);
  });

  it('hides an action for the rows the predicate names', async () => {
    const { cmp } = await make(false, (a, r) => (a === 'delete' && r.status !== 'draft' ? 'hidden' : null));
    expect(ids(cmp.defaultRowActions(rows[0]))).toContain('delete');
    const live = cmp.defaultRowActions(rows[1]);
    expect(ids(live)).not.toContain('delete');
    // no dangling divider once Delete is gone
    expect(live.at(-1)?.separator).toBeFalsy();
  });

  it('disables an action without removing it', async () => {
    const { cmp } = await make(false, (a, r) => (a === 'edit' && r.status === 'live' ? 'disabled' : undefined));
    const edit = cmp.defaultRowActions(rows[1]).find((i) => i.id === 'edit');
    expect(edit?.disabled).toBe(true);
    expect(cmp.defaultRowActions(rows[0]).find((i) => i.id === 'edit')?.disabled).toBeFalsy();
  });

  it('does not emit a disabled action', async () => {
    const { cmp } = await make(false, () => 'disabled');
    const fired: unknown[] = [];
    cmp.rowAction.subscribe((e) => fired.push(e));
    cmp.defaultRowActions(rows[1]).find((i) => i.id === 'edit')?.command?.();
    expect(fired.length).toBe(0);
  });

  it('applies to the phone card menu as well', async () => {
    const { el } = await make(true, (a) => (a === 'delete' ? 'hidden' : null));
    // only the rendered menus matter: open the first one
    el.querySelector<HTMLButtonElement>('.row-actions__trigger')!.click();
    expect(el.querySelector('.row-actions__item.danger')).toBeNull();
  });

  it('hides the trigger when every action of a row is hidden', async () => {
    const { el } = await make(false, (_a, r) => (r.status === 'live' ? 'hidden' : null));
    const triggers = el.querySelectorAll<HTMLButtonElement>('.row-actions__trigger');
    expect(triggers[0].disabled).toBe(false);
    expect(triggers[1].disabled).toBe(true);
  });
});
