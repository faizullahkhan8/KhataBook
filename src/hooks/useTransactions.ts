import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Transaction } from "../models";
import { TransactionService } from "../services/TransactionService";
import { usePagination } from "./usePagination";

export const useTransactions = (db: SQLite.SQLiteDatabase | null) => {
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

    const fetchTransactions = useCallback(async () => {
        if (!transactionService) return;

        setLoading(true);
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
    }, [transactionService, pageSize, offset]);

    const fetchTransactionsByAccount = useCallback(
        async (accountId: number) => {
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
                await fetchTransactions();
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [transactionService, fetchTransactions],
    );

    const deleteTransaction = useCallback(
        async (id: number) => {
            if (!transactionService) return;

            setLoading(true);
            setError(null);
            try {
                await transactionService.deleteTransaction(id);
                await fetchTransactions();
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [transactionService, fetchTransactions],
    );

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    return {
        transactions,
        loading,
        error,
        page,
        pageSize,
        createTransaction,
        deleteTransaction,
        fetchTransactionsByAccount,
        refresh: fetchTransactions,
    };
};
