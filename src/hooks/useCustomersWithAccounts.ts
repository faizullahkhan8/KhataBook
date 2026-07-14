import { SQLiteDatabase } from "../db/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AccountStatus,
    AccountType,
    CurrencyAmount,
    CustomerId,
    CustomerWithAccounts,
} from "../models";
import { AccountService } from "../services/AccountService";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { usePagination } from "./usePagination";

import { useDatabaseContext, useStoreContext } from "../store";

export const useCustomersWithAccounts = (db: SQLiteDatabase | null) => {
    const { refreshVersions, invalidate } = useDatabaseContext();
    const { activeStoreId } = useStoreContext();
    const [customers, setCustomers] = useState<CustomerWithAccounts[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const { page, pageSize, offset, hasMore, markFetched, nextPage, resetPage } = usePagination({
        pageSize: 20,
    });

    const fetchGen = useRef(0);
    const isInitialFetchDone = useRef(false);

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
        async (targetPage: number, query: string, append: boolean) => {
            if (!customerService || !accountService || !activeStoreId) return;

            const gen = ++fetchGen.current;

            if (!append) {
                setLoading(true);
            }

            setError(null);
            try {
                const currentOffset = targetPage * pageSize;
                const customerData = query
                    ? await customerService.searchCustomers(
                          activeStoreId,
                          query,
                          pageSize,
                          currentOffset,
                      )
                    : await customerService.getAllCustomers(activeStoreId, pageSize, currentOffset);

                if (gen !== fetchGen.current) return;

                if (customerData.length < pageSize) {
                    markFetched(customerData.length);
                }

                const customersWithAccounts = await Promise.all(
                    customerData.map(async (customer) => {
                        const accounts =
                            await accountService.getAccountsByCustomerId(
                                customer.id!,
                                activeStoreId,
                            );
                        return { ...customer, accounts };
                    }),
                );

                if (gen !== fetchGen.current) return;

                setCustomers(prev =>
                    append ? [...prev, ...customersWithAccounts] : customersWithAccounts,
                );
            } catch (err) {
                if (gen === fetchGen.current) {
                    setError(err as Error);
                }
            } finally {
                if (gen === fetchGen.current) {
                    setLoading(false);
                    isInitialFetchDone.current = true;
                }
            }
        },
        [customerService, accountService, activeStoreId, pageSize, markFetched],
    );

    // Initial load + search query changes → page 0, replace
    useEffect(() => {
        resetPage();
        void fetchCustomersWithAccounts(0, searchQuery, false);
    }, [refreshVersions.customers, searchQuery, activeStoreId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Pagination: page increments via nextPage → append
    useEffect(() => {
        if (page > 0) {
            void fetchCustomersWithAccounts(page, searchQuery, true);
        }
    }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

    const createCustomer = useCallback(
        async (
            customer: Omit<
                CustomerWithAccounts,
                | "id"
                | "store_id"
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
            if (!customerService || !accountService || !activeStoreId) return undefined;

            setLoading(true);
            setError(null);
            try {
                const customerId =
                    await customerService.createCustomer(activeStoreId, customer);
                if (customerId) {
                    const initialBalance = options?.initialBalance || 0;
                    if (initialBalance > 0) {
                        await accountService.createAccountWithOpeningBalance(
                            activeStoreId,
                            {
                                customer_id: customerId,
                                account_number: `ACC-${Date.now()}`,
                                account_type: AccountType.CREDIT,
                                credit_limit: (options?.creditLimit ||
                                    0) as any,
                                current_balance: initialBalance as CurrencyAmount,
                                status: AccountStatus.ACTIVE,
                            },
                            initialBalance as CurrencyAmount,
                        );
                    } else {
                        await accountService.createAccount(
                            activeStoreId,
                            {
                                customer_id: customerId,
                                account_number: `ACC-${Date.now()}`,
                                account_type: AccountType.CREDIT,
                                credit_limit: (options?.creditLimit || 0) as any,
                                current_balance: 0 as CurrencyAmount,
                                status: AccountStatus.ACTIVE,
                            }
                        );
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
        [customerService, accountService, activeStoreId, invalidate],
    );

    const bulkDeleteCustomers = useCallback(
        async (ids: CustomerId[]) => {
            if (!customerService || !db || ids.length === 0) return;

            setLoading(true);
            setError(null);
            try {
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
        },
        [],
    );

    const refresh = useCallback(() => {
        resetPage();
        setSearchQuery("");
        invalidate("customers");
    }, [resetPage, invalidate]);

    return {
        customers,
        loading,
        error,
        searchQuery,
        page,
        pageSize,
        hasMore,
        nextPage,
        isInitialFetchDone,
        createCustomer,
        deleteCustomer,
        bulkDeleteCustomers,
        handleSearch,
        refresh,
    };
};
