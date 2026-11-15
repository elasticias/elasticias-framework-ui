import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EfStatusChipComponent } from '../../feedback/ef-status-chip/ef-status-chip.component';
import { EfIdentityThumbComponent } from '../../data/ef-identity-thumb/ef-identity-thumb.component';
import { EfOption, EfRecipientMatch } from './ef-recipient-dialog.types';

/** Whether a match may be chosen for an order. */
export function isPickable(m: EfRecipientMatch | null | undefined): boolean {
    return !!m && m.status !== 'Disabled' && m.status !== 'Inactive';
}

/**
 * What the recipient dialog shows of one customer: initials, name, phone,
 * email, city, and chips. Shopper mode: status, verified identifiers, code,
 * order count. Client mode: code and type. Display only; the dialog decides
 * whether it sits in a button (a pick) or a plain block. Phones and emails
 * are shown as the host sent them (masked or not), left to right.
 */
@Component({
    selector: 'ef-recipient-match',
    standalone: true,
    imports: [TranslateModule, EfStatusChipComponent, EfIdentityThumbComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let m = match();
        <ef-identity-thumb [name]="m.name" size="md" />
        <span class="ef-recipient-match__body">
            <span class="ef-recipient-match__name">{{ m.name }}</span>
            <span class="ef-recipient-match__line">
                @if (m.phone) {
                    <span dir="ltr" data-role="phone">{{ m.phone }}</span>
                }
                @if (m.email) {
                    <span dir="ltr" data-role="email">{{ m.email }}</span>
                }
                @if (city()) {
                    <span>{{ city() }}</span>
                }
            </span>
            <span class="ef-recipient-match__line ef-recipient-match__chips">
                @if (m.status === 'Disabled') {
                    <ef-status-chip color="cancelled" labelKey="ef.recipient.status_disabled" data-role="status" />
                } @else if (m.status === 'Inactive') {
                    <ef-status-chip color="cancelled" labelKey="ef.recipient.status_inactive" data-role="status" />
                } @else if (!clientMode()) {
                    @if (m.status === 'Active') {
                        <ef-status-chip color="delivered" labelKey="ef.recipient.status_account" hideDot />
                    } @else {
                        <ef-status-chip color="onhold" labelKey="ef.recipient.status_guest" hideDot />
                    }
                }
                @if (!clientMode() && m.phoneVerified) {
                    <ef-status-chip color="delivered" icon="pi-check" labelKey="ef.recipient.phone_verified" />
                }
                @if (!clientMode() && m.emailVerified) {
                    <ef-status-chip color="delivered" icon="pi-check" labelKey="ef.recipient.email_verified" />
                }
                <ef-status-chip color="onhold" [label]="m.code" hideDot data-role="code" />
                @if (clientMode() && typeLabel()) {
                    <ef-status-chip color="onhold" [label]="typeLabel()" hideDot data-role="type" />
                }
                @if (!clientMode()) {
                    <span class="ef-recipient-match__count">
                        {{
                            (m.orderCount === 1 ? 'ef.recipient.order_count_one' : 'ef.recipient.order_count_other')
                                | translate: { count: m.orderCount }
                        }}
                    </span>
                }
            </span>
        </span>
    `,
    styles: `
        :host {
            display: flex;
            align-items: flex-start;
            gap: var(--s-3);
            min-width: 0;
            /* Wrap the card's actions under it rather than squeeze the name, phone and email into a sliver. */
            flex: 1 1 16rem;
        }
        .ef-recipient-match__body {
            display: grid;
            gap: 4px;
            min-width: 0;
            flex: 1;
        }
        .ef-recipient-match__name {
            font-weight: 700;
            overflow-wrap: anywhere;
        }
        .ef-recipient-match__line {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 4px 12px;
            color: var(--text-mute);
            font-size: 13px;
            min-width: 0;
        }
        .ef-recipient-match__line > span {
            min-width: 0;
            overflow-wrap: anywhere;
        }
        /* A phone is read as one number, never broken between digits. */
        .ef-recipient-match__line > [data-role='phone'] {
            white-space: nowrap;
        }
        .ef-recipient-match__chips {
            gap: 4px 6px;
        }
    `,
})
export class EfRecipientMatchComponent {
    readonly match = input.required<EfRecipientMatch>();
    readonly clientMode = input(false);
    readonly clientTypes = input<EfOption[]>([]);

    /** The city of the default address, else of the first one. */
    protected readonly city = computed(() => {
        const list = this.match().addresses ?? [];
        return (list.find(a => a.isDefault) ?? list[0])?.cityName ?? '';
    });

    protected readonly typeLabel = computed(() => {
        const code = this.match().type;
        if (!code) return '';
        return this.clientTypes().find(t => t.code === code)?.label ?? code;
    });
}
