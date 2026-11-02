import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfPillGroupComponent, EfPillItem } from './ef-pill-group.component';

const ITEMS: EfPillItem[] = [
  { value: 'all', labelKey: 'all' },
  { value: 'draft', labelKey: 'draft' },
];

@Component({
  standalone: true,
  imports: [EfPillGroupComponent],
  template: `<ef-pill-group [items]="items" [(value)]="status" />`,
})
class TwoWayHost {
  items = ITEMS;
  status = signal<string | null>('all');
}

@Component({
  standalone: true,
  imports: [EfPillGroupComponent],
  template: `<ef-pill-group [items]="items" (valueChange)="picked.push($event)" />`,
})
class OutputOnlyHost {
  items = ITEMS;
  picked: string[] = [];
}

function setup<T>(host: new () => T) {
  TestBed.configureTestingModule({ imports: [host, TranslateModule.forRoot()] });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const pill = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('.ef-pill')).find(
      (b) => b.textContent?.includes(label),
    ) as HTMLButtonElement;
  return { fixture, pill };
}

describe('ef-pill-group: selection', () => {
  it('writes the picked value back through [(value)]', () => {
    const { fixture, pill } = setup(TwoWayHost);
    expect(pill('all').getAttribute('aria-selected')).toBe('true');

    pill('draft').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.status()).toBe('draft');
    expect(pill('draft').getAttribute('aria-selected')).toBe('true');
  });

  it('follows a value set by the caller', () => {
    const { fixture, pill } = setup(TwoWayHost);
    fixture.componentInstance.status.set('draft');
    fixture.detectChanges();
    expect(pill('draft').getAttribute('aria-selected')).toBe('true');
  });

  it('shows the pick as selected when the caller only listens to valueChange', () => {
    const { fixture, pill } = setup(OutputOnlyHost);

    pill('draft').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.picked).toEqual(['draft']);
    expect(pill('draft').getAttribute('aria-selected')).toBe('true');
  });

  it('does not re-emit when the selected pill is clicked again', () => {
    const { fixture, pill } = setup(OutputOnlyHost);
    pill('draft').click();
    pill('draft').click();
    expect(fixture.componentInstance.picked).toEqual(['draft']);
  });
});
