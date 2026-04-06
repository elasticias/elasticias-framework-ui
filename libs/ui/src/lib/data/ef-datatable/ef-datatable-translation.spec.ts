import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EfDatatableComponent } from './ef-datatable.component';
import { EfDatatableColumn } from './ef-datatable.component.types';

@Component({
  standalone: true,
  imports: [EfDatatableComponent],
  template: `
    <ef-datatable
      [columns]="columns"
      [searchEntity]="searchEntity()"
    />
  `,
})
class TestHostComponent {
  columns: EfDatatableColumn[] = [
    { field: 'name', header: 'crm.account_name' },
    { field: 'status', header: 'crm.status' },
  ];
  searchEntity = signal({
    items: [{ name: 'Test', status: 'active' }],
    totalCount: 1,
    pagination: { pageNumber: 1, pageSize: 10 },
  });
}

describe('EfDatatable — translation', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let translate: TranslateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TestHostComponent,
        TranslateModule.forRoot(),
      ],
    }).compileComponents();

    translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('fr');
    translate.use('fr');

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should show raw keys when translations are not loaded', () => {
    const headers = fixture.nativeElement.querySelectorAll('th');
    const headerTexts = Array.from(headers).map((th: any) => th.textContent.trim());
    // Before translations load, keys are shown as-is
    expect(headerTexts).toContain('crm.account_name');
    expect(headerTexts).toContain('crm.status');
  });

  it('should show translated headers after translations load', async () => {
    translate.setTranslation('fr', {
      crm: {
        account_name: 'Nom du compte',
        status: 'Statut',
      },
    });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const headers = fixture.nativeElement.querySelectorAll('th');
    const headerTexts: string[] = Array.from(headers).map((th: any) => th.textContent.trim());

    expect(headerTexts.some(t => t.includes('Nom du compte'))).toBe(true);
    expect(headerTexts.some(t => t.includes('Statut'))).toBe(true);
    // Raw keys should no longer appear
    expect(headerTexts.some(t => t === 'crm.account_name')).toBe(false);
    expect(headerTexts.some(t => t === 'crm.status')).toBe(false);
  });

  it('should update headers when language changes', async () => {
    translate.setTranslation('fr', {
      crm: { account_name: 'Nom du compte', status: 'Statut' },
    });
    translate.setTranslation('en', {
      crm: { account_name: 'Account Name', status: 'Status' },
    });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Verify FR
    let headers = fixture.nativeElement.querySelectorAll('th');
    let texts: string[] = Array.from(headers).map((th: any) => th.textContent.trim());
    expect(texts.some(t => t.includes('Nom du compte'))).toBe(true);

    // Switch to EN
    translate.use('en');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    headers = fixture.nativeElement.querySelectorAll('th');
    texts = Array.from(headers).map((th: any) => th.textContent.trim());
    expect(texts.some(t => t.includes('Account Name'))).toBe(true);
  });
});
