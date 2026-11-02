// A screen that edits wall time in another zone (a shop in Casablanca, an owner
// in Canada) must never see the browser's offset. Run these specs as if the
// browser sat in Toronto: Node applies a TZ change at once, so a stray UTC
// conversion (toISOString) moves the time by 4 to 5 hours and fails here.
process.env.TZ = 'America/Toronto';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfDatepickerAdvancedComponent } from './ef-datepicker-advanced.component';

/**
 * `valueFormat="local-datetime"`: the field takes and emits wall time as a
 * `yyyy-MM-ddTHH:mm` string, read and written from the date's local
 * components, never through UTC.
 */
describe('EfDatepickerAdvancedComponent valueFormat="local-datetime"', () => {
  let fixture: ComponentFixture<EfDatepickerAdvancedComponent>;
  let comp: EfDatepickerAdvancedComponent;

  const panel = () => document.body.querySelector('.dp__panel') as HTMLElement | null;
  const q = <T extends Element>(sel: string) => panel()!.querySelector(sel) as T;
  const qa = <T extends Element>(sel: string) => Array.from(panel()!.querySelectorAll(sel)) as T[];
  const triggerValue = () =>
    (fixture.nativeElement.querySelector('.dp__field-trigger .val') as HTMLElement).textContent?.trim();

  function commit(el: HTMLInputElement, value: string): void {
    el.value = value;
    el.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2));
    await TestBed.configureTestingModule({
      imports: [EfDatepickerAdvancedComponent, TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(EfDatepickerAdvancedComponent);
    comp = fixture.componentInstance;
    fixture.componentRef.setInput('mode', 'field');
    fixture.componentRef.setInput('selectionMode', 'single');
    fixture.componentRef.setInput('showTime', true);
    fixture.componentRef.setInput('valueFormat', 'local-datetime');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('runs in a zone with an offset, so a UTC slip would show', () => {
    expect(new Date(2026, 10, 15, 14, 30).getTimezoneOffset()).not.toBe(0);
  });

  it('shows a written wall-time string as is', () => {
    comp.writeValue('2026-11-15T14:30');
    fixture.detectChanges();
    expect(triggerValue()).toBe('15/11/2026 14:30');
  });

  it('emits the picked date and time as the same wall-time string', () => {
    const onChange = vi.fn();
    comp.registerOnChange(onChange);
    comp.writeValue('2026-11-15T14:30');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.dp__field-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    commit(q<HTMLInputElement>('.dp__inputs input[placeholder="HH:mm"]'), '09:05');
    q<HTMLButtonElement>('.dp__actions .btn-primary').click();
    fixture.detectChanges();

    expect(onChange).toHaveBeenCalledWith('2026-11-15T09:05');
  });

  it('round-trips midnight and the last minute of the day without moving the date', () => {
    const onChange = vi.fn();
    comp.registerOnChange(onChange);
    for (const value of ['2026-12-31T23:59', '2027-01-01T00:00']) {
      comp.writeValue(value);
      fixture.detectChanges();
      (fixture.nativeElement.querySelector('.dp__field-trigger') as HTMLButtonElement).click();
      fixture.detectChanges();
      q<HTMLButtonElement>('.dp__actions .btn-primary').click();
      fixture.detectChanges();
      expect(onChange).toHaveBeenLastCalledWith(value);
    }
  });

  it('a picked day keeps the typed time, in local components', () => {
    const onChange = vi.fn();
    comp.registerOnChange(onChange);
    (fixture.nativeElement.querySelector('.dp__field-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    comp.selectMonth(11); // December 2026
    fixture.detectChanges();
    qa<HTMLButtonElement>('.dp__cal-grid .dp__cal-day:not(.out)')
      .find((b) => b.textContent?.trim() === '24')!
      .click();
    fixture.detectChanges();
    commit(q<HTMLInputElement>('.dp__inputs input[placeholder="HH:mm"]'), '20:00');
    q<HTMLButtonElement>('.dp__actions .btn-primary').click();
    fixture.detectChanges();
    expect(onChange).toHaveBeenCalledWith('2026-12-24T20:00');
  });

  it('clearing emits null', () => {
    const onChange = vi.fn();
    comp.registerOnChange(onChange);
    comp.writeValue('2026-11-15T14:30');
    comp.clearValue();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('ignores a malformed string instead of guessing a zone', () => {
    comp.writeValue('2026-11-15T14:30:00Z');
    fixture.detectChanges();
    expect(comp.hasFieldValue()).toBe(false);
  });

  it('keeps emitting Date by default', () => {
    fixture.componentRef.setInput('valueFormat', 'date');
    fixture.detectChanges();
    const onChange = vi.fn();
    comp.registerOnChange(onChange);
    comp.writeValue(new Date(2026, 10, 15, 14, 30));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.dp__field-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    q<HTMLButtonElement>('.dp__actions .btn-primary').click();
    fixture.detectChanges();
    expect(onChange.mock.calls[0][0]).toEqual(new Date(2026, 10, 15, 14, 30));
  });
});
