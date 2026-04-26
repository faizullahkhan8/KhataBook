import { Account } from "./Account";
import { CurrencyAmount, CustomerId, Timestamp } from "./types";

export interface Customer {
    id?: CustomerId;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    image_uri?: string;
    notes?: string;
    created_at?: Timestamp;
    updated_at?: Timestamp;

    // Denormalized summary fields for performance
    total_receivable: CurrencyAmount;
    total_payable: CurrencyAmount;
    last_transaction_at?: Timestamp;
}

/**
 * Lightweight customer representation for high-density list views.
 */
export interface CustomerSummary {
    id: CustomerId;
    name: string;
    phone: string;
    image_uri?: string;
    total_receivable: CurrencyAmount;
    total_payable: CurrencyAmount;
    last_transaction_at?: Timestamp;
}

export interface CustomerWithAccounts extends Customer {
    accounts?: Account[];
}

/**
 * Full customer detail including all accounts.
 */
export interface CustomerDetail extends Customer {
    accounts: Account[];
}
