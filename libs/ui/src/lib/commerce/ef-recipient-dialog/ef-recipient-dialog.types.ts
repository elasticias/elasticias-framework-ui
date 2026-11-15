/**
 * Data contracts of `ef-recipient-dialog`. The dialog makes no API call: the
 * host screen maps its own DTOs (a store shopper, a Sales client) to these.
 */

/** A customer the search found. Masked values (`s•••@gmail.com`) arrive
 *  already masked from the host and are shown as given. */
export interface EfRecipientMatch {
    id: string;
    code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    /** `Guest` / `Active` / `Disabled` for a shopper, `Active` / `Inactive`
     *  for a Sales client. `Disabled` and `Inactive` can be shown, never picked. */
    status: 'Guest' | 'Active' | 'Disabled' | 'Inactive';
    phoneVerified: boolean;
    emailVerified: boolean;
    orderCount: number;
    addresses: EfRecipientAddress[];
    /** Client mode: the client type code, labelled from `clientTypes`. */
    type?: string | null;
}

export interface EfRecipientAddress {
    id: string;
    label?: string | null;
    recipientName: string;
    phone?: string | null;
    street: string;
    cityId: number;
    cityName: string;
    isDefault: boolean;
}

/** The contact typed for a customer the search did not find. */
export interface EfRecipientContact {
    fullName: string;
    phone: string;
    email?: string | null;
    /** Client mode: the client type code. */
    type?: string | null;
    /** Client mode: "Raison sociale ou nom". `fullName` carries the same text. */
    companyName?: string | null;
}

export interface EfRecipientValue {
    shopperId?: string | null;
    contact?: EfRecipientContact | null;
    delivery: {
        recipientName: string;
        phone: string;
        street: string;
        cityId: number;
        note?: string | null;
        /** The saved address chosen, when one was. Lets the host read the
         *  unmasked address instead of trusting a masked phone. */
        addressId?: string | null;
    };
    paymentMethod: string;
    receivedVia: string;
}

/** A reference-data option (payment method, received-via, client type). */
export interface EfOption {
    code: string;
    label: string;
    description?: string | null;
}

export interface EfRecipientCity {
    id: number;
    name: string;
}
