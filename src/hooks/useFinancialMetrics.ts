import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { fromInteger } from "../utils/currencyUtils";
import { useDatabaseContext } from "../store";

export interface FinancialMetrics {
    totalCredits: number;
    totalDebits: number;
    totalCreditLimit: number;
    totalCurrentBalance: number;
    activeAccounts: number;
    inactiveAccounts: number;
    suspendedAccounts: number;
    closedAccounts: number;
    totalCustomers: number;
    totalAccounts: number;
    totalTransactions: number;
}

export const useFinancialMetrics = (db: SQLite.SQLiteDatabase | null) => {
    const { refreshVersions } = useDatabaseContext();
    const [metrics, setMetrics] = useState<FinancialMetrics>({
        totalCredits: 0,
        totalDebits: 0,
        totalCreditLimit: 0,
        totalCurrentBalance: 0,
        activeAccounts: 0,
        inactiveAccounts: 0,
        suspendedAccounts: 0,
        closedAccounts: 0,
        totalCustomers: 0,
        totalAccounts: 0,
        totalTransactions: 0,
    });
    const [loading, setLoading] = useState(false);

    const fetchMetrics = useCallback(async () => {
        if (!db) return;

        setLoading(true);
        try {
            // Fetch transaction totals (0: DEBIT, 1: CREDIT)
            const transResult = await db.getFirstAsync<{ credits: number; debits: number }>(
                `SELECT 
                    SUM(CASE WHEN type = 1 THEN amount ELSE 0 END) as credits,
                    SUM(CASE WHEN type = 0 THEN amount ELSE 0 END) as debits
                 FROM transactions`
            );

            // Fetch account totals and statuses (0: ACTIVE, 1: INACTIVE, 2: SUSPENDED, 3: CLOSED)
            const accountResult = await db.getFirstAsync<{
                totalLimit: number;
                totalBalance: number;
                active: number;
                inactive: number;
                suspended: number;
                closed: number;
                totalAcc: number;
            }>(
                `SELECT 
                    SUM(credit_limit) as totalLimit,
                    SUM(current_balance) as totalBalance,
                    COUNT(CASE WHEN status = 0 THEN 1 END) as active,
                    COUNT(CASE WHEN status = 1 THEN 1 END) as inactive,
                    COUNT(CASE WHEN status = 2 THEN 1 END) as suspended,
                    COUNT(CASE WHEN status = 3 THEN 1 END) as closed,
                    COUNT(*) as totalAcc
                 FROM accounts`
            );

            // Fetch total customers
            const customerResult = await db.getFirstAsync<{ totalCust: number }>(
                "SELECT COUNT(*) as totalCust FROM customers"
            );

            // Fetch total transactions count
            const transCountResult = await db.getFirstAsync<{ totalTrans: number }>(
                "SELECT COUNT(*) as totalTrans FROM transactions"
            );

            setMetrics({
                totalCredits: transResult?.credits || 0,
                totalDebits: transResult?.debits || 0,
                totalCreditLimit: accountResult?.totalLimit || 0,
                totalCurrentBalance: accountResult?.totalBalance || 0,
                activeAccounts: accountResult?.active || 0,
                inactiveAccounts: accountResult?.inactive || 0,
                suspendedAccounts: accountResult?.suspended || 0,
                closedAccounts: accountResult?.closed || 0,
                totalCustomers: customerResult?.totalCust || 0,
                totalAccounts: accountResult?.totalAcc || 0,
                totalTransactions: transCountResult?.totalTrans || 0,
            });
        } catch (error) {
            console.error("Error fetching financial metrics:", error);
        } finally {
            setLoading(false);
        }
    }, [db]);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics, refreshVersions.all]);

    return { metrics, loading, refresh: fetchMetrics };
};
