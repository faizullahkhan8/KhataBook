import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Account } from "../models";
import { AccountService } from "../services/AccountService";
import { usePagination } from "./usePagination";

export const useAccounts = (db: SQLite.SQLiteDatabase | null) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { page, pageSize, offset, resetPage } = usePagination({
        pageSize: 20,
    });

    const accountService = useMemo(
        () => (db ? new AccountService(db) : null),
        [db],
    );

    const fetchAccounts = useCallback(async () => {
        if (!accountService) return;

        setLoading(true);
        setError(null);
        try {
            const data = await accountService.getAllAccounts(pageSize, offset);
            setAccounts(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [accountService, pageSize, offset]);

    const fetchAccountsByCustomer = useCallback(
        async (customerId: number) => {
            if (!accountService) return;

            setLoading(true);
            setError(null);
            try {
                const data =
                    await accountService.getAccountsByCustomerId(customerId);
                setAccounts(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [accountService],
    );

    const createAccount = useCallback(
        async (account: Omit<Account, "id" | "created_at" | "updated_at">) => {
            if (!accountService) return;

            setLoading(true);
            setError(null);
            try {
                await accountService.createAccount(account);
                await fetchAccounts();
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [accountService, fetchAccounts],
    );

    const updateAccountBalance = useCallback(
        async (accountId: number, amount: number) => {
            if (!accountService) return;

            setLoading(true);
            setError(null);
            try {
                await accountService.updateAccountBalance(accountId, amount);
                await fetchAccounts();
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [accountService, fetchAccounts],
    );

    const deleteAccount = useCallback(
        async (id: number) => {
            if (!accountService) return;

            setLoading(true);
            setError(null);
            try {
                await accountService.deleteAccount(id);
                await fetchAccounts();
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [accountService, fetchAccounts],
    );

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    return {
        accounts,
        loading,
        error,
        page,
        pageSize,
        createAccount,
        updateAccountBalance,
        deleteAccount,
        fetchAccountsByCustomer,
        refresh: fetchAccounts,
    };
};
