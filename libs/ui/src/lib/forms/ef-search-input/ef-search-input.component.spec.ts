import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TranslateModule } from '@ngx-translate/core';
import { EfSearchInputComponent } from './ef-search-input.component';

@Component({
  standalone: true,
  imports: [EfSearchInputComponent],
  template: `
    <div [attr.dir]="pageDir">
      <ef-search-input
        [(value)]="value"
        [loading]="loading()"
        [dir]="fieldDir"
        [clearable]="clearable"
        (search)="emitted.push($event)"
      />
    </div>
  `,
})
class HostComponent {
  value = signal('');
  loading = signal(false);
  pageDir: 'ltr' | 'rtl' = 'ltr';
  fieldDir: 'ltr' | 'auto' = 'auto';
  clearable = false;
  emitted: string[] = [];
}

describe('EfSearchInputComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const input = (): HTMLInputElement => fixture.nativeElement.querySelector('input');
  const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');

  const type = async (text: string) => {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('emits_trimmed_value_on_enter', async () => {
    await type('  0612345678  ');
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(host.emitted).toEqual(['0612345678']);
    expect(host.value()).toBe('  0612345678  ');
  });

  it('emits_on_button_click', async () => {
    await type(' ali ');
    button().click();
    expect(host.emitted).toEqual(['ali']);
  });

  it('does_not_emit_when_empty_or_blank', async () => {
    button().click();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await type('   ');
    button().click();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(host.emitted).toEqual([]);
  });

  it('enter_during_ime_composition_is_not_a_search', async () => {
    await type('سلمى');
    const composing = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true });
    input().dispatchEvent(composing);
    expect(host.emitted).toEqual([]);
    // The IME keeps its Enter: it commits the composed text.
    expect(composing.defaultPrevented).toBe(false);
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(host.emitted).toEqual(['سلمى']);
  });

  it('hides_the_native_webkit_clear_control', () => {
    const scss = readFileSync(resolve(__dirname, 'ef-search-input.component.scss'), 'utf8');
    expect(scss).toMatch(/::-webkit-search-cancel-button[^{]*{[^}]*appearance:\s*none/);
  });

  it('clearable_shows_a_clear_button_that_empties_the_field_without_a_search', async () => {
    const clear = () => fixture.nativeElement.querySelector('ef-clear-button button') as HTMLButtonElement | null;
    expect(clear()).toBeNull();
    await type('0612');
    // Off by default: no clear even with a value.
    expect(clear()).toBeNull();

    host.clearable = true;
    fixture.componentRef.changeDetectorRef.detectChanges();
    fixture.detectChanges();
    expect(clear()).not.toBeNull();
    expect(clear()!.getAttribute('aria-label')).toBe('action.clear');
    clear()!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.value()).toBe('');
    expect(input().value).toBe('');
    expect(host.emitted).toEqual([]);
    // Nothing to clear: the button goes.
    expect(clear()).toBeNull();
  });

  it('native_search_event_does_not_reach_the_host', () => {
    // An <input type="search"> fires a native bubbling `search` event on Enter
    // and on its clear control (Chromium, WebKit). It must never reach a
    // `(search)` listener as if it were the output.
    input().dispatchEvent(new Event('search', { bubbles: true }));
    expect(host.emitted).toEqual([]);
  });

  it('disables_button_and_shows_spinner_while_loading', async () => {
    expect(button().disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.ef-search-spinner')).toBeNull();
    host.loading.set(true);
    fixture.detectChanges();
    expect(button().disabled).toBe(true);
    expect(button().getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('.ef-search-spinner')).not.toBeNull();
    await type('ali');
    button().click();
    expect(host.emitted).toEqual([]);
  });

  it('puts_the_button_on_the_leading_edge_in_rtl', () => {
    // jsdom lays nothing out: the button is the input's next sibling inside a
    // flex row, so the page direction mirrors it, and only logical
    // properties may draw its border and radius.
    const group = fixture.nativeElement.querySelector('.ef-input-group') as HTMLElement;
    expect(group.children[0]).toBe(input());
    expect(group.children[1]).toBe(button());
    const scss = readFileSync(resolve(__dirname, 'ef-search-input.component.scss'), 'utf8');
    expect(scss).toContain('border-inline-start');
    expect(scss).not.toMatch(/border-(left|right)|margin-(left|right)|padding-(left|right)|\b(left|right)\s*:/);
  });

  it('button_is_48px_on_touch', () => {
    // --hit-field is 40px, and 48px (--hit-touch) on a coarse pointer, see
    // touch-tier.contract.spec; the group and the button both size from it.
    const group = fixture.nativeElement.querySelector('.ef-input-group') as HTMLElement;
    expect(group).not.toBeNull();
    expect(button().classList.contains('ef-search-btn')).toBe(true);
    const scss = readFileSync(resolve(__dirname, 'ef-search-input.component.scss'), 'utf8');
    expect(scss).toMatch(/\.ef-search-btn\s*{[^}]*inline-size:\s*var\(--hit-field\)/);
  });

  it('applies the field direction to the native input only', () => {
    host.fieldDir = 'ltr';
    fixture.componentRef.changeDetectorRef.detectChanges();
    fixture.detectChanges();
    expect(input().getAttribute('dir')).toBe('ltr');
  });
});
