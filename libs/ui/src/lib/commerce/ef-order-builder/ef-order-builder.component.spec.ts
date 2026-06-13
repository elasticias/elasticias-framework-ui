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
    expect(c.quickAddQuantity()).toBe(1);
  });

  it('does not add when readonly', () => {
    const fixture = build({ readonly: true });
    const c = fixture.componentInstance;
    c.onTypeaheadSelect({ product: PRODUCT, variant: PRODUCT.variants[0], unitPrice: 22.2 });
    expect(c.order().orderLines.length).toBe(0);
  });

  it('derives status color from metadata.color, defaulting to secondary', () => {
    const fixture = build();
    const c = fixture.componentInstance;

    expect(c.statusColor()).toBe('secondary');

    fixture.componentRef.setInput('orderStatuses', [
      { code: 'draft', label: 'Brouillon', metadata: { color: 'warn' } },
    ]);
    fixture.detectChanges();

    expect(c.statusColor()).toBe('warn');
    expect(c.statusLabel()).toBe('Brouillon');
  });

  it('groups récap items into columns', () => {
    const fixture = build();
    const c = fixture.componentInstance;

    c.onTypeaheadSelect({ product: PRODUCT, variant: PRODUCT.variants[0], unitPrice: 22.2 });

    fixture.componentRef.setInput('countGroupLabels', [
      { code: '30ML-F', label: '30ML-F', column: 2, sortOrder: 1 },
    ]);
    fixture.detectChanges();

    expect(c.recapColumns().length).toBeGreaterThan(0);
  });

  it('toggles focus mode and rail', () => {
    const fixture = build();
    const c = fixture.componentInstance;

    expect(c.focusMode()).toBe(false);
    c.toggleFocus();
    expect(c.focusMode()).toBe(true);

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
