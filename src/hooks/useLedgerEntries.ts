import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import {
    AccountId,
    CurrencyAmount,
    Timestamp,
    TransactionId,
    TransactionType,
} from "../models";
import { useDatabaseContext } from "../store";

export type LedgerFundingSource = "received" | "balance" | "pocket";

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
}

type LedgerTransactionRow = Omit<LedgerTransactionEntry, "funding_source">;

export const useLedgerEntries = (db: SQLite.SQLiteDatabase | null) => {
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
                                WHEN later.type = 1 THEN later.amount
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
                rows.map((row) => ({
                    ...row,
                    funding_source:
                        row.type === TransactionType.CREDIT
                            ? "received"
                            : row.pre_transaction_balance >= row.amount
                              ? "balance"
                              : "pocket",
                })),
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
