import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { EfSelectComponent } from '../../forms/ef-select/ef-select.component';
import { EfPillGroupComponent } from '../../layout/ef-pill-group/ef-pill-group.component';
import { EfRecipientDialogComponent } from './ef-recipient-dialog.component';
import {
    EfOption,
    EfRecipientContact,
    EfRecipientMatch,
    EfRecipientValue,
} from './ef-recipient-dialog.types';

function makeViewport(mobile: boolean) {
    return {
        current: signal(mobile ? 'mobile' : 'desktop'),
        isMobile: signal(mobile),
        isTablet: signal(false),
        isDesktop: signal(!mobile),
    };
}

const CITIES = [
    { id: 1, name: 'Casablanca' },
    { id: 2, name: 'Rabat' },
];

const PAYMENTS: EfOption[] = [
    { code: 'cash_on_delivery', label: 'Paiement à la livraison', description: 'En espèces au livreur' },
    { code: 'bank_transfer', label: 'Virement bancaire' },
];

const VIA: EfOption[] = [
    { code: 'phone', label: 'Téléphone' },
    { code: 'whatsapp', label: 'WhatsApp' },
];

const CLIENT_TYPES: EfOption[] = [
    { code: 'reseller', label: 'Revendeur' },
    { code: 'individual', label: 'Particulier' },
];

const SALMA: EfRecipientMatch = {
    id: 'sh-1',
    code: 'CB-000123',
    name: 'Salma Ait Ali',
    phone: '+212 6 12 34 56 78',
    email: 's•••@gmail.com',
    status: 'Active',
    phoneVerified: true,
    emailVerified: false,
    orderCount: 3,
    addresses: [
        { id: 'a-office', label: 'Bureau', recipientName: 'Salma Ait Ali', phone: '+212612345678',
          street: '45 bd Zerktouni', cityId: 1, cityName: 'Casablanca', isDefault: false },
        { id: 'a-home', label: 'Maison', recipientName: 'Salma Ait Ali', phone: '+212612345678',
          street: '12 rue des Orangers', cityId: 1, cityName: 'Casablanca', isDefault: true },
    ],
};

const GUEST: EfRecipientMatch = {
    id: 'sh-2', code: 'CB-000087', name: 'Salma A.', phone: '+212 6 •• •• •• 21', email: 'salma@gmail.com',
    status: 'Guest', phoneVerified: false, emailVerified: false, orderCount: 1, addresses: [],
};

const DISABLED: EfRecipientMatch = { ...GUEST, id: 'sh-3', code: 'CB-000099', name: 'Karim B.', status: 'Disabled' };

const WAFA: EfRecipientMatch = {
    id: 'cl-1', code: 'CL-00412', name: 'Parfumerie Al Wafa', phone: '05 22 44 55 66', email: 'contact@alwafa.ma',
    status: 'Active', phoneVerified: false, emailVerified: false, orderCount: 0, type: 'reseller',
    addresses: [{ id: 'main', recipientName: 'Parfumerie Al Wafa', phone: '05 22 44 55 66',
        street: '14 av. Mohammed V', cityId: 2, cityName: 'Rabat', isDefault: true }],
};

describe('EfRecipientDialogComponent', () => {
    async function setup(inputs: Record<string, unknown> = {}, mobile = false) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [EfRecipientDialogComponent, TranslateModule.forRoot()],
            providers: [{ provide: EfViewportService, useValue: makeViewport(mobile) }],
        }).compileComponents();
        const fixture = TestBed.createComponent(EfRecipientDialogComponent);
        const cmp = fixture.componentInstance;
        const searched: string[] = [];
        const confirmed: EfRecipientValue[] = [];
        const profiles: string[] = [];
        const fullForms: EfRecipientContact[] = [];
        cmp.search.subscribe(v => searched.push(v));
        cmp.confirm.subscribe(v => confirmed.push(v));
        cmp.openProfile.subscribe(v => profiles.push(v));
        cmp.openFullForm.subscribe(v => fullForms.push(v));

        const settle = async () => {
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
        };
        const set = async (values: Record<string, unknown>) => {
            for (const [k, v] of Object.entries(values)) fixture.componentRef.setInput(k, v);
            await settle();
        };
        await set({ cities: CITIES, paymentMethods: PAYMENTS, receivedViaOptions: VIA, ...inputs });
        await set({ visible: true });

        const root = () => document.querySelector<HTMLElement>('.es-dialog.ef-recipient-dialog');
        const $ = <T extends Element = HTMLElement>(sel: string) => root()?.querySelector<T>(sel) ?? null;
        const $$ = <T extends Element = HTMLElement>(sel: string) =>
            Array.from(root()?.querySelectorAll<T>(sel) ?? []);
        const footer = () => $$<HTMLButtonElement>('.p-dialog-footer .btn');
        const confirmBtn = () => footer()[footer().length - 1];
        const field = (name: string) =>
            $<HTMLInputElement>(`input[name="${name}"], textarea[name="${name}"]`);
        const type = async (name: string, text: string) => {
            const el = field(name)!;
            el.value = text;
            el.dispatchEvent(new Event('input'));
            await settle();
        };
        const search = async (text: string) => {
            const el = $<HTMLInputElement>('input[type="search"]')!;
            el.value = text;
            el.dispatchEvent(new Event('input'));
            await settle();
            $<HTMLButtonElement>('.ef-search-btn')!.click();
            await settle();
        };
        const select = async (name: string, value: unknown) => {
            const de = fixture.debugElement
                .queryAll(By.directive(EfSelectComponent))
                .find(d => (d.componentInstance as EfSelectComponent).name() === name);
            if (!de) throw new Error(`no ef-select named ${name}`);
            (de.componentInstance as EfSelectComponent).selectionChangeEvent.emit(value);
            await settle();
        };
        const receivedVia = async (code: string) => {
            const de = fixture.debugElement.query(By.directive(EfPillGroupComponent));
            (de.componentInstance as EfPillGroupComponent).valueChange.emit(code);
            await settle();
        };
        const choice = (value: string) => $<HTMLButtonElement>(`[role="radio"][data-value="${value}"]`);
        return {
            fixture, cmp, searched, confirmed, profiles, fullForms,
            settle, set, root, $, $$, footer, confirmBtn, field, type, search, select, receivedVia, choice,
        };
    }

    afterEach(() => document.body.querySelectorAll('.p-dialog-mask').forEach(m => m.remove()));

    it('search_emits_the_typed_identifier', async () => {
        const t = await setup();
        await t.search('  0612345678 ');
        expect(t.searched).toEqual(['0612345678']);
        expect(t.$('input[type="search"]')?.getAttribute('placeholder')).toBe('ef.recipient.search_placeholder_phone_email');
        expect(t.root()?.textContent).toContain('ef.recipient.search_hint_phone_email');
    });

    it('one_match_fills_client_and_preselects_default_address', async () => {
        const t = await setup();
        await t.search('0612345678');
        await t.set({ matches: [SALMA] });

        expect(t.$('[data-role="selected-match"]')?.textContent).toContain('Salma Ait Ali');
        expect(t.choice('a-home')?.getAttribute('aria-checked')).toBe('true');
        expect(t.choice('a-office')?.getAttribute('aria-checked')).toBe('false');
        expect(t.field('street')).toBeNull();
        // Each part of an address line is bidi-isolated, so it keeps its place in RTL.
        expect(t.choice('a-home')?.textContent).toContain('\u2068Salma Ait Ali\u2069 · \u206812 rue des Orangers\u2069');

        await t.receivedVia('whatsapp');
        expect(t.confirmBtn().disabled).toBe(false);
        t.confirmBtn().click();
        await t.settle();
        expect(t.confirmed).toEqual([
            {
                shopperId: 'sh-1',
                contact: null,
                delivery: {
                    recipientName: 'Salma Ait Ali', phone: '+212612345678', street: '12 rue des Orangers',
                    cityId: 1, note: null, addressId: 'a-home',
                },
                paymentMethod: 'cash_on_delivery',
                receivedVia: 'whatsapp',
            },
        ]);
    });

    it('lists_several_matches_and_waits_for_a_pick', async () => {
        const t = await setup();
        await t.search('salma@gmail.com');
        await t.set({ matches: [SALMA, GUEST] });

        const picks = t.$$<HTMLButtonElement>('button[data-role="pick"]');
        expect(picks.length).toBe(2);
        expect(t.$('[data-role="selected-match"]')).toBeNull();
        expect(t.choice('cash_on_delivery')).toBeNull();
        expect(t.confirmBtn().disabled).toBe(true);

        picks[1].click();
        await t.settle();
        expect(t.$('[data-role="selected-match"]')?.textContent).toContain('Salma A.');
        // A guest with no saved address goes straight to the address fields.
        expect(t.field('street')).not.toBeNull();
        expect(t.field('recipientName')?.value).toBe('Salma A.');
        // A masked phone is never copied into a delivery phone.
        expect(t.field('recipientPhone')?.value).toBe('');
    });

    it('disabled_match_cannot_be_picked', async () => {
        const t = await setup();
        await t.search('0611111111');
        await t.set({ matches: [DISABLED] });

        expect(t.$('[data-role="status"]')?.textContent).toContain('ef.recipient.status_disabled');
        expect(t.$('[data-role="selected-match"]')).toBeNull();
        expect(t.choice('cash_on_delivery')).toBeNull();
        expect(t.confirmBtn().disabled).toBe(true);

        await t.set({ matches: [SALMA, DISABLED] });
        const picks = t.$$<HTMLButtonElement>('button[data-role="pick"]');
        expect(picks[1].disabled).toBe(true);
        picks[1].click();
        await t.settle();
        expect(t.$('[data-role="selected-match"]')).toBeNull();
    });

    it('disabled_customer_cannot_be_confirmed_in_view_mode', async () => {
        const t = await setup({
            mode: 'view', viewMatch: DISABLED,
            value: { ...EXISTING, shopperId: DISABLED.id, delivery: { ...EXISTING.delivery } },
        });
        expect(t.$('[data-role="status"]')?.textContent).toContain('ef.recipient.status_disabled');
        expect(t.confirmBtn().disabled).toBe(true);
    });

    it('no_match_opens_the_contact_fields_prefilled_from_the_search', async () => {
        const t = await setup();
        await t.search('06 12 34 56 78');
        await t.set({ matches: [] });

        expect(t.root()?.textContent).toContain('ef.recipient.no_match_create');
        expect(t.field('fullName')?.value).toBe('');
        expect(t.field('phone')?.value).toBe('06 12 34 56 78');
        expect(t.field('email')?.value).toBe('');
        expect(t.field('phone')?.getAttribute('dir')).toBe('ltr');

        await t.search('salma@gmail.com');
        await t.set({ matches: [] });
        expect(t.field('phone')?.value).toBe('');
        expect(t.field('email')?.value).toBe('salma@gmail.com');
    });

    it('new_address_choice_opens_the_address_fields', async () => {
        const t = await setup();
        await t.search('0612345678');
        await t.set({ matches: [SALMA] });
        expect(t.field('street')).toBeNull();

        t.choice('new')!.click();
        await t.settle();
        expect(t.choice('new')?.getAttribute('aria-checked')).toBe('true');
        expect(t.field('street')).not.toBeNull();
        expect(t.field('recipientName')?.value).toBe('Salma Ait Ali');
        expect(t.field('recipientPhone')?.value).toBe('+212 6 12 34 56 78');
        expect(t.confirmBtn().disabled).toBe(true);
    });

    it('received_via_sits_between_the_search_and_the_new_customer_sections', async () => {
        const t = await setup();
        await t.search('nobody@example.com');
        await t.set({ matches: [] });

        const order = t.$$('ef-card').map(c => {
            if (c.querySelector('[data-role="received-via"]')) return 'via';
            if (c.querySelector('input[type="search"]')) return 'search';
            if (c.querySelector('input[name="fullName"]')) return 'new';
            return 'other';
        });
        expect(order.slice(0, 3)).toEqual(['search', 'via', 'new']);
        // The notice stays right above the form it points to, after the via card.
        const notice = t.$('.ef-recipient__notice')!;
        const via = t.$('[data-role="received-via"]')!;
        expect(via.compareDocumentPosition(notice) & 4).toBeTruthy();
    });

    it('confirm_requires_name_phone_street_city_payment_and_received_via', async () => {
        const t = await setup({ paymentMethods: [PAYMENTS[1]] });
        await t.search('nobody@example.com');
        await t.set({ matches: [] });

        const blocked = () => t.confirmBtn().disabled;
        expect(blocked()).toBe(true);
        await t.type('fullName', 'Nadia Idrissi');
        expect(blocked()).toBe(true);
        await t.type('phone', '0699887766');
        expect(blocked()).toBe(true);
        await t.type('street', '3 rue Atlas');
        expect(blocked()).toBe(true);
        await t.select('cityId', 2);
        expect(blocked()).toBe(true);
        await t.receivedVia('phone');
        // Bank transfer is offered but not preselected: payment is still missing.
        expect(blocked()).toBe(true);
        t.choice('bank_transfer')!.click();
        await t.settle();
        expect(blocked()).toBe(false);

        t.confirmBtn().click();
        await t.settle();
        expect(t.confirmed).toEqual([
            {
                shopperId: null,
                contact: { fullName: 'Nadia Idrissi', phone: '0699887766', email: 'nobody@example.com' },
                delivery: {
                    recipientName: 'Nadia Idrissi', phone: '0699887766', street: '3 rue Atlas',
                    cityId: 2, note: null, addressId: null,
                },
                paymentMethod: 'bank_transfer',
                receivedVia: 'phone',
            },
        ]);
    });

    it('cash_on_delivery_is_preselected', async () => {
        const t = await setup();
        await t.search('0612345678');
        await t.set({ matches: [SALMA] });
        expect(t.choice('cash_on_delivery')?.getAttribute('aria-checked')).toBe('true');
        expect(t.choice('bank_transfer')?.getAttribute('aria-checked')).toBe('false');
    });

    const EXISTING: EfRecipientValue = {
        shopperId: 'sh-1',
        delivery: { recipientName: 'Salma Ait Ali', phone: '+212612345678', street: '45 bd Zerktouni', cityId: 1,
            note: 'Sonner deux fois' },
        paymentMethod: 'bank_transfer',
        receivedVia: 'whatsapp',
    };

    it('view_mode_shows_details_and_no_search', async () => {
        const t = await setup({ mode: 'view', viewMatch: SALMA, value: EXISTING });
        expect(t.$('input[type="search"]')).toBeNull();
        expect(t.$('[data-role="change"]')).toBeNull();
        expect(t.$('[data-role="selected-match"]')?.textContent).toContain('Salma Ait Ali');
        // No addressId on the order: its own delivery, on "Nouvelle adresse", never a book entry.
        expect(t.choice('new')?.getAttribute('aria-checked')).toBe('true');
        expect(t.choice('a-office')?.getAttribute('aria-checked')).toBe('false');
        expect(t.field('street')?.value).toBe('45 bd Zerktouni');
        expect(t.choice('bank_transfer')?.getAttribute('aria-checked')).toBe('true');
        expect(t.field('note')?.value).toBe('Sonner deux fois');
        expect(t.footer().length).toBe(2);
        expect(t.confirmBtn().disabled).toBe(false);

        t.confirmBtn().click();
        await t.settle();
        expect(t.confirmed[0].shopperId).toBe('sh-1');
        expect(t.confirmed[0].delivery.addressId).toBeNull();
        expect(t.confirmed[0].paymentMethod).toBe('bank_transfer');
    });

    it('view_mode_with_an_address_id_starts_on_that_saved_address', async () => {
        const t = await setup({
            mode: 'view', viewMatch: SALMA,
            value: { ...EXISTING, delivery: { ...EXISTING.delivery, addressId: 'a-office' } },
        });
        expect(t.choice('a-office')?.getAttribute('aria-checked')).toBe('true');
        t.confirmBtn().click();
        await t.settle();
        expect(t.confirmed[0].delivery.addressId).toBe('a-office');
    });

    it('view_mode_valider_keeps_a_recipient_that_differs_from_the_address_book', async () => {
        // Same street and city as Salma's "Bureau", another recipient: the order's own.
        const value: EfRecipientValue = {
            ...EXISTING,
            delivery: { recipientName: 'Hassan Bennani', phone: '+212698765432', street: '45 bd Zerktouni', cityId: 1,
                note: null },
        };
        const t = await setup({ mode: 'view', viewMatch: SALMA, value });
        t.confirmBtn().click();
        await t.settle();
        expect(t.confirmed[0].delivery).toEqual({
            recipientName: 'Hassan Bennani', phone: '+212698765432', street: '45 bd Zerktouni', cityId: 1,
            note: null, addressId: null,
        });
    });

    it('reopen_then_new_address_never_sends_a_masked_phone', async () => {
        // The order's delivery phone came back masked (a reader without StoreShoppers Edit).
        const value: EfRecipientValue = {
            ...EXISTING,
            delivery: { recipientName: 'Salma Ait Ali', phone: '+212 6 •• •• •• 78', street: '7 rue Neuve', cityId: 1,
                note: null },
        };
        const t = await setup({ mode: 'view', viewMatch: SALMA, value });
        expect(t.choice('new')?.getAttribute('aria-checked')).toBe('true');
        expect(t.field('recipientPhone')?.value).toBe('');
        expect(t.confirmBtn().disabled).toBe(true);

        await t.type('recipientPhone', '0698765432');
        expect(t.confirmBtn().disabled).toBe(false);
        t.confirmBtn().click();
        await t.settle();
        expect(t.confirmed[0].delivery.phone).toBe('0698765432');
        expect(JSON.stringify(t.confirmed)).not.toContain('•');
    });

    it('reopen_on_a_saved_address_then_new_address_never_sends_a_masked_phone', async () => {
        // A picker without StoreShoppers Edit sees the saved address's phone masked; Valider sent it with its id.
        const masked: EfRecipientMatch = {
            ...SALMA,
            addresses: SALMA.addresses.map(a => ({ ...a, phone: '+212 6 •• •• •• 78' })),
        };
        const value: EfRecipientValue = {
            ...EXISTING,
            delivery: { recipientName: 'Salma Ait Ali', phone: '+212 6 •• •• •• 78', street: '12 rue des Orangers',
                cityId: 1, note: null, addressId: 'a-home' },
        };
        const t = await setup({ mode: 'view', viewMatch: masked, value });
        expect(t.choice('a-home')?.getAttribute('aria-checked')).toBe('true');

        t.choice('new')!.click();
        await t.settle();
        expect(t.field('recipientPhone')?.value).toBe('');
        expect(t.confirmBtn().disabled).toBe(true);
        t.confirmBtn().click();
        await t.settle();
        expect(JSON.stringify(t.confirmed)).not.toContain('•');
    });

    it('reopen_of_a_pick_dialog_keeps_the_order_delivery_without_address_id', async () => {
        const value: EfRecipientValue = {
            ...EXISTING,
            delivery: { recipientName: 'Hassan Bennani', phone: '+212698765432', street: '12 rue des Orangers',
                cityId: 1, note: null },
        };
        const t = await setup({ viewMatch: SALMA, value });
        expect(t.choice('new')?.getAttribute('aria-checked')).toBe('true');
        expect(t.field('recipientName')?.value).toBe('Hassan Bennani');
        await t.receivedVia('whatsapp');
        t.confirmBtn().click();
        await t.settle();
        expect(t.confirmed[0].delivery.addressId).toBeNull();
        expect(t.confirmed[0].delivery.recipientName).toBe('Hassan Bennani');
    });

    it('readonly_view_has_only_a_close_button', async () => {
        const t = await setup({ mode: 'view', readonly: true, viewMatch: SALMA, value: EXISTING });
        expect(t.footer().length).toBe(1);
        expect(t.footer()[0].textContent?.trim()).toBe('common_close');
        expect(t.$$('input, textarea, [role="radio"]').length).toBe(0);
        const text = t.root()?.textContent ?? '';
        expect(text).toContain('45 bd Zerktouni');
        expect(text).toContain('Casablanca');
        expect(text).toContain('Sonner deux fois');
        expect(text).toContain('Virement bancaire');
        expect(text).toContain('WhatsApp');
        expect(text).toContain('ef.recipient.view_locked');
        // Labels carry their own punctuation: no hard-coded " : " or " · " in the read-only text.
        expect(text).toContain('ef.recipient.note_prefix');
        expect(text).toContain('ef.recipient.received_via_prefix');
        expect(text).not.toMatch(/ : | · /);

        t.footer()[0].click();
        await t.settle();
        expect(t.cmp.visible()).toBe(false);
        expect(t.confirmed).toEqual([]);
    });

    it('is_a_full_sheet_below_768', async () => {
        const phone = await setup({}, true);
        const sheet = phone.root()!;
        expect(sheet.classList).toContain('es-dialog--full');
        expect(sheet.classList).toContain('ef-recipient-dialog--sheet');

        document.body.querySelectorAll('.p-dialog-mask').forEach(m => m.remove());
        const desk = await setup({}, false);
        expect(desk.root()!.classList).not.toContain('ef-recipient-dialog--sheet');
        expect(desk.root()!.classList).toContain('es-dialog--lg');
    });

    it('binds_server_errors_to_contact_fields', async () => {
        const t = await setup();
        await t.search('0612345678');
        await t.set({ matches: [], serverErrors: { fullName: ['Nom requis'], email: ['E-mail invalide'] } });

        expect(t.field('fullName')?.getAttribute('aria-invalid')).toBe('true');
        expect(t.field('fullName')?.closest('ef-input-text')?.textContent).toContain('Nom requis');
        expect(t.field('email')?.closest('ef-input-text')?.textContent).toContain('E-mail invalide');
        expect(t.field('phone')?.getAttribute('aria-invalid')).toBeNull();
    });

    it('client_mode_hides_payment_and_received_via_and_shows_type', async () => {
        const t = await setup({
            contactFields: 'client', clientTypes: CLIENT_TYPES,
            searchHintKey: 'ef.recipient.search_hint_client',
        });
        await t.search('Parfumerie Atlas');
        await t.set({ matches: [] });

        expect(t.root()?.textContent).toContain('ef.recipient.search_hint_client');
        expect(t.fixture.debugElement.queryAll(By.directive(EfSelectComponent))
            .some(d => (d.componentInstance as EfSelectComponent).name() === 'type')).toBe(true);
        expect(t.field('companyName')?.value).toBe('Parfumerie Atlas');
        expect(t.field('fullName')).toBeNull();
        expect(t.choice('cash_on_delivery')).toBeNull();
        expect(t.fixture.debugElement.query(By.directive(EfPillGroupComponent))).toBeNull();

        await t.select('type', 'reseller');
        await t.type('phone', '0522112233');
        await t.select('cityId', 2);
        expect(t.confirmBtn().disabled).toBe(false);

        await t.search('Wafa');
        await t.set({ matches: [WAFA] });
        const card = t.$('[data-role="selected-match"]')!;
        expect(card.querySelector('[data-role="code"]')?.textContent).toContain('CL-00412');
        expect(card.querySelector('[data-role="type"]')?.textContent).toContain('Revendeur');
        expect(t.choice('main')?.getAttribute('aria-checked')).toBe('true');
        expect(t.confirmBtn().disabled).toBe(false);
        t.confirmBtn().click();
        await t.settle();
        expect(t.confirmed.at(-1)).toMatchObject({ shopperId: 'cl-1', paymentMethod: '', receivedVia: '' });
    });

    it('client_without_code_shows_no_empty_code_chip', async () => {
        const t = await setup({ contactFields: 'client', clientTypes: CLIENT_TYPES });
        await t.search('Wafa');
        await t.set({ matches: [{ ...WAFA, code: '' }] });
        const card = t.$('[data-role="selected-match"]')!;
        expect(card.querySelector('[data-role="code"]')).toBeNull();
        expect(card.querySelector('[data-role="type"]')?.textContent).toContain('Revendeur');
    });

    it('cannot_create_shows_only_the_notice', async () => {
        const t = await setup({ canCreate: false });
        await t.search('0612345678');
        await t.set({ matches: [] });

        expect(t.root()?.textContent).toContain('ef.recipient.no_match');
        expect(t.root()?.textContent).not.toContain('ef.recipient.no_match_create');
        expect(t.field('fullName')).toBeNull();
        expect(t.field('street')).toBeNull();
        expect(t.choice('cash_on_delivery')).toBeNull();
        expect(t.confirmBtn().disabled).toBe(true);
    });

    it('full_form_link_emits_the_typed_contact', async () => {
        const t = await setup({ contactFields: 'client', clientTypes: CLIENT_TYPES });
        await t.search('Parfumerie Atlas');
        await t.set({ matches: [] });
        await t.select('type', 'reseller');
        await t.type('phone', '0522112233');
        await t.type('email', 'atlas@example.ma');

        t.$<HTMLButtonElement>('[data-role="full-form"] button')!.click();
        await t.settle();
        expect(t.fullForms).toEqual([
            {
                fullName: 'Parfumerie Atlas', companyName: 'Parfumerie Atlas', phone: '0522112233',
                email: 'atlas@example.ma', type: 'reseller',
            },
        ]);
    });

    it('ignores_a_non_string_search', async () => {
        const t = await setup();
        // A native `search` Event, or a blank term, is never a lookup.
        (t.cmp as unknown as { onSearch(v: unknown): void }).onSearch(new Event('search'));
        (t.cmp as unknown as { onSearch(v: unknown): void }).onSearch('   ');
        (t.cmp as unknown as { onSearch(v: unknown): void }).onSearch(undefined);
        await t.settle();
        expect(t.searched).toEqual([]);
    });

    /** Fills a new shopper, confirms (Valider closes the dialog), and
     *  returns what the host received. */
    async function confirmNewShopper(t: Awaited<ReturnType<typeof setup>>) {
        await t.search('0699887766');
        await t.set({ matches: [] });
        await t.type('fullName', 'Nadia Idrissi');
        await t.type('email', 'nadia@example.ma');
        await t.type('street', '3 rue Atlas');
        await t.select('cityId', 2);
        await t.type('note', 'Avant midi');
        await t.receivedVia('phone');
        t.confirmBtn().click();
        await t.settle();
        expect(t.cmp.visible()).toBe(false);
        expect(t.confirmed.length).toBe(1);
        // A [(visible)] host now holds false; setInput skips a value it
        // already passed, so tell it so before reopening.
        await t.set({ visible: false });
        return t.confirmed[0];
    }

    it('reopen_with_a_new_contact_value_restores_the_typed_fields', async () => {
        const t = await setup();
        const draft = await confirmNewShopper(t);

        // The host keeps the draft as `value` and reopens, with no new search.
        await t.set({ value: draft, matches: null });
        await t.set({ visible: true });
        expect(t.field('fullName')?.value).toBe('Nadia Idrissi');
        expect(t.field('phone')?.value).toBe('0699887766');
        expect(t.field('email')?.value).toBe('nadia@example.ma');
        expect(t.field('recipientName')?.value).toBe('Nadia Idrissi');
        expect(t.field('recipientPhone')?.value).toBe('0699887766');
        expect(t.field('street')?.value).toBe('3 rue Atlas');
        expect(t.field('note')?.value).toBe('Avant midi');
        expect(t.root()?.textContent).not.toContain('ef.recipient.no_match');
        expect(t.confirmBtn().disabled).toBe(false);

        t.confirmBtn().click();
        await t.settle();
        expect(t.confirmed[1]).toEqual(draft);
    });

    it('reopen_with_server_errors_shows_them_on_the_restored_fields', async () => {
        const t = await setup();
        const draft = await confirmNewShopper(t);

        // The order save failed: the host reopens with the draft and the errors.
        await t.set({
            value: draft,
            serverErrors: { phone: ['Téléphone invalide'], street: ['Adresse trop courte'] },
        });
        await t.set({ visible: true });

        expect(t.field('phone')?.value).toBe('0699887766');
        expect(t.field('phone')?.getAttribute('aria-invalid')).toBe('true');
        expect(t.field('phone')?.closest('ef-input-text')?.textContent).toContain('Téléphone invalide');
        expect(t.field('street')?.value).toBe('3 rue Atlas');
        expect(t.field('street')?.closest('ef-input-text')?.textContent).toContain('Adresse trop courte');
        expect(t.field('fullName')?.value).toBe('Nadia Idrissi');
    });

    it('reopen_with_a_new_client_value_restores_type_and_company', async () => {
        const t = await setup({ contactFields: 'client', clientTypes: CLIENT_TYPES });
        await t.search('Parfumerie Atlas');
        await t.set({ matches: [] });
        await t.select('type', 'reseller');
        await t.type('phone', '0522112233');
        await t.type('street', '9 bd Anfa');
        await t.select('cityId', 2);
        t.confirmBtn().click();
        await t.settle();
        const draft = t.confirmed[0];
        expect(t.cmp.visible()).toBe(false);
        await t.set({ visible: false });

        await t.set({ value: draft, matches: null });
        await t.set({ visible: true });
        expect(t.field('companyName')?.value).toBe('Parfumerie Atlas');
        expect(t.field('phone')?.value).toBe('0522112233');
        expect(t.field('street')?.value).toBe('9 bd Anfa');
        expect(t.confirmBtn().disabled).toBe(false);
        t.confirmBtn().click();
        await t.settle();
        expect(t.confirmed[1]).toEqual(draft);
    });

    it('open_profile_emits_the_match_id_when_allowed', async () => {
        const t = await setup({ canOpenProfile: true });
        await t.search('0612345678');
        await t.set({ matches: [SALMA] });
        t.$<HTMLButtonElement>('[data-role="open-profile"] button')!.click();
        await t.settle();
        expect(t.profiles).toEqual(['sh-1']);
    });
});
