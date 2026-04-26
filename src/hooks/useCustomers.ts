import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Customer } from "../models";
import { CustomerService } from "../services/CustomerService";
import { useDatabaseContext } from "../store";
import { usePagination } from "./usePagination";

export const useCustomers = (db: SQLite.SQLiteDatabase | null) => {
    const { refreshVersion, invalidate } = useDatabaseContext();
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
        if (!customerService) return;

        if (isManualRefresh || customers.length === 0) {
            setLoading(true);
        }
        setError(null);
        try {
            const data = searchQuery
                ? await customerService.searchCustomers(
                      searchQuery,
                      pageSize,
                      offset,
                  )
                : await customerService.getAllCustomers(pageSize, offset);
            setCustomers(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [customerService, searchQuery, pageSize, offset, customers.length]);

    const createCustomer = useCallback(
        async (
            customer: Omit<Customer, "id" | "created_at" | "updated_at">,
        ): Promise<number | undefined> => {
            if (!customerService) return undefined;

            setLoading(true);
            setError(null);
            try {
                const customerId =
                    await customerService.createCustomer(customer);
                invalidate(); // Trigger global refresh
                return customerId;
            } catch (err) {
                setError(err as Error);
                return undefined;
            } finally {
                setLoading(false);
            }
        },
        [customerService, invalidate],
    );

    const updateCustomer = useCallback(
        async (id: number, customer: Partial<Customer>) => {
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
        async (id: number) => {
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
    }, [fetchCustomers, refreshVersion]);

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
