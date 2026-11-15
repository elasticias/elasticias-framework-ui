import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    linkedSignal,
    model,
    output,
    signal,
    untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EfViewportService } from '@elasticias/core';
import { EfDialogAction, EfDialogComponent } from '../../layout/ef-dialog/ef-dialog.component';
import { EfCardComponent } from '../../layout/ef-card/ef-card.component';
import { EfButtonComponent } from '../../layout/ef-button/ef-button.component';
import { EfLabelComponent } from '../../layout/ef-label/ef-label.component';
import { EfSearchInputComponent } from '../../forms/ef-search-input/ef-search-input.component';
import { EfInputTextComponent } from '../../forms/ef-input-text/ef-input-text.component';
import { EfSelectComponent } from '../../forms/ef-select/ef-select.component';
import { EfTextareaComponent } from '../../forms/ef-textarea/ef-textarea.component';
import { EfSelectButtonComponent } from '../../forms/ef-selectbutton/ef-selectbutton.component';
import { EfServerErrorsDirective } from '../../forms/ef-server-errors.directive';
import { EfRecipientChoice, EfRecipientChoicesComponent } from './ef-recipient-choices.component';
import { EfRecipientMatchComponent, isPickable } from './ef-recipient-match.component';
import {
    EfOption,
    EfRecipientAddress,
    EfRecipientCity,
    EfRecipientContact,
    EfRecipientMatch,
    EfRecipientValue,
} from './ef-recipient-dialog.types';

const NEW_ADDRESS = 'new';

/** A phone as typed: digits with spaces, dots, dashes or brackets, an
 *  optional leading `+`, and at least six digits. */
function looksLikePhone(term: string): boolean {
    return /^\+?[\d\s().-]+$/.test(term) && term.replace(/\D/g, '').length >= 6;
}

function looksLikeEmail(term: string): boolean {
    return term.includes('@');
}

/** A masked value (`+212 6 •• •• •• 21`) is shown, never copied into a field. */
function unmasked(value: string | null | undefined): string {
    return value && !value.includes('•') ? value : '';
}

/**
 * The customer of an order, picked or created in one dialog: a search
 * (`ef-search-input`), the client (one match, a list to pick from, or the
 * fields of a new client), then delivery and payment, on one scroll. A
 * full-height sheet on a phone (`EfViewportService`, <= 767px) with the
 * footer fixed under the scrolling body.
 *
 * It makes no API call. The host runs the lookup on `(search)` and feeds
 * `matches` (`null` before any search, `[]` when none was found), and reads
 * the result on `(confirm)`. Valider does not save the order; the host writes
 * the value into the order it is editing.
 *
 * - `mode="pick"`: search and choose. One pickable match is chosen at once,
 *   with its default address. A `Disabled` shopper or `Inactive` client is
 *   shown but can never be picked or confirmed.
 * - `mode="view"`: the order's customer (`viewMatch`) is fixed; delivery and
 *   payment stay editable. With `readonly`, everything is text and the only
 *   action is Fermer.
 * - `contactFields="client"` (Sales): a type and a company name instead of a
 *   full name, the address on the quick-create fields, a "Fiche complète"
 *   link, and no payment nor "Reçue par".
 *
 * Server errors bind by field name through `[efServerErrors]`: `search`,
 * `fullName`, `companyName`, `type`, `phone`, `email`, `recipientName`,
 * `recipientPhone`, `street`, `cityId`, `note`. The host maps its backend
 * keys to these.
 */
@Component({
    selector: 'ef-recipient-dialog',
    standalone: true,
    imports: [
        FormsModule,
        NgTemplateOutlet,
        TranslateModule,
        EfDialogComponent,
        EfCardComponent,
        EfButtonComponent,
        EfLabelComponent,
        EfSearchInputComponent,
        EfInputTextComponent,
        EfSelectComponent,
        EfTextareaComponent,
        EfSelectButtonComponent,
        EfServerErrorsDirective,
        EfRecipientChoicesComponent,
        EfRecipientMatchComponent,
    ],
    templateUrl: './ef-recipient-dialog.component.html',
    styleUrl: './ef-recipient-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EfRecipientDialogComponent {
    private static nextId = 0;
    private readonly viewport = inject(EfViewportService);

    /* ── Inputs ─────────────────────────────────────────────── */

    readonly visible = model(false);
    readonly mode = input<'pick' | 'view'>('pick');
    readonly readonly = input(false);
    readonly value = input<EfRecipientValue | null>(null);
    /** The order's customer, shown in view mode (and kept as the choice
     *  when a pick dialog reopens before any new search). */
    readonly viewMatch = input<EfRecipientMatch | null>(null);
    /** `null` = not searched yet, `[]` = none found. */
    readonly matches = input<EfRecipientMatch[] | null>(null);
    readonly searching = input(false);
    readonly cities = input<EfRecipientCity[]>([]);
    readonly paymentMethods = input<EfOption[]>([]);
    readonly receivedViaOptions = input<EfOption[]>([]);
    readonly serverErrors = input<Record<string, string[]>>({});
    readonly canOpenProfile = input(false);

    /* Configuration, so Sales reuses the dialog (spec section 11). */
    readonly searchHintKey = input('ef.recipient.search_hint_phone_email');
    readonly showDelivery = input(true);
    readonly showPayment = input(true);
    readonly showReceivedVia = input(true);
    /** False: a search with no result shows the notice and nothing more. */
    readonly canCreate = input(true);
    readonly contactFields = input<'shopper' | 'client'>('shopper');
    readonly clientTypes = input<EfOption[]>([]);

    /* ── Outputs ────────────────────────────────────────────── */

    // The name is the host contract (spec section 9).
    // eslint-disable-next-line @angular-eslint/no-output-native
    readonly search = output<string>();
    readonly confirm = output<EfRecipientValue>();
    readonly openProfile = output<string>();
    readonly openFullForm = output<EfRecipientContact>();

    /* ── Layout ─────────────────────────────────────────────── */

    protected readonly uid = `ef-recipient-${++EfRecipientDialogComponent.nextId}`;
    protected readonly isMobile = this.viewport.isMobile;
    protected readonly dialogSize = computed(() => (this.isMobile() ? 'full' : 'lg'));
    protected readonly dialogClass = computed(() =>
        this.isMobile() ? 'ef-recipient-dialog ef-recipient-dialog--sheet' : 'ef-recipient-dialog',
    );

    protected readonly isClient = computed(() => this.contactFields() === 'client');
    protected readonly isView = computed(() => this.mode() === 'view');
    /** Everything is text: a confirmed order, or a user without Edit. */
    protected readonly isStatic = computed(() => this.readonly());
    protected readonly paymentOn = computed(() => this.showPayment() && !this.isClient());
    protected readonly receivedViaOn = computed(() => this.showReceivedVia() && !this.isClient());

    protected readonly titleKey = computed(() => {
        if (!this.isView() && !this.isStatic()) return 'ef.recipient.title_pick';
        return this.isClient() ? 'ef.recipient.title_view_client' : 'ef.recipient.title_view';
    });
    protected readonly placeholderKey = computed(() =>
        this.isClient() ? 'ef.recipient.search_placeholder_client' : 'ef.recipient.search_placeholder_phone_email',
    );

    /* ── Search and client ──────────────────────────────────── */

    /** Bumped on every open, so the linked state below starts over. */
    private readonly openCount = signal(0);
    protected readonly query = signal('');
    private readonly searchedTerm = signal('');
    /** "Changer" hides the result until the next search. */
    private readonly resultsHidden = signal(false);

    /** The result list to draw, or null when there is none to show. */
    protected readonly results = computed(() =>
        this.isView() || this.resultsHidden() ? null : this.matches(),
    );

    private readonly pickedId = linkedSignal<string | null>(() => {
        this.openCount();
        if (this.isView()) return this.viewMatch()?.id ?? null;
        const found = this.matches();
        if (found == null) {
            const current = this.viewMatch();
            return current && isPickable(current) ? current.id : null;
        }
        return found.length === 1 && isPickable(found[0]) ? found[0].id : null;
    });

    protected readonly selected = computed<EfRecipientMatch | null>(() => {
        const id = this.pickedId();
        if (!id) return null;
        const pool = this.isView() ? [this.viewMatch()] : [...(this.matches() ?? []), this.viewMatch()];
        return pool.find(m => m?.id === id) ?? null;
    });

    protected readonly showList = computed(() => !this.selected() && (this.results()?.length ?? 0) > 0);
    protected readonly noMatch = computed(() => !this.selected() && this.results()?.length === 0);
    protected readonly creating = computed(() => this.noMatch() && this.canCreate());
    private readonly recipientReady = computed(() => this.isView() || !!this.selected() || this.creating());

    /* ── New contact ────────────────────────────────────────── */

    protected readonly contactName = linkedSignal(() => {
        this.openCount();
        this.matches();
        const term = this.searchedTerm();
        return this.isClient() && term && !looksLikePhone(term) && !looksLikeEmail(term) ? term : '';
    });
    protected readonly contactPhone = linkedSignal(() => {
        this.openCount();
        this.matches();
        const term = this.searchedTerm();
        return looksLikePhone(term) ? term : '';
    });
    protected readonly contactEmail = linkedSignal(() => {
        this.openCount();
        this.matches();
        const term = this.searchedTerm();
        return looksLikeEmail(term) ? term : '';
    });
    protected readonly contactType = linkedSignal(() => {
        this.openCount();
        this.matches();
        return '';
    });

    /* ── Delivery ───────────────────────────────────────────── */

    /** The host's current delivery, when its value belongs to the client
     *  on screen; null otherwise. */
    private readonly appliedDelivery = computed<EfRecipientValue['delivery'] | null>(() => {
        const v = this.value();
        if (!v) return null;
        if (this.isView()) return v.delivery;
        const sel = this.selected();
        return sel && v.shopperId === sel.id ? v.delivery : null;
    });

    protected readonly addresses = computed<EfRecipientAddress[]>(() => {
        const list = [...(this.selected()?.addresses ?? [])];
        return list.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    });

    protected readonly addressChoice = linkedSignal<string>(() => {
        this.openCount();
        const list = this.addresses();
        if (!list.length) return NEW_ADDRESS;
        const d = this.appliedDelivery();
        if (d) {
            const hit = d.addressId
                ? list.find(a => a.id === d.addressId)
                : list.find(a => a.street === d.street && a.cityId === d.cityId);
            return hit?.id ?? NEW_ADDRESS;
        }
        return list[0].id;
    });

    protected readonly recipientName = linkedSignal(() => {
        this.openCount();
        const d = this.appliedDelivery();
        if (d) return d.recipientName;
        return this.selected()?.name ?? this.contactName();
    });
    protected readonly recipientPhone = linkedSignal(() => {
        this.openCount();
        const d = this.appliedDelivery();
        if (d) return d.phone;
        const sel = this.selected();
        return sel ? unmasked(sel.phone) : this.contactPhone();
    });
    protected readonly street = linkedSignal(() => {
        this.openCount();
        this.selected();
        return this.appliedDelivery()?.street ?? '';
    });
    protected readonly cityId = linkedSignal<number | null>(() => {
        this.openCount();
        this.selected();
        return this.appliedDelivery()?.cityId ?? null;
    });
    protected readonly note = linkedSignal(() => {
        this.openCount();
        this.selected();
        return this.appliedDelivery()?.note ?? '';
    });

    protected readonly showDeliverySection = computed(
        () => this.showDelivery() && (!!this.selected() || (this.creating() && !this.isClient())),
    );
    protected readonly showAddressFields = computed(
        () => this.showDeliverySection() && this.addressChoice() === NEW_ADDRESS,
    );

    protected readonly addressChoices = computed<EfRecipientChoice[]>(() => {
        const client = this.isClient();
        const saved = this.addresses().map<EfRecipientChoice>(a => ({
            value: a.id,
            title: a.label || (client ? null : a.recipientName),
            titleKey: a.label ? null : client ? 'ef.recipient.address_client' : null,
            badgeKey: a.isDefault && !client ? 'ef.recipient.address_default' : null,
            description: [client || !a.label ? null : a.recipientName, a.street, a.cityName]
                .filter(Boolean)
                .join(' · '),
        }));
        return [
            ...saved,
            {
                value: NEW_ADDRESS,
                titleKey: client ? 'ef.recipient.address_other' : 'ef.recipient.address_new',
                descriptionKey: client ? 'ef.recipient.address_other_hint' : 'ef.recipient.address_new_hint',
            },
        ];
    });

    /* ── Payment ────────────────────────────────────────────── */

    protected readonly paymentMethod = linkedSignal(() => {
        this.openCount();
        const current = this.value()?.paymentMethod;
        if (current) return current;
        return this.paymentMethods().some(p => p.code === 'cash_on_delivery') ? 'cash_on_delivery' : '';
    });
    protected readonly receivedVia = linkedSignal(() => {
        this.openCount();
        return this.value()?.receivedVia ?? '';
    });

    protected readonly paymentChoices = computed<EfRecipientChoice[]>(() =>
        this.paymentMethods().map(p => ({ value: p.code, title: p.label, description: p.description })),
    );
    protected readonly showPaymentSection = computed(
        () => (this.paymentOn() || this.receivedViaOn()) && this.recipientReady() && !this.noMatchOnly(),
    );
    /** No match and no right to create: the notice is all there is. */
    private readonly noMatchOnly = computed(() => this.noMatch() && !this.canCreate());

    /* ── Read-only text ─────────────────────────────────────── */

    protected readonly staticDelivery = computed(() => this.value()?.delivery ?? null);
    protected readonly staticCity = computed(() => {
        const d = this.staticDelivery();
        if (!d) return '';
        return (
            this.cities().find(c => c.id === d.cityId)?.name ??
            this.viewMatch()?.addresses.find(a => a.cityId === d.cityId)?.cityName ??
            ''
        );
    });
    protected readonly staticPayment = computed(() => this.labelOf(this.paymentMethods(), this.value()?.paymentMethod));
    protected readonly staticReceivedVia = computed(() =>
        this.labelOf(this.receivedViaOptions(), this.value()?.receivedVia),
    );

    /* ── Validity and footer ────────────────────────────────── */

    protected readonly canConfirm = computed(() => {
        if (!this.recipientReady()) return false;
        const sel = this.selected();
        // Disabled or Inactive: shown, never confirmed, in any mode (spec 12.2).
        if (sel && !isPickable(sel)) return false;
        const has = (s: string | null | undefined) => !!s && !!s.trim();

        if (this.creating()) {
            const contactOk = this.isClient()
                ? has(this.contactType()) && has(this.contactName()) && has(this.contactPhone()) && this.cityId() != null
                : has(this.contactName()) && has(this.contactPhone());
            if (!contactOk) return false;
        }
        if (this.showAddressFields()) {
            const ok =
                has(this.recipientName()) && has(this.recipientPhone()) && has(this.street()) && this.cityId() != null;
            if (!ok) return false;
        }
        if (this.paymentOn() && !this.paymentMethod()) return false;
        if (this.receivedViaOn() && !this.receivedVia()) return false;
        return true;
    });

    protected readonly actions = computed<EfDialogAction[]>(() =>
        this.isStatic()
            ? [{ labelKey: 'common_close', severity: 'primary' }]
            : [
                  { labelKey: 'common_cancel', severity: 'ghost' },
                  {
                      labelKey: 'ef.recipient.confirm',
                      severity: 'primary',
                      disabled: !this.canConfirm(),
                      command: () => this.confirm.emit(this.buildValue()),
                  },
              ],
    );

    constructor() {
        effect(() => {
            if (!this.visible()) return;
            untracked(() => {
                this.query.set('');
                this.searchedTerm.set('');
                this.resultsHidden.set(false);
                this.openCount.update(n => n + 1);
            });
        });
    }

    /* ── Handlers ───────────────────────────────────────────── */

    onSearch(term: string): void {
        this.searchedTerm.set(term);
        this.resultsHidden.set(false);
        this.search.emit(term);
    }

    pick(match: EfRecipientMatch): void {
        if (!isPickable(match)) return;
        this.pickedId.set(match.id);
    }

    change(): void {
        this.pickedId.set(null);
        this.resultsHidden.set(true);
    }

    onOpenProfile(): void {
        const id = this.selected()?.id;
        if (id) this.openProfile.emit(id);
    }

    onOpenFullForm(): void {
        this.openFullForm.emit(this.contact());
    }

    onVisibleChange(visible: boolean): void {
        this.visible.set(visible);
    }

    protected isPickable(m: EfRecipientMatch): boolean {
        return isPickable(m);
    }

    protected fieldId(name: string): string {
        return `${this.uid}-${name}`;
    }

    /* ── Value ──────────────────────────────────────────────── */

    private contact(): EfRecipientContact {
        const name = this.contactName().trim();
        const email = this.contactEmail().trim() || null;
        const phone = this.contactPhone().trim();
        return this.isClient()
            ? { fullName: name, companyName: name, phone, email, type: this.contactType() || null }
            : { fullName: name, phone, email };
    }

    private buildValue(): EfRecipientValue {
        const sel = this.selected();
        const creating = this.creating();
        const note = this.note().trim() || null;
        const savedAddress = this.addresses().find(a => a.id === this.addressChoice());

        let delivery: EfRecipientValue['delivery'];
        if (savedAddress) {
            delivery = {
                recipientName: savedAddress.recipientName,
                phone: savedAddress.phone ?? '',
                street: savedAddress.street,
                cityId: savedAddress.cityId,
                note,
                addressId: savedAddress.id,
            };
        } else if (creating && this.isClient()) {
            const c = this.contact();
            delivery = {
                recipientName: c.fullName,
                phone: c.phone,
                street: this.street().trim(),
                cityId: this.cityId() ?? 0,
                note,
                addressId: null,
            };
        } else {
            delivery = {
                recipientName: this.recipientName().trim(),
                phone: this.recipientPhone().trim(),
                street: this.street().trim(),
                cityId: this.cityId() ?? 0,
                note,
                addressId: null,
            };
        }

        return {
            shopperId: this.isView() ? (this.viewMatch()?.id ?? this.value()?.shopperId ?? null) : (sel?.id ?? null),
            contact: creating ? this.contact() : null,
            delivery,
            paymentMethod: this.paymentOn() ? this.paymentMethod() : (this.value()?.paymentMethod ?? ''),
            receivedVia: this.receivedViaOn() ? this.receivedVia() : (this.value()?.receivedVia ?? ''),
        };
    }

    private labelOf(options: EfOption[], code: string | null | undefined): string {
        if (!code) return '';
        return options.find(o => o.code === code)?.label ?? code;
    }
}
