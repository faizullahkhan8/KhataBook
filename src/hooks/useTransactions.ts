import { SQLiteDatabase } from "../db/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountId, Transaction, TransactionId } from "../models";
import { TransactionService } from "../services/TransactionService";
import { useDatabaseContext } from "../store";
import { usePagination } from "./usePagination";

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export const useTransactions = (
    db: SQLiteDatabase | null,
    dateRange?: DateRange | null,
) => {
    const { refreshVersions, invalidate } = useDatabaseContext();
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { page, pageSize, offset, hasMore, markFetched, nextPage, resetPage } = usePagination({
        pageSize: 100,
    });

    const transactionService = useMemo(
        () => (db ? new TransactionService(db) : null),
        [db],
    );

    const targetAccountRef = useRef<AccountId | null>(null);

    const toUnixTimestamp = (date: Date): number => {
        return Math.floor(date.getTime() / 1000);
    };

    const fetchPage = useCallback(
        async (targetPage: number, accountId: AccountId | null, append: boolean) => {
            if (!transactionService) return;

            if (!append) {
                setLoading(true);
            }
            setError(null);
            try {
                const currentOffset = targetPage * pageSize;
                const data = accountId
                    ? await transactionService.getTransactionsByAccountId(accountId, pageSize, currentOffset)
                    : await transactionService.getAllTransactions(pageSize, currentOffset);

                if (data.length < pageSize) {
                    markFetched(data.length);
                }

                setAllTransactions(prev =>
                    append ? [...prev, ...data] : data,
                );
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [transactionService, pageSize, markFetched],
    );

    // Filter transactions by date range
    const transactions = useMemo(() => {
        if (!dateRange) return allTransactions;

        const startTimestamp = toUnixTimestamp(dateRange.startDate);
        const endTimestamp = toUnixTimestamp(dateRange.endDate);
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

            targetAccountRef.current = accountId;
            resetPage();
            setAllTransactions([]);
            setLoading(true);
            setError(null);
            try {
                const data =
                    await transactionService.getTransactionsByAccountId(
                        accountId,
                        pageSize,
                        0,
                    );
                if (data.length < pageSize) {
                    markFetched(data.length);
                }
                setAllTransactions(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [transactionService, pageSize, resetPage, markFetched],
    );

    // Initial load + version changes → page 0 (all accounts), replace
    useEffect(() => {
        targetAccountRef.current = null;
        resetPage();
        void fetchPage(0, null, false);
    }, [refreshVersions.transactions]); // eslint-disable-line react-hooks/exhaustive-deps

    // Pagination: page increments via nextPage → append, respects account mode
    useEffect(() => {
        if (page > 0) {
            void fetchPage(page, targetAccountRef.current, true);
        }
    }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const refresh = useCallback(() => {
        resetPage();
        invalidate("transactions");
    }, [resetPage, invalidate]);

    return {
        transactions,
        allTransactions,
        loading,
        error,
        page,
        pageSize,
        hasMore,
        nextPage,
        createTransaction,
        deleteTransaction,
        fetchTransactionsByAccount,
        refresh,
    };
};
