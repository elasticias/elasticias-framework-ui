import { TestBed, ComponentFixture } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { TranslateModule } from '@ngx-translate/core';
import { EfOrderBuilderComponent } from './ef-order-builder.component';
import { OrderEntity, OrderEntityHelper } from './ef-order-builder.component.types';

registerLocaleData(localeFr);

const PRODUCT = {
  id: 'p1',
  displayName: 'Style Good Girl',
  variants: [{ variantId: 'v1', title: '30 ml', price: 22.2, countGroup: '30ML-F' }],
};

function makeOrder(): OrderEntity {
  return OrderEntityHelper.createEmpty('order');
}

function build(overrides?: { readonly?: boolean }): ComponentFixture<EfOrderBuilderComponent> {
  const fixture = TestBed.createComponent(EfOrderBuilderComponent);
  fixture.componentRef.setInput('order', makeOrder());
  fixture.componentRef.setInput('products', [PRODUCT]);
  fixture.componentRef.setInput('customers', [{ customerId: 'c1', companyName: 'ANDALOCY' }]);
  if (overrides?.readonly) fixture.componentRef.setInput('readonly', true);
  fixture.detectChanges();
  return fixture;
}

describe('EfOrderBuilderComponent (logic)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfOrderBuilderComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  it('adds a line from a typeahead selection using the active variant + price', () => {
    const fixture = build();
    const c = fixture.componentInstance;
    c.quickAddQuantity.set(3);
    c.onTypeaheadSelect({ product: PRODUCT, variant: PRODUCT.variants[0], unitPrice: 22.2 });
    c.addQuickProduct();

    expect(c.order().orderLines.length).toBe(1);
    const line = c.order().orderLines[0];
    expect(line.productId).toBe('p1');
    expect(line.variantId).toBe('v1');
    expect(line.quantity).toBe(3);
    expect(line.productUnitPrice).toBe(22.2);
    expect(line.countGroup).toBe('30ML-F');
  });

  it('resets quick-add quantity to 1 after adding', () => {
    const fixture = build();
    const c = fixture.componentInstance;
    c.quickAddQuantity.set(5);
    c.onTypeaheadSelect({ product: PRODUCT, variant: PRODUCT.variants[0], unitPrice: 22.2 });
    c.addQuickProduct();
    expect(c.quickAddQuantity()).toBe(1);
  });

  it('does not add when readonly', () => {
    const fixture = build({ readonly: true });
    const c = fixture.componentInstance;
    c.onTypeaheadSelect({ product: PRODUCT, variant: PRODUCT.variants[0], unitPrice: 22.2 });
    c.addQuickProduct();
    expect(c.order().orderLines.length).toBe(0);
  });

  it('groups récap items into columns', () => {
    const fixture = build();
    const c = fixture.componentInstance;

    c.onTypeaheadSelect({ product: PRODUCT, variant: PRODUCT.variants[0], unitPrice: 22.2 });
    c.addQuickProduct();

    fixture.componentRef.setInput('countGroupLabels', [
      { code: '30ML-F', label: '30ML-F', column: 2, sortOrder: 1 },
    ]);
    fixture.detectChanges();

    expect(c.recapColumns().length).toBeGreaterThan(0);
  });

  it('toggles focus mode and rail', () => {
    const fixture = build();
    const c = fixture.componentInstance;

    // Focus mode is the default collapsed view (see [class.ob-collapsed]);
    // toggleFocus() flips it off.
    expect(c.focusMode()).toBe(true);
    c.toggleFocus();
    expect(c.focusMode()).toBe(false);

    c.toggleRail(true);
    expect(c.railOpen()).toBe(true);

    c.toggleRail();
    expect(c.railOpen()).toBe(false);
  });

  it('hasAudit reflects auditEntries', () => {
    const fixture = build();
    const c = fixture.componentInstance;

    expect(c.hasAudit()).toBe(false);

    fixture.componentRef.setInput('auditEntries', [
      { operation: 'created', occurredAt: '2026-06-13T09:13:00Z' },
    ]);
    fixture.detectChanges();

    expect(c.hasAudit()).toBe(true);
  });
});

describe('EfOrderBuilderComponent (render)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfOrderBuilderComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  it('renders the builder shell with totals + FAB', () => {
    const fixture = build();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.ob-grid')).toBeTruthy();
    expect(el.querySelector('.ob-totals')).toBeTruthy();
    expect(el.querySelector('.ob-fab')).toBeTruthy();
  });

  it('hides Historique when no audit entries', () => {
    const fixture = build();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('ef-change-history')).toBeNull();
  });
});

describe('EfOrderBuilderComponent (readonly)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfOrderBuilderComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  /** Two lines added while writable, then the builder is made readonly:
   *  the state a Read-only user sees when opening an existing order. */
  function buildWithLinesThenReadonly(): ComponentFixture<EfOrderBuilderComponent> {
    const fixture = build();
    const c = fixture.componentInstance;
    for (let i = 0; i < 2; i++) {
      c.onTypeaheadSelect({ product: PRODUCT, variant: PRODUCT.variants[0], unitPrice: 22.2 });
      c.addQuickProduct();
    }
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    return fixture;
  }

  it('hides the quick-add row', () => {
    const el = build({ readonly: true }).nativeElement as HTMLElement;
    expect(el.querySelector('.qa-grid')).toBeNull();
    expect(el.querySelector('ef-product-typeahead')).toBeNull();
  });

  it('drops the remove column', () => {
    const c = buildWithLinesThenReadonly().componentInstance;
    expect(c.lineColumns().some((col) => col.id === 'remove')).toBe(false);
  });

  it('ignores remove, reorder and inline-edit calls', () => {
    const c = buildWithLinesThenReadonly().componentInstance;
    const before = c.order().orderLines.map((l) => l.id);

    c.removeOrderLine(before[0]);
    c.reorderLine({ from: 0, to: 1 });
    c.startEditCell(c.order().orderLines[0], 'qty');
    c.updateCustomer('c1');

    expect(c.order().orderLines.map((l) => l.id)).toEqual(before);
    expect(c.editingCell()).toBeNull();
    expect(c.order().customerId).not.toBe('c1');
  });

  it('renders line values as disabled buttons', () => {
    const el = buildWithLinesThenReadonly().nativeElement as HTMLElement;
    const cells = Array.from(el.querySelectorAll<HTMLButtonElement>('button.ln-val'));
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((b) => b.disabled)).toBe(true);
  });
});

describe('EfOrderBuilderComponent (delivery amount)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfOrderBuilderComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  /** One line of 2 x 25 = 50, an amount exact in binary. */
  function buildWithLine(shippingTotal?: number): ComponentFixture<EfOrderBuilderComponent> {
    const fixture = build();
    if (shippingTotal !== undefined) fixture.componentRef.setInput('shippingTotal', shippingTotal);
    const c = fixture.componentInstance;
    c.quickAddQuantity.set(2);
    c.onTypeaheadSelect({ product: PRODUCT, variant: PRODUCT.variants[0], unitPrice: 25 });
    c.addQuickProduct();
    fixture.detectChanges();
    return fixture;
  }

  it('final total includes shipping', () => {
    const c = buildWithLine(30).componentInstance;
    expect(c.finalTotal()).toBe(80);
  });

  it('shipping row hidden at 0 and shown at 30', () => {
    const fixture = buildWithLine();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ob-totals .row.shipping')).toBeNull();

    fixture.componentRef.setInput('shippingTotal', 30);
    fixture.detectChanges();
    const row = el.querySelector('.ob-totals .row.shipping');
    expect(row).toBeTruthy();
    expect(row!.querySelector('.lbl')!.textContent!.trim()).toBe('order_builder.shipping');
    expect(row!.querySelector('.v')!.textContent!.trim()).toBe('30,00');

    // Between the tax row and the grand total.
    const rows = Array.from(el.querySelectorAll('.ob-totals > .row'));
    expect(rows.indexOf(row!)).toBe(3);
    expect(rows[4].classList.contains('grand')).toBe(true);
  });

  it('calculateTotals adds shippingTotal', () => {
    const order: OrderEntity = {
      ...OrderEntityHelper.createEmpty('order'),
      orderLines: [{ id: 'l1', productId: 'p1', productUnitPrice: 25, quantity: 2 } as OrderEntity['orderLines'][number]],
      shippingTotal: 30,
    };
    expect(OrderEntityHelper.calculateTotals(order).finalTotal).toBe(80);
    expect(OrderEntityHelper.calculateTotals({ ...order, shippingTotal: undefined }).finalTotal).toBe(50);
  });

  it('exported total equals rail total with shipping', () => {
    const c = buildWithLine(30).componentInstance;
    const exported = c.exportOrder();
    expect(exported.shippingTotal).toBe(30);
    expect(exported.finalTotal).toBe(c.finalTotal());
    expect(c.order().finalTotal).toBe(c.finalTotal());
  });

  it('exports the host fee even when the bound order carries another one', () => {
    const fixture = buildWithLine(30);
    const c = fixture.componentInstance;
    c.order.set({ ...c.order(), shippingTotal: 99 });
    expect(c.exportOrder().shippingTotal).toBe(30);
    expect(c.exportOrder().finalTotal).toBe(80);
  });

  it('rounds the grand total half away from zero like the backend', () => {
    // 10.05 at 50% off is 5.025: the backend's decimal rounds it to 5.03,
    // while the binary product is 5.02499999...
    const fixture = build();
    fixture.componentRef.setInput('shippingTotal', 30);
    const c = fixture.componentInstance;
    c.onTypeaheadSelect({ product: PRODUCT, variant: PRODUCT.variants[0], unitPrice: 10.05 });
    c.addQuickProduct();
    c.order.set({
      ...c.order(),
      orderLines: c.order().orderLines.map((l) => ({ ...l, discount: 50 })),
    });
    fixture.detectChanges();
    expect(c.finalTotal()).toBe(35.03);
    expect(c.exportOrder().finalTotal).toBe(35.03);
    expect(c.order().finalTotal).toBe(35.03);
  });

  it('calculateTotals rounds a midpoint away from zero', () => {
    const order: OrderEntity = {
      ...OrderEntityHelper.createEmpty('order'),
      orderLines: [{ id: 'l1', productId: 'p1', productUnitPrice: 10.05, quantity: 1, discount: 50 } as OrderEntity['orderLines'][number]],
    };
    expect(OrderEntityHelper.calculateTotals(order).finalTotal).toBe(5.03);
    expect(OrderEntityHelper.roundMoney(1.005)).toBe(1.01);
    expect(OrderEntityHelper.roundMoney(-1.005)).toBe(-1.01);
    expect(OrderEntityHelper.roundMoney(322.49999999999994)).toBe(322.5);
  });

  it('leaves shippingTotal unset on a B2B order', () => {
    const fixture = buildWithLine();
    const c = fixture.componentInstance;
    expect('shippingTotal' in c.order()).toBe(false);
    expect('shippingTotal' in c.exportOrder()).toBe(false);
  });

  it('clamps a negative or NaN fee to 0 with a dev warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = buildWithLine(-5);
    const c = fixture.componentInstance;
    expect(c.shippingTotal()).toBe(0);
    expect(c.finalTotal()).toBe(50);
    expect(warn).toHaveBeenCalled();

    fixture.componentRef.setInput('shippingTotal', Number.NaN);
    fixture.detectChanges();
    expect(c.shippingTotal()).toBe(0);
    expect(c.exportOrder().finalTotal).toBe(50);
    expect((fixture.nativeElement as HTMLElement).querySelector('.ob-totals .row.shipping')).toBeNull();
    warn.mockRestore();
  });

  it('keeps a B2B total unchanged when no fee is passed', () => {
    const fixture = buildWithLine();
    const c = fixture.componentInstance;
    expect(c.finalTotal()).toBe(50);
    expect(c.exportOrder().finalTotal).toBe(50);
    expect(c.order().finalTotal).toBe(50);
  });
});
