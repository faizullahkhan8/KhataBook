import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountId, Transaction, TransactionId } from "../models";
import { TransactionService } from "../services/TransactionService";
import { useDatabaseContext } from "../store";
import { usePagination } from "./usePagination";

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export const useTransactions = (
    db: SQLite.SQLiteDatabase | null,
    dateRange?: DateRange | null,
) => {
    const { refreshVersions, invalidate } = useDatabaseContext();
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { page, pageSize, offset, resetPage } = usePagination({
        pageSize: 100, // Load more to allow client-side filtering
    });

    const transactionService = useMemo(
        () => (db ? new TransactionService(db) : null),
        [db],
    );

    const toUnixTimestamp = (date: Date): number => {
        return Math.floor(date.getTime() / 1000);
    };

    const fetchTransactions = useCallback(
        async (isManualRefresh = false) => {
            if (!transactionService) return;

            if (isManualRefresh || allTransactions.length === 0) {
                setLoading(true);
            }
            setError(null);
            try {
                const data = await transactionService.getAllTransactions(
                    pageSize,
                    offset,
                );
                setAllTransactions(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [transactionService, pageSize, offset, allTransactions.length],
    );

    // Filter transactions by date range
    const transactions = useMemo(() => {
        if (!dateRange) return allTransactions;

        const startTimestamp = toUnixTimestamp(dateRange.startDate);
        const endTimestamp = toUnixTimestamp(dateRange.endDate);
        // Add 86400 seconds (1 day) to include the full end date
        const endTimestampInclusive = endTimestamp + 86399;

        return allTransactions.filter((transaction) => {
            const timestamp = transaction.created_at || 0;
            return (
                timestamp >= startTimestamp &&
                timestamp <= endTimestampInclusive
            );
        });
    }, [allTransactions, dateRange]);

    const fetchTransactionsByAccount = useCallback(
        async (accountId: AccountId) => {
            if (!transactionService) return;

            setLoading(true);
            setError(null);
            try {
                const data =
                    await transactionService.getTransactionsByAccountId(
                        accountId,
                        pageSize,
                        offset,
                    );
                setAllTransactions(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [transactionService, pageSize, offset],
    );

    const createTransaction = useCallback(
        async (transaction: Omit<Transaction, "id" | "created_at">) => {
            if (!transactionService) return;

            setLoading(true);
            setError(null);
            try {
                await transactionService.createTransaction(transaction);
                invalidate("transactions");
                invalidate("customers");
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [transactionService, invalidate],
    );

    const deleteTransaction = useCallback(
        async (id: TransactionId) => {
            if (!transactionService) return;

            setLoading(true);
            setError(null);
            try {
                await transactionService.deleteTransaction(id);
                invalidate("transactions");
                invalidate("customers");
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [transactionService, invalidate],
    );

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions, refreshVersions.transactions]);

    return {
        transactions,
        allTransactions,
        loading,
        error,
        page,
        pageSize,
        createTransaction,
        deleteTransaction,
        fetchTransactionsByAccount,
        refresh: () => fetchTransactions(true),
    };
};
