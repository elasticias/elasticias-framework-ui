import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfProductTypeaheadComponent } from './ef-product-typeahead.component';

@Component({
  standalone: true,
  imports: [EfProductTypeaheadComponent],
  template: `<ef-product-typeahead
    [products]="products"
    productKeyField="id"
    (select)="picked = $event" />`,
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

  it('emits select for the highlighted row on Enter, then clears + closes', () => {
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
    expect(host.ta.query()).toBe('');
  });
});
