import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AccountStatus,
    AccountType,
    CustomerId,
    CustomerWithAccounts,
} from "../models";
import { AccountService } from "../services/AccountService";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { usePagination } from "./usePagination";

import { useDatabaseContext } from "../store";

export const useCustomersWithAccounts = (db: SQLite.SQLiteDatabase | null) => {
    const { refreshVersions, invalidate } = useDatabaseContext();
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

    const fetchCustomersWithAccounts = useCallback(
        async (isManualRefresh = false) => {
            if (!customerService || !accountService) return;

            if (isManualRefresh || customers.length === 0) {
                setLoading(true);
            }

            setError(null);
            try {
                const customerData = searchQuery
                    ? await customerService.searchCustomers(
                          searchQuery,
                          pageSize,
                          offset,
                      )
                    : await customerService.getAllCustomers(pageSize, offset);

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
        },
        [
            customerService,
            accountService,
            searchQuery,
            pageSize,
            offset,
            customers.length,
        ],
    );

    const createCustomer = useCallback(
        async (
            customer: Omit<
                CustomerWithAccounts,
                | "id"
                | "created_at"
                | "updated_at"
                | "accounts"
                | "total_receivable"
                | "total_payable"
                | "last_transaction_at"
            >,
            options?: {
                creditLimit?: number;
                initialBalance?: number;
            },
        ): Promise<CustomerId | undefined> => {
            if (!customerService || !accountService) return undefined;

            setLoading(true);
            setError(null);
            try {
                const customerId =
                    await customerService.createCustomer(customer);
                if (customerId) {
                    const initialBalance = options?.initialBalance || 0;
                    // If initial balance provided, create account with opening balance transaction
                    // This ensures the ledger has a matching transaction (audit trail completeness)
                    if (initialBalance > 0) {
                        await accountService.createAccountWithOpeningBalance(
                            {
                                customer_id: customerId,
                                account_number: `ACC-${Date.now()}`,
                                account_type: AccountType.CREDIT,
                                credit_limit: (options?.creditLimit ||
                                    0) as any,
                                current_balance: 0, // Will be set by opening balance transaction
                                status: AccountStatus.ACTIVE,
                            },
                            initialBalance,
                        );
                    } else {
                        // No initial balance, create account normally
                        await accountService.createAccount({
                            customer_id: customerId,
                            account_number: `ACC-${Date.now()}`,
                            account_type: AccountType.CREDIT,
                            credit_limit: (options?.creditLimit || 0) as any,
                            current_balance: 0,
                            status: AccountStatus.ACTIVE,
                        });
                    }
                }
                invalidate("customers");
                return customerId;
            } catch (err) {
                setError(err as Error);
                return undefined;
            } finally {
                setLoading(false);
            }
        },
        [customerService, accountService, invalidate],
    );

    const bulkDeleteCustomers = useCallback(
        async (ids: CustomerId[]) => {
            if (!customerService || !db || ids.length === 0) return;

            setLoading(true);
            setError(null);
            try {
                // Wrap entire deletion in a transaction for atomicity
                // SQLite CASCADE will automatically delete related accounts and transactions
                await db.withTransactionAsync(async () => {
                    for (const id of ids) {
                        await customerService.deleteCustomer(id);
                    }
                });

                invalidate("customers");
                invalidate("accounts");
                invalidate("transactions");
            } catch (err) {
                setError(err as Error);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [customerService, db, invalidate],
    );

    const deleteCustomer = useCallback(
        async (id: CustomerId) => {
            await bulkDeleteCustomers([id]);
        },
        [bulkDeleteCustomers],
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
    }, [fetchCustomersWithAccounts, refreshVersions.customers]);

    return {
        customers,
        loading,
        error,
        searchQuery,
        page,
        pageSize,
        createCustomer,
        deleteCustomer,
        bulkDeleteCustomers,
        handleSearch,
        refresh: () => fetchCustomersWithAccounts(true),
    };
};
