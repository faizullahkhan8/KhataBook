export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CLOSED";
export type AccountType = "CREDIT" | "DEBIT";

export interface Account {
    id?: number;
    customer_id: number;
    account_number: string;
    account_type: AccountType;
    credit_limit: number;
    current_balance: number;
    status: AccountStatus;
    created_at?: number;
    updated_at?: number;
}
