import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Transaction, AccountId, TransactionId } from "../models";
import { TransactionService } from "../services/TransactionService";
import { useDatabaseContext } from "../store";
import { usePagination } from "./usePagination";

export const useTransactions = (db: SQLite.SQLiteDatabase | null) => {
    const { refreshVersions, invalidate } = useDatabaseContext();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { page, pageSize, offset, resetPage } = usePagination({
        pageSize: 20,
    });

    const transactionService = useMemo(
        () => (db ? new TransactionService(db) : null),
        [db],
    );

    const fetchTransactions = useCallback(async (isManualRefresh = false) => {
        if (!transactionService) return;

        if (isManualRefresh || transactions.length === 0) {
            setLoading(true);
        }
        setError(null);
        try {
            const data = await transactionService.getAllTransactions(
                pageSize,
                offset,
            );
            setTransactions(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [transactionService, pageSize, offset, transactions.length]);

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
                setTransactions(data);
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
