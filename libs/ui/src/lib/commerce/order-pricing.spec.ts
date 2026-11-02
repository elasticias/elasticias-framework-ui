import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { TranslateModule } from '@ngx-translate/core';
import { EfOrderBuilderComponent } from './ef-order-builder/ef-order-builder.component';
import { OrderEntityHelper, OrderLineItemHelper } from './ef-order-builder/ef-order-builder.component.types';
import { EfProductCatalogueComponent } from './ef-product-catalogue/ef-product-catalogue.component';
import { EfProductTypeaheadComponent } from './ef-product-typeahead/ef-product-typeahead.component';
import { defaultUnitPrice, EfOrderPriceList } from './order-pricing';

registerLocaleData(localeFr);

// Wholesale and shop prices differ on purpose, so a spec can tell which one a line took.
const PRODUCT: Record<string, unknown> = {
  id: 'p1',
  displayName: 'Style Good Girl',
  unitPrice: 100,
  salePrice: 140,
  variants: [
    { variantId: 'v1', title: '30 ml', price: 100, salePrice: 150, compareAtPrice: 199, countGroup: '30ML-F' },
  ],
};
const VARIANT = (PRODUCT['variants'] as Record<string, unknown>[])[0];

describe('defaultUnitPrice', () => {
  it('wholesale: variant price, then product unitPrice, then product salePrice', () => {
    expect(defaultUnitPrice(PRODUCT, VARIANT, 'wholesale')).toBe(100);
    expect(defaultUnitPrice({ unitPrice: 90, salePrice: 140 }, null, 'wholesale')).toBe(90);
    expect(defaultUnitPrice({ salePrice: 140 }, null, 'wholesale')).toBe(140);
    expect(defaultUnitPrice(PRODUCT, VARIANT)).toBe(100); // default stays wholesale
  });

  it('retail: the variant shop price, never compareAtPrice', () => {
    expect(defaultUnitPrice(PRODUCT, VARIANT, 'retail')).toBe(150);
  });

  it('retail: falls back to the product shop price when the variant has none', () => {
    expect(defaultUnitPrice(PRODUCT, { variantId: 'v2', price: 100 }, 'retail')).toBe(140);
    expect(defaultUnitPrice(PRODUCT, { variantId: 'v2', price: 100, salePrice: 0 }, 'retail')).toBe(140);
    expect(defaultUnitPrice(PRODUCT, null, 'retail')).toBe(140);
  });

  it('retail: never falls back to a wholesale price, 0 when there is no shop price', () => {
    expect(defaultUnitPrice({ unitPrice: 100 }, { price: 100, compareAtPrice: 199 }, 'retail')).toBe(0);
  });
});

describe('OrderLineItemHelper.createFromProduct price list', () => {
  it('starts a line at the wholesale price by default', () => {
    expect(OrderLineItemHelper.createFromProduct(PRODUCT, 2, 'id', 'v1').productUnitPrice).toBe(100);
  });

  it('starts a line at the shop price for retail, totals included', () => {
    const line = OrderLineItemHelper.createFromProduct(PRODUCT, 2, 'id', 'v1', 'retail');
    expect(line.productUnitPrice).toBe(150);
    expect(line.grossAmount).toBe(300);
  });
});

describe('EfProductTypeaheadComponent price list', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfProductTypeaheadComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  function pick(priceList?: EfOrderPriceList) {
    const f = TestBed.createComponent(EfProductTypeaheadComponent);
    f.componentRef.setInput('products', [PRODUCT]);
    if (priceList) f.componentRef.setInput('priceList', priceList);
    f.detectChanges();
    const ta = f.componentInstance;
    ta.query.set('good');
    const row = ta.rows()[0];
    let unitPrice = -1;
    ta.productSelect.subscribe((s) => (unitPrice = s.unitPrice));
    ta.selectRow(row);
    return { shown: ta.priceOf(row), unitPrice };
  }

  it('shows and emits the wholesale price by default', () => {
    expect(pick()).toEqual({ shown: 100, unitPrice: 100 });
  });

  it('shows and emits the shop price for retail', () => {
    expect(pick('retail')).toEqual({ shown: 150, unitPrice: 150 });
  });
});

describe('EfOrderBuilderComponent price list', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfOrderBuilderComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  function build(priceList?: EfOrderPriceList): ComponentFixture<EfOrderBuilderComponent> {
    const fixture = TestBed.createComponent(EfOrderBuilderComponent);
    fixture.componentRef.setInput('order', OrderEntityHelper.createEmpty('order'));
    fixture.componentRef.setInput('products', [PRODUCT]);
    fixture.componentRef.setInput('customers', []);
    if (priceList) fixture.componentRef.setInput('priceList', priceList);
    fixture.detectChanges();
    return fixture;
  }

  /** Picks through the builder's own typeahead, so the price comes from the real chain. */
  function quickAdd(fixture: ComponentFixture<EfOrderBuilderComponent>): number {
    const ta = fixture.debugElement.query(By.directive(EfProductTypeaheadComponent))
      .componentInstance as EfProductTypeaheadComponent;
    ta.query.set('good');
    ta.selectRow(ta.rows()[0]);
    fixture.componentInstance.addQuickProduct();
    return fixture.componentInstance.order().orderLines[0].productUnitPrice;
  }

  it('quick-adds at the wholesale price by default', () => {
    const fixture = build();
    expect(fixture.componentInstance.quickAddPrice()).toBe(0);
    expect(quickAdd(fixture)).toBe(100);
  });

  it('quick-adds at the shop price when retail', () => {
    expect(quickAdd(build('retail'))).toBe(150);
  });

  it('prices catalogue lines from the same price list', () => {
    const wholesale = build();
    wholesale.componentInstance.addProductsFromCatalogue([{ product: PRODUCT, quantity: 1, variantId: 'v1' }]);
    expect(wholesale.componentInstance.order().orderLines[0].productUnitPrice).toBe(100);

    const retail = build('retail');
    retail.componentInstance.addProductsFromCatalogue([{ product: PRODUCT, quantity: 1, variantId: 'v1' }]);
    expect(retail.componentInstance.order().orderLines[0].productUnitPrice).toBe(150);
  });
});

describe('EfProductCatalogueComponent price list', () => {
  const VARIABLE = {
    id: 1,
    productCode: 'P1',
    name: 'Style',
    displayName: 'Style',
    productType: 'VARIABLE',
    unitPrice: 100,
    salePrice: 140,
    defaultVariantId: 'v1',
    variants: [{ variantId: 'v1', title: '30 ml', price: 100, salePrice: 150, compareAtPrice: 199, isActive: true }],
  };
  const SIMPLE = { id: 2, productCode: 'P2', name: 'Box', displayName: 'Box', unitPrice: 100, salePrice: 140 };
  const digits = (s: string) => s.replace(/[^\d]/g, '');

  function card(priceList?: EfOrderPriceList): EfProductCatalogueComponent {
    TestBed.configureTestingModule({ imports: [EfProductCatalogueComponent, TranslateModule.forRoot()] });
    const f = TestBed.createComponent(EfProductCatalogueComponent);
    f.componentRef.setInput('products', [VARIABLE, SIMPLE]);
    if (priceList) f.componentRef.setInput('priceList', priceList);
    f.detectChanges();
    return f.componentInstance;
  }

  it('shows the wholesale price by default, as before', () => {
    const c = card();
    expect(digits(c.formatPrice(VARIABLE))).toBe('10000');
    expect(digits(c.formatPrice(SIMPLE))).toBe('10000');
  });

  it('shows the shop price for retail: the price of the line the builder adds', () => {
    const c = card('retail');
    expect(digits(c.formatPrice(VARIABLE))).toBe('15000'); // variant salePrice, not 199 compareAt
    expect(digits(c.formatPrice(SIMPLE))).toBe('14000'); // product salePrice
    expect(digits(c.formatPrice(VARIABLE))).toBe(
      digits(String(OrderLineItemHelper.createFromProduct(VARIABLE, 1, 'id', 'v1', 'retail').productUnitPrice * 100)),
    );
  });
});
