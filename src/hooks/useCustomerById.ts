import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerWithAccounts } from "../models";
import { AccountService } from "../services/AccountService";
import { CustomerService } from "../services/CustomerService";

export const useCustomerById = (
    db: SQLite.SQLiteDatabase | null,
    customerId: number,
) => {
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

    const fetchCustomer = useCallback(async () => {
        if (!customerService || !accountService || !customerId) return;

        setLoading(true);
        setError(null);
        try {
            const customerData =
                await customerService.getCustomerById(customerId);
            if (customerData) {
                const accounts =
                    await accountService.getAccountsByCustomerId(customerId);
                setCustomer({ ...customerData, accounts });
            }
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [customerService, accountService, customerId]);

    useEffect(() => {
        fetchCustomer();
    }, [fetchCustomer]);

    return {
        customer,
        loading,
        error,
        refresh: fetchCustomer,
    };
};
