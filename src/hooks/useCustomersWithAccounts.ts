import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerWithAccounts } from "../models";
import { AccountService } from "../services/AccountService";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { usePagination } from "./usePagination";

export const useCustomersWithAccounts = (db: SQLite.SQLiteDatabase | null) => {
    const [customers, setCustomers] = useState<CustomerWithAccounts[]>([]);
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
    const accountService = useMemo(
        () => (db ? new AccountService(db) : null),
        [db],
    );
    const transactionService = useMemo(
        () => (db ? new TransactionService(db) : null),
        [db],
    );

    const fetchCustomersWithAccounts = useCallback(async () => {
        if (!customerService || !accountService) return;

        setLoading(true);
        setError(null);
        try {
            const customerData = searchQuery
                ? await customerService.searchCustomers(
                      searchQuery,
                      pageSize,
                      offset,
                  )
                : await customerService.getAllCustomers(pageSize, offset);

            // Fetch accounts for each customer
            const customersWithAccounts = await Promise.all(
                customerData.map(async (customer) => {
                    const accounts =
                        await accountService.getAccountsByCustomerId(
                            customer.id!,
                        );
                    return { ...customer, accounts };
                }),
            );

            setCustomers(customersWithAccounts);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [customerService, accountService, searchQuery, pageSize, offset]);

    const createCustomer = useCallback(
        async (
            customer: Omit<
                CustomerWithAccounts,
                "id" | "created_at" | "updated_at" | "accounts"
            >,
        ): Promise<number | undefined> => {
            if (!customerService || !accountService) return undefined;

            setLoading(true);
            setError(null);
            try {
                const customerId =
                    await customerService.createCustomer(customer);
                // Auto-create account for the customer
                if (customerId) {
                    await accountService.createAccount({
                        customer_id: customerId,
                        account_number: `ACC-${Date.now()}`,
                        account_type: "CREDIT",
                        credit_limit: 0,
                        current_balance: 0,
                        status: "ACTIVE",
                    });
                }
                await fetchCustomersWithAccounts();
                return customerId;
            } catch (err) {
                setError(err as Error);
                return undefined;
            } finally {
                setLoading(false);
            }
        },
        [customerService, accountService, fetchCustomersWithAccounts],
    );

    const deleteCustomer = useCallback(
        async (id: number) => {
            if (!customerService || !accountService || !transactionService)
                return;

            setLoading(true);
            setError(null);
            try {
                // Get all accounts for this customer
                const accounts =
                    await accountService.getAccountsByCustomerId(id);

                // Delete all transactions for each account
                for (const account of accounts) {
                    if (account.id) {
                        await transactionService.deleteTransactionsByAccountId(
                            account.id,
                        );
                    }
                }

                // Delete all accounts for this customer
                for (const account of accounts) {
                    if (account.id) {
                        await accountService.deleteAccount(account.id);
                    }
                }

                // Finally delete the customer
                await customerService.deleteCustomer(id);
                await fetchCustomersWithAccounts();
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        },
        [
            customerService,
            accountService,
            transactionService,
            fetchCustomersWithAccounts,
        ],
    );

    const handleSearch = useCallback(
        (query: string) => {
            setSearchQuery(query);
            resetPage();
        },
        [resetPage],
    );

    useEffect(() => {
        fetchCustomersWithAccounts();
    }, [fetchCustomersWithAccounts]);

    return {
        customers,
        loading,
        error,
        searchQuery,
        page,
        pageSize,
        createCustomer,
        deleteCustomer,
        handleSearch,
        refresh: fetchCustomersWithAccounts,
    };
};
