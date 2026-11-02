import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfTabsComponent } from './ef-tabs.component';

/**
 * The tablist needs an accessible name in the reader's language, so
 * `ariaLabelKey` is translated like the other `ef-*` keys; the raw
 * `ariaLabel` stays for callers that already pass a translated string.
 */
function render(inputs: Record<string, unknown>) {
  TestBed.configureTestingModule({ imports: [EfTabsComponent, TranslateModule.forRoot()] });
  const translate = TestBed.inject(TranslateService);
  translate.setTranslation('fr', { 'product.tabs': 'Sections du produit' });
  translate.use('fr');
  const fixture = TestBed.createComponent(EfTabsComponent);
  fixture.componentRef.setInput('items', [
    { value: 'general', labelKey: 'general' },
    { value: 'prices', labelKey: 'prices' },
  ]);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).querySelector('[role="tablist"]') as HTMLElement;
}

describe('ef-tabs: tablist aria-label', () => {
  it('translates ariaLabelKey', () => {
    expect(render({ ariaLabelKey: 'product.tabs' }).getAttribute('aria-label')).toBe('Sections du produit');
  });

  it('prefers ariaLabelKey over ariaLabel', () => {
    expect(render({ ariaLabelKey: 'product.tabs', ariaLabel: 'raw' }).getAttribute('aria-label')).toBe('Sections du produit');
  });

  it('falls back to ariaLabel when no key is given', () => {
    expect(render({ ariaLabel: 'Sections' }).getAttribute('aria-label')).toBe('Sections');
  });
});
