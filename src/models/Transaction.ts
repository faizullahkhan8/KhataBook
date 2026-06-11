import { AccountId, CurrencyAmount, Timestamp, TransactionId } from "./types";

export enum TransactionType {
    // DEBIT (0): Customer takes/borrows on credit - increases their balance owed to us
    DEBIT = 0,
    // CREDIT (1): Customer pays back - decreases their balance owed to us
    CREDIT = 1,
}

export interface Transaction {
    id?: TransactionId;
    account_id: AccountId;
    type: TransactionType;
    amount: CurrencyAmount; // Stored as integer (e.g. 1000 for 10.00)
    description?: string;
    reference?: string;
    created_at?: Timestamp;
}
