import { useCallback, useEffect, useMemo, useState } from "react";
import { SQLiteDatabase } from "../db/types";
import { CustomerId, TransactionId } from "../models/types";
import {
    TrashService,
    TrashedCustomer,
    TrashedTransaction,
    TrashCount,
} from "../services/TrashService";
import { useDatabaseContext } from "../store";

export const useTrash = (db: SQLiteDatabase | null) => {
    const { refreshVersions, invalidate } = useDatabaseContext();

    const [deletedCustomers, setDeletedCustomers] = useState<TrashedCustomer[]>([]);
    const [deletedTransactions, setDeletedTransactions] = useState<TrashedTransaction[]>([]);
    const [trashCount, setTrashCount] = useState<TrashCount>({ customers: 0, transactions: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const trashService = useMemo(
        () => (db ? new TrashService(db) : null),
        [db],
    );

    const fetchTrash = useCallback(async () => {
        if (!trashService) return;
        setLoading(true);
        setError(null);
        try {
            const [customers, transactions, count] = await Promise.all([
                trashService.getDeletedCustomers(),
                trashService.getDeletedTransactions(),
                trashService.getTrashCount(),
            ]);
            setDeletedCustomers(customers);
            setDeletedTransactions(transactions);
            setTrashCount(count);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [trashService]);

    // Auto-refresh when underlying data changes
    useEffect(() => {
        void fetchTrash();
    }, [fetchTrash, refreshVersions.customers, refreshVersions.transactions]);

    const restoreCustomers = useCallback(
        async (ids: CustomerId[]) => {
            if (!trashService) return;
            await trashService.restoreCustomers(ids);
            invalidate("customers");
        },
        [trashService, invalidate],
    );

    const restoreTransactions = useCallback(
        async (ids: TransactionId[]) => {
            if (!trashService) return;
            await trashService.restoreTransactions(ids);
            invalidate("transactions");
            invalidate("accounts");
        },
        [trashService, invalidate],
    );

    const permanentDeleteCustomers = useCallback(
        async (ids: CustomerId[]) => {
            if (!trashService) return;
            await trashService.permanentDeleteCustomers(ids);
            invalidate("customers");
        },
        [trashService, invalidate],
    );

    const permanentDeleteTransactions = useCallback(
        async (ids: TransactionId[]) => {
            if (!trashService) return;
            await trashService.permanentDeleteTransactions(ids);
            invalidate("transactions");
        },
        [trashService, invalidate],
    );

    const emptyTrash = useCallback(async () => {
        if (!trashService) return;
        await trashService.emptyTrash();
        invalidate("customers");
        invalidate("transactions");
    }, [trashService, invalidate]);

    return {
        deletedCustomers,
        deletedTransactions,
        trashCount,
        loading,
        error,
        refresh: fetchTrash,
        restoreCustomers,
        restoreTransactions,
        permanentDeleteCustomers,
        permanentDeleteTransactions,
        emptyTrash,
    };
};
