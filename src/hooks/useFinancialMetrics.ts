import { SQLiteDatabase } from "../db/types";
import { useCallback, useEffect, useState } from "react";
import { useDatabaseContext, useStoreContext } from "../store";
import { logger } from "../services/LogService";

export interface FinancialMetrics {
    totalCredits: number;
    totalDebits: number;
    totalCreditLimit: number;
    totalCurrentBalance: number;
    receivableBalance: number;
    payableBalance: number;
    availableCredit: number;
    creditUtilizationRate: number;
    collectionRate: number;
    averageTransactionAmount: number;
    netBalanceMovement: number;
    highUtilizationAccounts: number;
    dormantCustomers: number;
    topReceivableCustomerName: string;
    topReceivableAmount: number;
    topPayableCustomerName: string;
    topPayableAmount: number;
    mostActiveCustomerName: string;
    mostActiveCustomerTransactions: number;
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
    db: SQLiteDatabase | null,
    dateRange?: DateRange | null,
) => {
    const { refreshVersions } = useDatabaseContext();
    const { activeStoreId } = useStoreContext();
    const [metrics, setMetrics] = useState<FinancialMetrics>({
        totalCredits: 0,
        totalDebits: 0,
        totalCreditLimit: 0,
        totalCurrentBalance: 0,
        receivableBalance: 0,
        payableBalance: 0,
        availableCredit: 0,
        creditUtilizationRate: 0,
        collectionRate: 0,
        averageTransactionAmount: 0,
        netBalanceMovement: 0,
        highUtilizationAccounts: 0,
        dormantCustomers: 0,
        topReceivableCustomerName: "",
        topReceivableAmount: 0,
        topPayableCustomerName: "",
        topPayableAmount: 0,
        mostActiveCustomerName: "",
        mostActiveCustomerTransactions: 0,
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
        if (!db || !activeStoreId) return;

        setLoading(true);
        try {
            let transactionWhereClause = "WHERE t.store_id = ?";
            const queryParams: (string | number)[] = [activeStoreId];

            if (dateRange) {
                const startTimestamp = toUnixTimestamp(dateRange.startDate);
                const endTimestamp = toUnixTimestamp(dateRange.endDate);
                // Add 86400 seconds (1 day) to include the full end date
                const endTimestampInclusive = endTimestamp + 86399;
                transactionWhereClause +=
                    " AND t.created_at >= ? AND t.created_at <= ?";
                queryParams.push(startTimestamp, endTimestampInclusive);
            }

            // Fetch transaction totals with optional date filter
            const transQuery = `
                SELECT 
                    SUM(CASE WHEN type = 1 THEN amount ELSE 0 END) as credits,
                    SUM(CASE WHEN type = 0 THEN amount ELSE 0 END) as debits
                 FROM transactions t
                 ${transactionWhereClause} AND t.is_deleted = 0
            `;
            const transResult = await db.getFirstAsync<{
                credits: number;
                debits: number;
            }>(transQuery, queryParams);

            // Fetch transaction count with optional date filter
            const transCountQuery = `
                SELECT COUNT(*) as totalTrans 
                FROM transactions t
                ${transactionWhereClause} AND t.is_deleted = 0
            `;
            const transCountResult = await db.getFirstAsync<{
                totalTrans: number;
            }>(transCountQuery, queryParams);

            // Account stats are not date-dependent (they're current state)
            const accountResult = await db.getFirstAsync<{
                totalLimit: number;
                totalBalance: number;
                receivable: number;
                payable: number;
                highUtilization: number;
                active: number;
                inactive: number;
                suspended: number;
                closed: number;
                totalAcc: number;
            }>(
                `SELECT 
                    SUM(credit_limit) as totalLimit,
                    SUM(current_balance) as totalBalance,
                    SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END) as receivable,
                    SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END) as payable,
                    COUNT(CASE WHEN credit_limit > 0 AND current_balance >= credit_limit * 0.8 THEN 1 END) as highUtilization,
                    COUNT(CASE WHEN status = 0 THEN 1 END) as active,
                    COUNT(CASE WHEN status = 1 THEN 1 END) as inactive,
                    COUNT(CASE WHEN status = 2 THEN 1 END) as suspended,
                    COUNT(CASE WHEN status = 3 THEN 1 END) as closed,
                    COUNT(*) as totalAcc
                 FROM accounts WHERE store_id = ?`,
                 [activeStoreId]
            );

            // Fetch total customers
            const customerResult = await db.getFirstAsync<{
                totalCust: number;
            }>("SELECT COUNT(*) as totalCust FROM customers WHERE store_id = ? AND is_deleted = 0", [activeStoreId]);

            const dormantCutoff = Math.floor(Date.now() / 1000) - 30 * 86400;
            const dormantResult = await db.getFirstAsync<{
                dormant: number;
            }>(
                "SELECT COUNT(*) as dormant FROM customers WHERE store_id = ? AND is_deleted = 0 AND (last_transaction_at IS NULL OR last_transaction_at < ?)",
                [activeStoreId, dormantCutoff],
            );

            const topReceivableResult = await db.getFirstAsync<{
                name: string;
                amount: number;
            }>(
                `SELECT c.name, a.current_balance as amount
                 FROM accounts a
                 JOIN customers c ON c.id = a.customer_id
                 WHERE a.store_id = ? AND a.current_balance > 0 AND c.is_deleted = 0
                 ORDER BY a.current_balance DESC
                 LIMIT 1`,
                 [activeStoreId]
            );

            const topPayableResult = await db.getFirstAsync<{
                name: string;
                amount: number;
            }>(
                `SELECT c.name, ABS(a.current_balance) as amount
                 FROM accounts a
                 JOIN customers c ON c.id = a.customer_id
                 WHERE a.store_id = ? AND a.current_balance < 0 AND c.is_deleted = 0
                 ORDER BY ABS(a.current_balance) DESC
                 LIMIT 1`,
                 [activeStoreId]
            );

            const activityWhereClause = "WHERE t.store_id = ? AND t.is_deleted = 0";
            const activityParams: (string | number)[] = [activeStoreId];
            if (dateRange) {
                const startTimestamp = toUnixTimestamp(dateRange.startDate);
                const endTimestamp = toUnixTimestamp(dateRange.endDate);
                const endTimestampInclusive = endTimestamp + 86399;
                activityParams.push(startTimestamp, endTimestampInclusive);
            }

            const mostActiveResult = await db.getFirstAsync<{
                name: string;
                transactionCount: number;
            }>(
                `SELECT c.name, COUNT(t.id) as transactionCount
                 FROM transactions t
                 JOIN accounts a ON a.id = t.account_id
                 JOIN customers c ON c.id = a.customer_id
                 ${activityWhereClause} ${dateRange ? " AND t.created_at >= ? AND t.created_at <= ?" : ""}
                 GROUP BY c.id, c.name
                 ORDER BY transactionCount DESC
                 LIMIT 1`,
                activityParams,
            );

            const totalCredits = transResult?.credits || 0;
            const totalDebits = transResult?.debits || 0;
            const totalCreditLimit = accountResult?.totalLimit || 0;
            const receivableBalance = accountResult?.receivable || 0;
            const payableBalance = accountResult?.payable || 0;
            const totalTransactions = transCountResult?.totalTrans || 0;
            const transactionVolume = totalCredits + totalDebits;

            setMetrics({
                totalCredits,
                totalDebits,
                totalCreditLimit,
                totalCurrentBalance: accountResult?.totalBalance || 0,
                receivableBalance,
                payableBalance,
                availableCredit: Math.max(
                    totalCreditLimit - receivableBalance,
                    0,
                ),
                creditUtilizationRate:
                    totalCreditLimit > 0
                        ? Math.round(
                              (receivableBalance / totalCreditLimit) * 100,
                          )
                        : 0,
                collectionRate:
                    totalDebits > 0
                        ? Math.round((totalCredits / totalDebits) * 100)
                        : 0,
                averageTransactionAmount:
                    totalTransactions > 0
                        ? Math.round(transactionVolume / totalTransactions)
                        : 0,
                netBalanceMovement: totalDebits - totalCredits,
                highUtilizationAccounts: accountResult?.highUtilization || 0,
                dormantCustomers: dormantResult?.dormant || 0,
                topReceivableCustomerName: topReceivableResult?.name || "",
                topReceivableAmount: topReceivableResult?.amount || 0,
                topPayableCustomerName: topPayableResult?.name || "",
                topPayableAmount: topPayableResult?.amount || 0,
                mostActiveCustomerName: mostActiveResult?.name || "",
                mostActiveCustomerTransactions:
                    mostActiveResult?.transactionCount || 0,
                activeAccounts: accountResult?.active || 0,
                inactiveAccounts: accountResult?.inactive || 0,
                suspendedAccounts: accountResult?.suspended || 0,
                closedAccounts: accountResult?.closed || 0,
                totalCustomers: customerResult?.totalCust || 0,
                totalAccounts: accountResult?.totalAcc || 0,
                totalTransactions,
            });
        } catch (error) {
            void logger.error(
                "transactions",
                "Error fetching financial metrics",
                error,
            );
        } finally {
            setLoading(false);
        }
    }, [db, dateRange, activeStoreId]);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics, refreshVersions.all, activeStoreId]);

    return { metrics, loading, refresh: fetchMetrics };
};
