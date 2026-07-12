import { SQLiteDatabase } from "../db/types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    AccountId,
    CurrencyAmount,
    Timestamp,
    TransactionId,
    TransactionType,
} from "../models";
import { useDatabaseContext, useStoreContext } from "../store";
import { usePagination } from "./usePagination";

export type LedgerFundingSource = "received" | "balance" | "pocket" | "mixed" | "settled" | "settledAndAdded" | "added";

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
    const { activeStoreId } = useStoreContext();
    const [entries, setEntries] = useState<LedgerTransactionEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { page, pageSize, hasMore, markFetched, nextPage, resetPage } = usePagination({
        pageSize: 50,
    });

    const cursorRef = useRef<{ created_at: number; id: number } | null>(null);
    const loadingRef = useRef(false);

    const fetchEntries = useCallback(
        async (append: boolean) => {
            if (!db || loadingRef.current || !activeStoreId) return;

            loadingRef.current = true;
            if (!append) {
                setLoading(true);
            }
            setError(null);
            try {
                const cursor = append ? cursorRef.current : null;
                const cursorClause = cursor
                    ? `AND (t.created_at < ${cursor.created_at} OR (t.created_at = ${cursor.created_at} AND t.id < ${cursor.id}))`
                    : "";

                const rows = await db.getAllAsync<LedgerTransactionRow>(
                    `SELECT
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
                              AND later.is_deleted = 0
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
                    WHERE t.store_id = ? ${cursorClause} AND t.is_deleted = 0
                    ORDER BY t.created_at DESC, t.id DESC
                    LIMIT ?`,
                    [activeStoreId, pageSize],
                );

                const hasFewer = rows.length < pageSize;
                if (hasFewer) {
                    markFetched(rows.length);
                }

                if (rows.length > 0) {
                    const last = rows[rows.length - 1];
                    cursorRef.current = { created_at: last.created_at, id: last.id };
                }

                const mapped = rows.map((row) => {
                    if (row.type === TransactionType.CREDIT) {
                        const settlementAmount = Math.min(
                            Math.abs(row.pre_transaction_balance),
                            row.amount,
                        ) as CurrencyAmount;
                        const addedAmount = (row.amount - settlementAmount) as CurrencyAmount;

                        let fundingSource: LedgerFundingSource;
                        if (settlementAmount === row.amount) {
                            fundingSource = "settled";
                        } else if (settlementAmount > 0) {
                            fundingSource = "settledAndAdded";
                        } else {
                            fundingSource = "added";
                        }

                        return {
                            ...row,
                            funding_source: fundingSource,
                            balance_funded_amount: settlementAmount,
                            pocket_funded_amount: addedAmount,
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
                                ? ("balance" as LedgerFundingSource)
                                : balanceFundedAmount > 0
                                  ? ("mixed" as LedgerFundingSource)
                                  : ("pocket" as LedgerFundingSource),
                        balance_funded_amount: balanceFundedAmount,
                        pocket_funded_amount: pocketFundedAmount,
                    };
                });

                setEntries((prev) =>
                    append ? [...prev, ...mapped] : mapped,
                );
            } catch (err) {
                setError(err as Error);
            } finally {
                loadingRef.current = false;
                setLoading(false);
            }
        },
        [db, activeStoreId, pageSize, markFetched],
    );

    // Initial load + version changes → replace
    useEffect(() => {
        cursorRef.current = null;
        resetPage();
        void fetchEntries(false);
    }, [refreshVersions.transactions, refreshVersions.accounts, activeStoreId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Pagination: page increments via nextPage → append with keyset cursor
    useEffect(() => {
        if (page > 0) {
            void fetchEntries(true);
        }
    }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

    const refresh = useCallback(async () => {
        cursorRef.current = null;
        resetPage();
        await fetchEntries(false);
    }, [resetPage, fetchEntries]);

    return {
        entries,
        loading,
        error,
        hasMore,
        nextPage,
        refresh,
    };
};
