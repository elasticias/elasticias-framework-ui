import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfMultiSelectComponent } from './ef-multi-select.component';
import { EfSelectComponent } from '../ef-select/ef-select.component';

@Component({
  standalone: true,
  imports: [FormsModule, EfMultiSelectComponent],
  template: `<ef-multi-select name="roles" [options]="[]" [variant]="variant()" />`,
})
class MultiHost {
  variant = signal<'primeng' | 'comptoir'>('primeng');
}

@Component({
  standalone: true,
  imports: [FormsModule, EfMultiSelectComponent, EfSelectComponent],
  template: `
    <ef-select name="a" [options]="[]" variant="comptoir" />
    <ef-multi-select name="b" [options]="[]" variant="comptoir" />
  `,
})
class RowHost {}

const root = (host: HTMLElement) => host.querySelector('p-multiselect')!;

describe('EfMultiSelectComponent variant', () => {
  it('leaves the PrimeNG skin alone by default', () => {
    const fixture = TestBed.configureTestingModule({ imports: [MultiHost, TranslateModule.forRoot()] }).createComponent(MultiHost);
    fixture.detectChanges();
    expect(root(fixture.nativeElement).classList).not.toContain('es');
    expect(root(fixture.nativeElement).classList).not.toContain('es--comptoir');
  });

  it('takes the comptoir skin and returns to default when the variant changes back', () => {
    const fixture = TestBed.configureTestingModule({ imports: [MultiHost, TranslateModule.forRoot()] }).createComponent(MultiHost);
    fixture.componentInstance.variant.set('comptoir');
    fixture.detectChanges();
    expect(root(fixture.nativeElement).classList).toContain('es');
    expect(root(fixture.nativeElement).classList).toContain('es--comptoir');
    fixture.componentInstance.variant.set('primeng');
    fixture.detectChanges();
    expect(root(fixture.nativeElement).classList).not.toContain('es--comptoir');
  });

  it('carries the same style hooks as a comptoir ef-select, so one row aligns', () => {
    const fixture = TestBed.configureTestingModule({ imports: [RowHost, TranslateModule.forRoot()] }).createComponent(RowHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const select = host.querySelector('p-select')!;
    for (const c of ['es', 'es--comptoir']) {
      expect(select.classList).toContain(c);
      expect(root(host).classList).toContain(c);
    }
  });
});
