import { SQLiteDatabase } from "../db/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerWithAccounts, CustomerId } from "../models";
import { AccountService } from "../services/AccountService";
import { CustomerService } from "../services/CustomerService";

import { useDatabaseContext, useStoreContext } from "../store";

export const useCustomerById = (
    db: SQLiteDatabase | null,
    customerId: CustomerId,
) => {
    const { refreshVersions } = useDatabaseContext();
    const { activeStoreId } = useStoreContext();
    const [customer, setCustomer] = useState<CustomerWithAccounts | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const customerService = useMemo(
        () => (db ? new CustomerService(db) : null),
        [db],
    );
    const accountService = useMemo(
        () => (db ? new AccountService(db) : null),
        [db],
    );

    const fetchCustomer = useCallback(async (isManualRefresh = false) => {
        if (!customerService || !accountService || !customerId || !activeStoreId) return;

        setLoading(true);
        setError(null);
        try {
            const customerData =
                await customerService.getCustomerById(customerId, activeStoreId);
            if (customerData) {
                const accounts =
                    await accountService.getAccountsByCustomerId(customerId, activeStoreId);
                setCustomer({ ...customerData, accounts });
            }
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [customerService, accountService, customerId, activeStoreId]);

    useEffect(() => {
        fetchCustomer();
    }, [fetchCustomer, refreshVersions.customers, activeStoreId]);

    return {
        customer,
        loading,
        error,
        refresh: () => fetchCustomer(true),
    };
};
