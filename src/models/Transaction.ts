import { Account } from './Account';

export type TransactionType = 'DEBIT' | 'CREDIT';

export interface Transaction {
  id?: number;
  account_id: number;
  type: TransactionType;
  amount: number;
  description?: string;
  reference?: string;
  created_at?: number;
}

export interface TransactionWithAccount extends Transaction {
  account?: Account;
}
