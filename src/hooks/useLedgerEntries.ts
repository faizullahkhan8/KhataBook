import { SQLiteDatabase } from "../db/types";
import { useCallback, useEffect, useState } from "react";
import {
    AccountId,
    CurrencyAmount,
    Timestamp,
    TransactionId,
    TransactionType,
} from "../models";
import { useDatabaseContext } from "../store";

export type LedgerFundingSource = "received" | "balance" | "pocket" | "mixed";

export interface LedgerTransactionEntry {
    id: TransactionId;
    account_id: AccountId;
    type: TransactionType;
    amount: CurrencyAmount;
    description?: string;
    created_at: Timestamp;
    customer_name: string;
    account_number: string;
    pre_transaction_balance: CurrencyAmount;
    funding_source: LedgerFundingSource;
    balance_funded_amount: CurrencyAmount;
    pocket_funded_amount: CurrencyAmount;
}

type LedgerTransactionRow = Omit<
    LedgerTransactionEntry,
    "funding_source" | "balance_funded_amount" | "pocket_funded_amount"
>;

export const useLedgerEntries = (db: SQLiteDatabase | null) => {
    const { refreshVersions } = useDatabaseContext();
    const [entries, setEntries] = useState<LedgerTransactionEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchEntries = useCallback(async () => {
        if (!db) return;

        setLoading(true);
        setError(null);
        try {
            const rows = await db.getAllAsync<LedgerTransactionRow>(`
                SELECT
                    t.id,
                    t.account_id,
                    t.type,
                    t.amount,
                    t.description,
                    t.created_at,
                    c.name AS customer_name,
                    a.account_number,
                    a.current_balance - COALESCE((
                        SELECT SUM(
                            CASE
                                WHEN later.type = 0 THEN later.amount
                                ELSE -later.amount
                            END
                        )
                        FROM transactions later
                        WHERE later.account_id = t.account_id
                          AND (
                              later.created_at > t.created_at
                              OR (
                                  later.created_at = t.created_at
                                  AND later.id >= t.id
                              )
                          )
                    ), 0) AS pre_transaction_balance
                FROM transactions t
                JOIN accounts a ON a.id = t.account_id
                JOIN customers c ON c.id = a.customer_id
                ORDER BY t.created_at DESC, t.id DESC
            `);

            setEntries(
                rows.map((row) => {
                    if (row.type === TransactionType.CREDIT) {
                        return {
                            ...row,
                            funding_source: "received",
                            balance_funded_amount: 0 as CurrencyAmount,
                            pocket_funded_amount: 0 as CurrencyAmount,
                        };
                    }

                    const balanceFundedAmount = Math.min(
                        Math.max(-row.pre_transaction_balance, 0),
                        row.amount,
                    ) as CurrencyAmount;
                    const pocketFundedAmount = (row.amount -
                        balanceFundedAmount) as CurrencyAmount;

                    return {
                        ...row,
                        funding_source:
                            balanceFundedAmount === row.amount
                                ? "balance"
                                : balanceFundedAmount > 0
                                  ? "mixed"
                                  : "pocket",
                        balance_funded_amount: balanceFundedAmount,
                        pocket_funded_amount: pocketFundedAmount,
                    };
                }),
            );
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [db]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries, refreshVersions.transactions, refreshVersions.accounts]);

    return {
        entries,
        loading,
        error,
        refresh: fetchEntries,
    };
};
