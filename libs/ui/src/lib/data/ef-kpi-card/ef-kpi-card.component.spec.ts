import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfKpiCardComponent } from './ef-kpi-card.component';

describe('EfKpiCardComponent hint', () => {
  function render(inputs: Record<string, unknown>) {
    TestBed.configureTestingModule({ imports: [EfKpiCardComponent, TranslateModule.forRoot()] });
    const t = TestBed.inject(TranslateService);
    t.setTranslation('fr', { kpi_excl: 'dont livraison : {{amount}} MAD' });
    t.use('fr');
    const f = TestBed.createComponent(EfKpiCardComponent);
    for (const [k, v] of Object.entries({ label: 'CA', value: '10', ...inputs })) f.componentRef.setInput(k, v);
    f.detectChanges();
    return f;
  }

  it('renders the translated hint with its params under the value', () => {
    const el = render({ hintKey: 'kpi_excl', hintParams: { amount: '120,00' } }).nativeElement as HTMLElement;
    const hint = el.querySelector('.kpi-hint') as HTMLElement;
    expect(hint.textContent?.trim()).toBe('dont livraison : 120,00 MAD');
    const value = el.querySelector('.kpi-value') as HTMLElement;
    expect(value.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('re-translates when the params change', () => {
    const f = render({ hintKey: 'kpi_excl', hintParams: { amount: '1' } });
    f.componentRef.setInput('hintParams', { amount: '2' });
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('.kpi-hint')?.textContent).toContain('2 MAD');
  });

  it('renders no hint line without a key', () => {
    expect((render({}).nativeElement as HTMLElement).querySelector('.kpi-hint')).toBeNull();
  });
});
