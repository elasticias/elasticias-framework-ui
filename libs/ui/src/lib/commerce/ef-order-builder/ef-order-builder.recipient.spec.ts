import { TestBed, ComponentFixture } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { TranslateModule } from '@ngx-translate/core';
import { EfOrderBuilderComponent } from './ef-order-builder.component';
import { EfOrderRecipient, OrderEntityHelper } from './ef-order-builder.component.types';

registerLocaleData(localeFr);

const RECIPIENT: EfOrderRecipient = {
  name: 'Sara Alaoui',
  phone: '0612345678',
  city: 'Casablanca',
  address: '12 rue des Orangers',
};

function build(inputs: Record<string, unknown> = {}): ComponentFixture<EfOrderBuilderComponent> {
  const fixture = TestBed.createComponent(EfOrderBuilderComponent);
  fixture.componentRef.setInput('order', OrderEntityHelper.createEmpty('order'));
  fixture.componentRef.setInput('products', []);
  fixture.componentRef.setInput('customers', [{ customerId: 'c1', companyName: 'ANDALOCY' }]);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture;
}

const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;

describe('ef-order-builder Destinataire row', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfOrderBuilderComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  it('defaults_render_exactly_as_today', () => {
    const f = build({ recipient: RECIPIENT });
    const root = el(f);
    const row = root.querySelector('.ob-recipient') as HTMLElement;
    expect(row.tagName).toBe('DIV');
    expect(row.getAttribute('role')).toBe('group');
    expect(row.querySelector('.ob-recipient-name')?.textContent?.trim()).toBe('Sara Alaoui');
    expect(row.querySelector('a.ob-recipient-phone')?.getAttribute('href')?.startsWith('tel:')).toBe(true);
    expect(row.querySelector('.ob-recipient-city')?.textContent?.trim()).toBe('Casablanca');
    expect(row.querySelector('.ob-recipient-address')?.textContent?.trim()).toBe('12 rue des Orangers');
    expect(row.querySelector('button')).toBeNull();
    expect(root.querySelector('button.ob-recipient')).toBeNull();
  });

  it('interactive_row_is_a_button_and_emits_click', () => {
    const f = build({ recipient: RECIPIENT, recipientInteractive: true });
    const clicks: unknown[] = [];
    f.componentInstance.recipientClick.subscribe(() => clicks.push(1));
    const btn = el(f).querySelector('button.ob-recipient') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.type).toBe('button');
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.querySelector('.ob-recipient-chevron')).not.toBeNull();
    btn.click();
    expect(clicks.length).toBe(1);
  });

  it('interactive_row_label_defaults_to_recipient_and_takes_a_key', () => {
    const f = build({ recipient: RECIPIENT, recipientInteractive: true });
    const label = () => el(f).querySelector('button.ob-recipient')?.parentElement?.querySelector('ef-label');
    expect(label()?.textContent?.trim()).toBe('order_builder.recipient');
    f.componentRef.setInput('recipientLabelKey', 'sales_orders_client_label');
    f.detectChanges();
    expect(label()?.textContent?.trim()).toBe('sales_orders_client_label');
  });

  it('interactive_row_has_no_nested_link', () => {
    const f = build({ recipient: RECIPIENT, recipientInteractive: true });
    const btn = el(f).querySelector('button.ob-recipient') as HTMLElement;
    expect(btn.querySelector('a')).toBeNull();
    expect(btn.querySelector('.ob-recipient-phone')?.textContent?.trim()).toBe('0612345678');
  });

  it('placeholder_row_replaces_the_customer_select_when_no_recipient', () => {
    const f = build({ recipientInteractive: true, recipientPlaceholderKey: 'store_orders_choose_customer' });
    const root = el(f);
    expect(root.querySelector('ef-select')).toBeNull();
    const btn = root.querySelector('button.ob-recipient') as HTMLElement;
    expect(btn.classList.contains('empty')).toBe(true);
    expect(btn.textContent).toContain('store_orders_choose_customer');
  });

  it('hides_the_address_when_asked', () => {
    const f = build({ recipient: RECIPIENT, recipientInteractive: true, recipientShowAddress: false });
    expect(el(f).querySelector('.ob-recipient-address')).toBeNull();
    const g = build({ recipient: RECIPIENT, recipientShowAddress: false });
    expect(el(g).querySelector('.ob-recipient-address')).toBeNull();
  });

  it('empty_interactive_row_is_invalid_with_recipient_required', () => {
    const f = build({ recipientInteractive: true });
    const c = f.componentInstance;
    expect(c.validationResult().isValid).toBe(false);
    expect(c.validationResult().errors['customerId']).toEqual(['order_builder.recipient_required']);
    f.componentRef.setInput('recipient', RECIPIENT);
    f.detectChanges();
    expect(c.validationResult().errors['customerId']).toBeUndefined();
  });

  it('readonly_builder_still_emits_click', () => {
    const f = build({ recipient: RECIPIENT, recipientInteractive: true, readonly: true });
    let n = 0;
    f.componentInstance.recipientClick.subscribe(() => n++);
    (el(f).querySelector('button.ob-recipient') as HTMLButtonElement).click();
    expect(n).toBe(1);
  });
});
