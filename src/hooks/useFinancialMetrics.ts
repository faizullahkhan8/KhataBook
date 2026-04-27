import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
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

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export const useFinancialMetrics = (
    db: SQLite.SQLiteDatabase | null,
    dateRange?: DateRange | null,
) => {
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

    const toUnixTimestamp = (date: Date): number => {
        return Math.floor(date.getTime() / 1000);
    };

    const fetchMetrics = useCallback(async () => {
        if (!db) return;

        setLoading(true);
        try {
            let transactionWhereClause = "";
            const queryParams: (string | number)[] = [];

            if (dateRange) {
                const startTimestamp = toUnixTimestamp(dateRange.startDate);
                const endTimestamp = toUnixTimestamp(dateRange.endDate);
                // Add 86400 seconds (1 day) to include the full end date
                const endTimestampInclusive = endTimestamp + 86399;
                transactionWhereClause =
                    "WHERE t.created_at >= ? AND t.created_at <= ?";
                queryParams.push(startTimestamp, endTimestampInclusive);
            }

            // Fetch transaction totals with optional date filter
            const transQuery = `
                SELECT 
                    SUM(CASE WHEN type = 1 THEN amount ELSE 0 END) as credits,
                    SUM(CASE WHEN type = 0 THEN amount ELSE 0 END) as debits
                 FROM transactions t
                 ${transactionWhereClause}
            `;
            const transResult = await db.getFirstAsync<{
                credits: number;
                debits: number;
            }>(transQuery, dateRange ? queryParams : []);

            // Fetch transaction count with optional date filter
            const transCountQuery = `
                SELECT COUNT(*) as totalTrans 
                FROM transactions t
                ${transactionWhereClause}
            `;
            const transCountResult = await db.getFirstAsync<{
                totalTrans: number;
            }>(transCountQuery, dateRange ? queryParams : []);

            console.log(
                "Date range filter:",
                dateRange,
                "Query params:",
                queryParams,
            );
            console.log("Transaction count result:", transCountResult);

            // Account stats are not date-dependent (they're current state)
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
                 FROM accounts`,
            );

            // Fetch total customers
            const customerResult = await db.getFirstAsync<{
                totalCust: number;
            }>("SELECT COUNT(*) as totalCust FROM customers");

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
    }, [db, dateRange]);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics, refreshVersions.all]);

    return { metrics, loading, refresh: fetchMetrics };
};
