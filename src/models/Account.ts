import { AccountId, CurrencyAmount, CustomerId, StoreId, Timestamp } from "./types";

export enum AccountStatus {
    ACTIVE = 0,
    INACTIVE = 1,
    SUSPENDED = 2,
    CLOSED = 3,
}

export enum AccountType {
    CREDIT = 0,
    DEBIT = 1,
}

export interface Account {
    id?: AccountId;
    store_id: StoreId;
    customer_id: CustomerId;
    account_number: string;
    account_type: AccountType;
    credit_limit: CurrencyAmount;
    current_balance: CurrencyAmount;
    status: AccountStatus;
    created_at?: Timestamp;
    updated_at?: Timestamp;
}
