import { SQLiteDatabase } from "../db/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Account, AccountId, CustomerId } from "../models";
import { AccountService } from "../services/AccountService";
import { useDatabaseContext, useStoreContext } from "../store";
import { usePagination } from "./usePagination";

export const useAccounts = (db: SQLiteDatabase | null) => {
    const { refreshVersions, invalidate } = useDatabaseContext();
    const { activeStoreId } = useStoreContext();
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

    const fetchAccounts = useCallback(async (isManualRefresh = false) => {
        if (!accountService || !activeStoreId) return;

        if (isManualRefresh || accounts.length === 0) {
            setLoading(true);
        }
        setError(null);
        try {
            const data = await accountService.getAllAccounts(activeStoreId, pageSize, offset);
            setAccounts(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [accountService, activeStoreId, pageSize, offset, accounts.length]);

    const fetchAccountsByCustomer = useCallback(
        async (customerId: CustomerId) => {
            if (!accountService || !activeStoreId) return;

            setLoading(true);
            setError(null);
            try {
                const data =
                    await accountService.getAccountsByCustomerId(customerId, activeStoreId);
                setAccounts(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [accountService, activeStoreId],
    );

    const createAccount = useCallback(
        async (account: Omit<Account, "id" | "store_id" | "created_at" | "updated_at">) => {
            if (!accountService || !activeStoreId) return;

            setLoading(true);
            setError(null);
            try {
                await accountService.createAccount(activeStoreId, account);
                invalidate(); // Trigger global refresh
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [accountService, activeStoreId, invalidate],
    );

    const updateAccountBalance = useCallback(
        async (accountId: AccountId, amount: number) => {
            if (!accountService) return;

            setLoading(true);
            setError(null);
            try {
                await accountService.updateAccountBalance(accountId, amount);
                invalidate(); // Trigger global refresh
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [accountService, invalidate],
    );

    const deleteAccount = useCallback(
        async (id: AccountId) => {
            if (!accountService) return;

            setLoading(true);
            setError(null);
            try {
                await accountService.deleteAccount(id);
                invalidate(); // Trigger global refresh
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [accountService, invalidate],
    );

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts, refreshVersions.accounts]);

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
        refresh: () => fetchAccounts(true),
    };
};
