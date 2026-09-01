import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EfDatepickerAdvancedComponent } from './ef-datepicker-advanced.component';
import { EfDateRange } from './ef-datepicker-advanced.types';

/**
 * Specs for the advanced date picker. Every feature is asserted on the
 * **user-visible DOM** (the panel is portaled to `document.body`), not just
 * on backing signals — a signal-level pass can hide a broken template
 * branch or a stale portaled view. `new Date()` is pinned so every preset /
 * "today" computation is deterministic.
 */
const TODAY = new Date(2026, 5, 9); // Tue 9 Jun 2026

describe('EfDatepickerAdvancedComponent', () => {
  let fixture: ComponentFixture<EfDatepickerAdvancedComponent>;
  let comp: EfDatepickerAdvancedComponent;

  /* ── DOM helpers (panel lives in document.body) ── */
  const panel = () => document.body.querySelector('.dp__panel') as HTMLElement | null;
  const q = <T extends Element>(sel: string) => panel()!.querySelector(sel) as T;
  const qa = <T extends Element>(sel: string) =>
    Array.from(panel()!.querySelectorAll(sel)) as T[];

  function openPanel(): void {
    (fixture.nativeElement.querySelector('.dp__trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function openCustom(): void {
    openPanel();
    (q<HTMLButtonElement>('.dp__preset.muted')).click(); // "Personnalisé…"
    fixture.detectChanges();
  }

  /** The two calendar-header "pick" buttons in day mode: [month, year]. */
  const headerPicks = () => qa<HTMLButtonElement>('.dp__cal-title .dp__cal-pick');
  /** [prev, next] header chevrons. */
  const headerNav = () => qa<HTMLButtonElement>('.dp__cal-head .dp__cal-nav');
  const dateInputs = () => qa<HTMLInputElement>('.dp__inputs input');

  function commit(el: HTMLInputElement, value: string): void {
    el.value = value;
    el.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TODAY);

    await TestBed.configureTestingModule({
      imports: [EfDatepickerAdvancedComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(EfDatepickerAdvancedComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy(); // detaches the portaled panel so it can't leak across specs
    vi.useRealTimers();
  });

  /* ── Trigger / presets ─────────────────────────────────────────── */

  it('shows the default (last 30 days) range on the trigger', () => {
    const val = fixture.nativeElement.querySelector('.dp__trigger .val') as HTMLElement;
    // No translations registered → key echoes back.
    expect(val.textContent?.trim()).toBe('date_preset_last_30_days');
  });

  it('renders the preset list and the custom row when opened', () => {
    openPanel();
    expect(panel()).toBeTruthy();
    expect(qa('.dp__preset:not(.muted)').length).toBe(7);
    expect(q('.dp__preset.muted')).toBeTruthy();
  });

  it('emits the computed range and closes when a preset is picked', () => {
    let emitted: EfDateRange | undefined;
    comp.rangeChange.subscribe((r) => (emitted = r));

    openPanel();
    (qa<HTMLButtonElement>('.dp__preset:not(.muted)')[0]).click(); // "today"
    fixture.detectChanges();

    expect(emitted?.presetKey).toBe('today');
    expect(emitted?.start).toEqual(new Date(2026, 5, 9));
    expect(emitted?.end).toEqual(new Date(2026, 5, 9));
    expect(panel()).toBeNull(); // closed → portal removed
  });

  /* ── Year picker (headline fix) ────────────────────────────────── */

  it('opens the year picker when the year label is clicked', () => {
    openCustom();
    expect(headerPicks()[1].textContent?.trim()).toBe('2026');

    headerPicks()[1].click(); // click the year
    fixture.detectChanges();

    expect(comp.calMode()).toBe('years');
    const cells = qa<HTMLButtonElement>('.dp__cal-cells .dp__cal-cell');
    expect(cells.length).toBe(12);
    const years = cells.map((c) => c.textContent?.trim());
    expect(years).toContain('2026');
    // Current year is flagged, and the day grid is gone.
    expect(cells.find((c) => c.classList.contains('today'))?.textContent?.trim()).toBe('2026');
    expect(q('.dp__cal-grid')).toBeFalsy();
  });

  it('jumps to the chosen year and returns to the day grid', () => {
    openCustom();
    headerPicks()[1].click();
    fixture.detectChanges();

    const cell = qa<HTMLButtonElement>('.dp__cal-cell').find(
      (c) => c.textContent?.trim() === '2030',
    )!;
    cell.click();
    fixture.detectChanges();

    expect(comp.calMode()).toBe('days');
    expect(comp.visibleMonth().getFullYear()).toBe(2030);
    expect(headerPicks()[1].textContent?.trim()).toBe('2030'); // year label updated
    expect(q('.dp__cal-grid')).toBeTruthy(); // day grid back
  });

  /* ── Month picker ──────────────────────────────────────────────── */

  it('opens the month picker and jumps to the chosen month', () => {
    openCustom();
    headerPicks()[0].click(); // click the month label
    fixture.detectChanges();

    expect(comp.calMode()).toBe('months');
    const cells = qa<HTMLButtonElement>('.dp__cal-cells .dp__cal-cell');
    expect(cells.length).toBe(12);

    cells[0].click(); // January
    fixture.detectChanges();

    expect(comp.calMode()).toBe('days');
    expect(comp.visibleMonth().getMonth()).toBe(0);
  });

  /* ── Editable Du / Au inputs ───────────────────────────────────── */

  it('commits a typed start date and normalises the field', () => {
    openCustom();
    const [from] = dateInputs();

    commit(from, '15/03/2026');

    expect(comp.draftStart()).toEqual(new Date(2026, 2, 15));
    expect(from.value).toBe('15/03/2026'); // input reflects the commit
    expect(comp.visibleMonth()).toEqual(new Date(2026, 2, 1)); // calendar followed
  });

  it('zero-pads a short typed date', () => {
    openCustom();
    const [from] = dateInputs();

    commit(from, '1/1/2026');

    expect(from.value).toBe('01/01/2026');
    expect(comp.draftStart()).toEqual(new Date(2026, 0, 1));
  });

  it('reverts the field on an invalid date (31/02) without changing the draft', () => {
    openCustom();
    const [, to] = dateInputs();
    const before = comp.draftEnd();
    const canonical = to.value;

    commit(to, '31/02/2026'); // February has no 31st

    expect(comp.draftEnd()).toEqual(before);
    expect(to.value).toBe(canonical); // reverted, not left as garbage
  });

  it('swaps the range when the typed end precedes the start', () => {
    openCustom();
    const [from, to] = dateInputs();

    commit(from, '10/06/2026');
    commit(to, '01/06/2026'); // earlier than start → swap

    expect(comp.draftStart()).toEqual(new Date(2026, 5, 1));
    expect(comp.draftEnd()).toEqual(new Date(2026, 5, 10));
  });

  it('blocks non-numeric keystrokes but allows digits and slash', () => {
    openCustom();
    const [from] = dateInputs();

    const blocked = from.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', cancelable: true, bubbles: true }),
    );
    const digit = from.dispatchEvent(
      new KeyboardEvent('keydown', { key: '5', cancelable: true, bubbles: true }),
    );
    const slash = from.dispatchEvent(
      new KeyboardEvent('keydown', { key: '/', cancelable: true, bubbles: true }),
    );

    expect(blocked).toBe(false); // preventDefault() → dispatchEvent returns false
    expect(digit).toBe(true);
    expect(slash).toBe(true);
  });

  /* ── Calendar day selection ────────────────────────────────────── */

  it('builds a range band from two day clicks', () => {
    openCustom();
    // Force a known month so day labels are unambiguous.
    comp.selectYear(2026);
    comp.selectMonth(5); // June 2026
    fixture.detectChanges();

    const dayByText = (t: string) =>
      qa<HTMLButtonElement>('.dp__cal-grid .dp__cal-day:not(.out)').find(
        (b) => b.textContent?.trim() === t,
      )!;

    dayByText('10').click(); // first click → start (clears any prior end)
    fixture.detectChanges();
    dayByText('20').click(); // second click → end
    fixture.detectChanges();

    expect(comp.draftStart()).toEqual(new Date(2026, 5, 10));
    expect(comp.draftEnd()).toEqual(new Date(2026, 5, 20));
    expect(qa('.dp__cal-day.in-range').length).toBeGreaterThan(0);
    expect(q('.dp__cal-day.range-start')).toBeTruthy();
    expect(q('.dp__cal-day.range-end')).toBeTruthy();
  });

  /* ── Apply ─────────────────────────────────────────────────────── */

  it('emits a custom range on Apply and closes', () => {
    let emitted: EfDateRange | undefined;
    comp.rangeChange.subscribe((r) => (emitted = r));

    openCustom();
    const [from, to] = dateInputs();
    commit(from, '05/06/2026');
    commit(to, '12/06/2026');

    (q<HTMLButtonElement>('.dp__actions .btn-primary')).click();
    fixture.detectChanges();

    expect(emitted?.presetKey).toBe('custom');
    expect(emitted?.start).toEqual(new Date(2026, 5, 5));
    expect(emitted?.end).toEqual(new Date(2026, 5, 12));
    expect(panel()).toBeNull();
  });

  it('shows "1 day" in the duration pill for a single picked day', () => {
    openCustom();
    comp.selectMonth(5); // June 2026
    fixture.detectChanges();
    // First day click sets the start and clears the seeded end → single-day draft.
    (qa<HTMLButtonElement>('.dp__cal-grid .dp__cal-day:not(.out)').find(
      (b) => b.textContent?.trim() === '7',
    )!).click();
    fixture.detectChanges();
    expect(comp.draftEnd()).toBeNull();

    const pillNum = q<HTMLElement>('.dp__actions .duration .num');
    expect(pillNum.textContent?.trim()).toBe('1'); // not "0"
  });

  it('applies a single-day range when only a start is picked', () => {
    let emitted: EfDateRange | undefined;
    comp.rangeChange.subscribe((r) => (emitted = r));

    openCustom();
    comp.selectMonth(5); // June 2026
    fixture.detectChanges();
    (qa<HTMLButtonElement>('.dp__cal-grid .dp__cal-day:not(.out)').find(
      (b) => b.textContent?.trim() === '7',
    )!).click(); // single click → start only
    fixture.detectChanges();

    (q<HTMLButtonElement>('.dp__actions .btn-primary')).click();
    fixture.detectChanges();

    expect(emitted?.start).toEqual(new Date(2026, 5, 7));
    expect(emitted?.end).toEqual(new Date(2026, 5, 7)); // end falls back to start
  });

  /* ── Context-aware header navigation ───────────────────────────── */

  it('steps by one month in day mode', () => {
    openCustom();
    const start = comp.visibleMonth();
    headerNav()[1].click(); // next
    fixture.detectChanges();
    expect(comp.visibleMonth()).toEqual(new Date(start.getFullYear(), start.getMonth() + 1, 1));
  });

  it('steps by a year in month-picker mode', () => {
    openCustom();
    comp.selectMonth(5); // June 2026, day mode
    fixture.detectChanges();
    headerPicks()[0].click(); // open month picker
    fixture.detectChanges();

    headerNav()[1].click(); // next → +12 months
    fixture.detectChanges();
    expect(comp.visibleMonth().getFullYear()).toBe(2027);
  });

  it('steps by a 12-year page in year-picker mode', () => {
    openCustom();
    headerPicks()[1].click(); // open year picker
    fixture.detectChanges();
    const start = comp.yearWindowStart();

    headerNav()[1].click(); // next decade-ish page
    fixture.detectChanges();
    expect(comp.yearWindowStart()).toBe(start + 12);
  });

  /* ── Escape drill-out ──────────────────────────────────────────── */

  it('Escape drills out: year picker → day grid → presets → closed', () => {
    openCustom();
    headerPicks()[1].click(); // years
    fixture.detectChanges();
    expect(comp.calMode()).toBe('years');

    comp.onEscape(); // → day grid
    fixture.detectChanges();
    expect(comp.calMode()).toBe('days');
    expect(comp.view()).toBe('custom');

    comp.onEscape(); // → presets
    fixture.detectChanges();
    expect(comp.view()).toBe('presets');

    comp.onEscape(); // → closed
    fixture.detectChanges();
    expect(comp.open()).toBe(false);
  });

  /* ── Field mode (ControlValueAccessor) ─────────────────────────────
     `mode="field"` makes the picker a Comptoir form control that
     replaces the legacy p-datepicker wrapper. We assert the CVA
     round-trip: writeValue → DOM/trigger, and selection → onChange,
     for both single (Date) and range ([start, end]) value shapes. */
  describe('field mode (ControlValueAccessor)', () => {
    /** Recreate the fixture in field mode with the given selection mode. */
    function makeField(selectionMode: 'single' | 'range'): void {
      fixture.destroy(); // drop the filter-mode fixture from the outer beforeEach
      fixture = TestBed.createComponent(EfDatepickerAdvancedComponent);
      comp = fixture.componentInstance;
      fixture.componentRef.setInput('mode', 'field');
      fixture.componentRef.setInput('selectionMode', selectionMode);
      fixture.detectChanges();
    }

    const fieldTrigger = () =>
      fixture.nativeElement.querySelector('.dp__field-trigger') as HTMLButtonElement;
    const triggerValue = () =>
      (fieldTrigger().querySelector('.val') as HTMLElement).textContent?.trim();

    function openField(): void {
      fieldTrigger().click();
      fixture.detectChanges();
    }

    it('renders a field-box trigger (not the pill) in field mode', () => {
      makeField('single');
      expect(fieldTrigger()).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.dp__trigger')).toBeNull();
    });

    it('single: writeValue(Date) reflects on the trigger', () => {
      makeField('single');
      comp.writeValue(new Date(2026, 0, 15));
      fixture.detectChanges();
      expect(triggerValue()).toBe('15/01/2026');
    });

    it('single: picking a day emits a Date via onChange and closes', () => {
      makeField('single');
      const onChange = vi.fn();
      comp.registerOnChange(onChange);

      openField();
      comp.selectMonth(5); // June 2026
      fixture.detectChanges();
      (qa<HTMLButtonElement>('.dp__cal-grid .dp__cal-day:not(.out)').find(
        (b) => b.textContent?.trim() === '7',
      )!).click();
      fixture.detectChanges();

      expect(onChange).toHaveBeenCalledTimes(1);
      const emitted = onChange.mock.calls[0][0];
      expect(emitted).toBeInstanceOf(Date);
      expect(emitted).toEqual(new Date(2026, 5, 7));
      expect(panel()).toBeNull(); // committed → closed
      expect(triggerValue()).toBe('07/06/2026');
    });

    it('single: writeValue(null) clears back to the placeholder', () => {
      makeField('single');
      fixture.componentRef.setInput('placeholder', 'Choisir');
      comp.writeValue(new Date(2026, 0, 15));
      fixture.detectChanges();
      comp.writeValue(null);
      fixture.detectChanges();
      expect(comp.hasFieldValue()).toBe(false);
      expect(triggerValue()).toBe('Choisir');
    });

    it('range: writeValue([start, end]) reflects on the trigger and Du/Au inputs', () => {
      makeField('range');
      comp.writeValue([new Date(2026, 0, 1), new Date(2026, 5, 13)]);
      fixture.detectChanges();
      expect(triggerValue()).toBe('01/01/2026 — 13/06/2026');

      openField();
      const [from, to] = qa<HTMLInputElement>('.dp__inputs input');
      expect(from.value).toBe('01/01/2026');
      expect(to.value).toBe('13/06/2026');
      // Range mode keeps the Apply footer; no preset "Back" button.
      expect(q('.dp__actions .btn-primary')).toBeTruthy();
      expect(panel()!.querySelector('.dp__actions .btn-ghost')).toBeNull();
    });

    it('range: Apply emits [start, end] of Dates via onChange and closes', () => {
      makeField('range');
      const onChange = vi.fn();
      comp.registerOnChange(onChange);

      openField();
      const [from, to] = qa<HTMLInputElement>('.dp__inputs input');
      commit(from, '05/06/2026');
      commit(to, '12/06/2026');
      (q<HTMLButtonElement>('.dp__actions .btn-primary')).click();
      fixture.detectChanges();

      expect(onChange).toHaveBeenCalledTimes(1);
      const emitted = onChange.mock.calls[0][0] as [Date, Date];
      expect(Array.isArray(emitted)).toBe(true);
      expect(emitted[0]).toEqual(new Date(2026, 5, 5));
      expect(emitted[1]).toEqual(new Date(2026, 5, 12));
      expect(panel()).toBeNull();
    });

    it('range: writeValue tolerates a [start, null] partial value', () => {
      makeField('range');
      expect(() => comp.writeValue([new Date(2026, 5, 1), null as unknown as Date])).not.toThrow();
      fixture.detectChanges();
      expect(comp.fieldStart()).toEqual(new Date(2026, 5, 1));
      expect(comp.fieldEnd()).toBeNull();
      expect(triggerValue()).toBe('01/06/2026');
    });

    it('setDisabledState(true) disables the field trigger', () => {
      makeField('single');
      comp.setDisabledState(true);
      fixture.detectChanges();
      expect(comp.isDisabled()).toBe(true);
      expect(fieldTrigger().disabled).toBe(true);
    });

    it('single + showTime: writeValue reflects date and time on the trigger', () => {
      makeField('single');
      fixture.componentRef.setInput('showTime', true);
      fixture.detectChanges();
      comp.writeValue(new Date(2026, 0, 15, 14, 30));
      fixture.detectChanges();
      expect(triggerValue()).toBe('15/01/2026 14:30');
    });

    it('single + showTime: day-click waits for Apply, which emits date + time', () => {
      makeField('single');
      fixture.componentRef.setInput('showTime', true);
      fixture.detectChanges();
      const onChange = vi.fn();
      comp.registerOnChange(onChange);

      openField();
      comp.selectMonth(5); // June 2026
      fixture.detectChanges();
      (qa<HTMLButtonElement>('.dp__cal-grid .dp__cal-day:not(.out)').find(
        (b) => b.textContent?.trim() === '7',
      )!).click();
      fixture.detectChanges();

      expect(onChange).not.toHaveBeenCalled(); // time not chosen yet
      expect(panel()).toBeTruthy(); // stays open

      commit(q<HTMLInputElement>('.dp__inputs input[placeholder="HH:mm"]'), '14:30');
      (q<HTMLButtonElement>('.dp__actions .btn-primary')).click();
      fixture.detectChanges();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toEqual(new Date(2026, 5, 7, 14, 30));
      expect(panel()).toBeNull();
    });

    it('range + showTime: Apply merges per-endpoint times', () => {
      makeField('range');
      fixture.componentRef.setInput('showTime', true);
      fixture.detectChanges();
      const onChange = vi.fn();
      comp.registerOnChange(onChange);

      openField();
      const dates = qa<HTMLInputElement>('.dp__inputs input[placeholder="JJ/MM/AAAA"]');
      commit(dates[0], '05/06/2026');
      commit(dates[1], '12/06/2026');
      const times = qa<HTMLInputElement>('.dp__inputs input[placeholder="HH:mm"]');
      commit(times[0], '09:15');
      commit(times[1], '17:45');

      (q<HTMLButtonElement>('.dp__actions .btn-primary')).click();
      fixture.detectChanges();

      const [s, e] = onChange.mock.calls[0][0] as [Date, Date];
      expect(s).toEqual(new Date(2026, 5, 5, 9, 15));
      expect(e).toEqual(new Date(2026, 5, 12, 17, 45));
    });

    it('marks the control touched when the popover closes', () => {
      makeField('range');
      const onTouched = vi.fn();
      comp.registerOnTouched(onTouched);
      openField();
      comp.close();
      expect(onTouched).toHaveBeenCalled();
    });
  });
});
