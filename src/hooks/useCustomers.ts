import { SQLiteDatabase } from "../db/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Customer, CustomerId } from "../models";
import { CustomerService } from "../services/CustomerService";
import { useDatabaseContext, useStoreContext } from "../store";
import { usePagination } from "./usePagination";

export const useCustomers = (db: SQLiteDatabase | null) => {
    const { refreshVersions, invalidate } = useDatabaseContext();
    const { activeStoreId } = useStoreContext();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const { page, pageSize, offset, resetPage } = usePagination({
        pageSize: 20,
    });

    const customerService = useMemo(
        () => (db ? new CustomerService(db) : null),
        [db],
    );

    const fetchCustomers = useCallback(async (isManualRefresh = false) => {
        if (!customerService || !activeStoreId) return;

        if (isManualRefresh || customers.length === 0) {
            setLoading(true);
        }
        setError(null);
        try {
            const data = searchQuery
                ? await customerService.searchCustomers(
                      activeStoreId,
                      searchQuery,
                      pageSize,
                      offset,
                  )
                : await customerService.getAllCustomers(activeStoreId, pageSize, offset);
            setCustomers(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [customerService, activeStoreId, searchQuery, pageSize, offset, customers.length]);

    const createCustomer = useCallback(
        async (
            customer: Omit<Customer, "id" | "store_id" | "created_at" | "updated_at">,
        ): Promise<number | undefined> => {
            if (!customerService || !activeStoreId) return undefined;

            setLoading(true);
            setError(null);
            try {
                const customerId =
                    await customerService.createCustomer(activeStoreId, customer);
                invalidate(); // Trigger global refresh
                return customerId;
            } catch (err) {
                setError(err as Error);
                return undefined;
            } finally {
                setLoading(false);
            }
        },
        [customerService, activeStoreId, invalidate],
    );

    const updateCustomer = useCallback(
        async (id: CustomerId, customer: Partial<Customer>) => {
            if (!customerService) return;

            setLoading(true);
            setError(null);
            try {
                await customerService.updateCustomer(id, customer);
                invalidate(); // Trigger global refresh
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [customerService, invalidate],
    );

    const deleteCustomer = useCallback(
        async (id: CustomerId) => {
            if (!customerService) return;

            setLoading(true);
            setError(null);
            try {
                await customerService.deleteCustomer(id);
                invalidate(); // Trigger global refresh
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [customerService, invalidate],
    );

    const handleSearch = useCallback(
        (query: string) => {
            setSearchQuery(query);
            resetPage();
        },
        [resetPage],
    );

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers, refreshVersions.customers]);

    return {
        customers,
        loading,
        error,
        searchQuery,
        page,
        pageSize,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        handleSearch,
        refresh: () => fetchCustomers(true),
    };
};
