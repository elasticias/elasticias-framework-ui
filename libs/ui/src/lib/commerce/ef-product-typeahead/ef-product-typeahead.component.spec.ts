import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfProductTypeaheadComponent } from './ef-product-typeahead.component';
import { ProductTypeaheadSelection } from './ef-product-typeahead.component.types';

@Component({
  standalone: true,
  imports: [EfProductTypeaheadComponent],
  template: `<ef-product-typeahead
    [products]="products"
    productKeyField="id"
    (productSelect)="picked = $event" />`,
})
class HostComponent {
  @ViewChild(EfProductTypeaheadComponent) ta!: EfProductTypeaheadComponent;
  products: Record<string, unknown>[] = [
    {
      id: 'p1',
      displayName: 'Style Good Girl',
      reference: '021',
      variants: [
        { variantId: 'v1', title: '30 ml', price: 22.2, isActive: true },
        { variantId: 'v2', title: '50 ml', price: 34, isActive: true },
      ],
    },
    {
      id: 'p2',
      displayName: 'Bleu de Chanel',
      reference: '100',
      variants: [{ variantId: 'v3', title: '50 ml', price: 40, isActive: true }],
    },
  ];
  picked: unknown = null;
}

describe('EfProductTypeaheadComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('returns no rows for queries shorter than 2 chars', () => {
    host.ta.query.set('g');
    expect(host.ta.rows().length).toBe(0);
  });

  it('filters products by normalized display name', () => {
    host.ta.query.set('good');
    const rows = host.ta.rows();
    expect(rows.length).toBe(1);
    expect(rows[0].label).toBe('Style Good Girl');
  });

  it('builds highlight segments around the match', () => {
    const segs = host.ta.buildSegments('Style Good Girl', 'good');
    expect(segs).toEqual([
      { text: 'Style ', mark: false },
      { text: 'Good', mark: true },
      { text: ' Girl', mark: false },
    ]);
  });

  it('clamps the highlight to row bounds', () => {
    host.ta.query.set('good'); // exactly 1 matching row
    host.ta.highlightedIndex.set(0);
    host.ta.moveHighlight(1);
    expect(host.ta.highlightedIndex()).toBe(0);
    host.ta.moveHighlight(-1);
    expect(host.ta.highlightedIndex()).toBe(0);
  });

  it('emits select on Enter, keeps the picked label visible, closes the menu', () => {
    host.ta.query.set('good');
    host.ta.open.set(true);
    host.ta.highlightedIndex.set(0);
    host.ta.selectHighlighted();
    expect(host.picked).toEqual({
      product: host.products[0],
      variant: host.products[0]['variants']![0],
      unitPrice: 22.2,
    });
    expect(host.ta.open()).toBe(false);
    // The field retains the picked product (fill-then-add flow); it is not cleared.
    expect(host.ta.query()).toBe('Style Good Girl');
  });

  it('reset() clears the field after the consumer adds the line', () => {
    host.ta.query.set('good');
    host.ta.selectHighlighted();
    expect(host.ta.query()).toBe('Style Good Girl');
    host.ta.reset();
    expect(host.ta.query()).toBe('');
    expect(host.ta.open()).toBe(false);
  });

  it('selecting a variant chip changes the active variant, price, and payload', () => {
    host.ta.query.set('good');
    const row = host.ta.rows()[0];
    expect(host.ta.priceOf(row)).toBe(22.2); // default variant 0 (30 ml)

    host.ta.setActiveVariant(row, 1); // 50 ml
    const row2 = host.ta.rows()[0];
    expect(host.ta.priceOf(row2)).toBe(34);

    host.ta.selectRow(row2);
    expect(host.picked).toEqual({
      product: host.products[0],
      variant: host.products[0]['variants']![1],
      unitPrice: 34,
    });
  });

  it('renders variant chips by default (showVariants=true)', () => {
    const f = TestBed.createComponent(EfProductTypeaheadComponent);
    f.componentRef.setInput('products', host.products);
    f.componentRef.setInput('productKeyField', 'id');
    f.componentRef.setInput('locale', 'en-US'); // registered in the test env
    f.componentInstance.query.set('good');
    f.componentInstance.open.set(true);
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.qa-chip').length).toBe(2);
  });

  it('expands one row per variant when [showVariants]="false" (V1 mode)', () => {
    const f = TestBed.createComponent(EfProductTypeaheadComponent);
    f.componentRef.setInput('products', host.products);
    f.componentRef.setInput('productKeyField', 'id');
    f.componentRef.setInput('locale', 'en-US'); // registered in the test env
    f.componentRef.setInput('showVariants', false);
    const ta = f.componentInstance;
    ta.query.set('good');
    ta.open.set(true);
    f.detectChanges();

    // No chips — each variant is its own row instead.
    expect(f.nativeElement.querySelectorAll('.qa-chip').length).toBe(0);

    const rows = ta.rows();
    expect(rows.length).toBe(2); // Good Girl × {30 ml, 50 ml}
    expect(rows.map((r) => r.label)).toEqual([
      'Style Good Girl - 30 ml',
      'Style Good Girl - 50 ml',
    ]);
    // Each row carries its own variant + price.
    expect(ta.priceOf(rows[0])).toBe(22.2);
    expect(ta.priceOf(rows[1])).toBe(34);

    // Selecting the 50 ml row emits that variant + its price.
    let picked: ProductTypeaheadSelection | null = null;
    ta.productSelect.subscribe((p) => (picked = p));
    ta.selectRow(rows[1]);
    expect(picked!.variant).toEqual(host.products[0]['variants']![1]);
    expect(picked!.unitPrice).toBe(34);
  });

  it('falls back to product unitPrice when a product has no variants', () => {
    // Create the component directly to avoid NG0100 from host re-binding in zoneless Vitest
    const f = TestBed.createComponent(EfProductTypeaheadComponent);
    f.componentRef.setInput('products', [
      { id: 'p3', displayName: 'Sac Cadeau', unitPrice: 5, variants: [] },
    ]);
    f.componentRef.setInput('productKeyField', 'id');
    f.detectChanges();
    const ta = f.componentInstance;
    ta.query.set('sac');
    const row = ta.rows()[0];
    expect(ta.variantOf(row)).toBeNull();
    expect(ta.priceOf(row)).toBe(5);
  });
});
