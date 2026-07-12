import { SQLiteDatabase } from "../db/types";
import { Account, AccountStatus } from "../models/Account";
import { AccountId, CustomerId, StoreId } from "../models/types";
import { logger } from "./LogService";

export class AccountService {
    private db: SQLiteDatabase;

    constructor(db: SQLiteDatabase) {
        this.db = db;
    }

    async createAccount(
        storeId: StoreId,
        account: Omit<Account, "id" | "store_id" | "created_at" | "updated_at">,
    ): Promise<AccountId> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const result = await this.db.runAsync(
                `INSERT INTO accounts (store_id, customer_id, account_number, account_type, credit_limit, current_balance, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    storeId,
                    account.customer_id,
                    account.account_number,
                    account.account_type,
                    account.credit_limit,
                    account.current_balance,
                    account.status,
                ],
            );
            return result.lastInsertRowId as AccountId;
        } catch (error) {
            void logger.error("customers", "Error creating account", error);
            throw error;
        }
    }

    /**
     * Create account with opening balance transaction
     * If initialBalance > 0, creates a DEBIT "Opening Balance" transaction
     * Wrapped in a SQLite transaction for data consistency
     */
    async createAccountWithOpeningBalance(
        storeId: StoreId,
        account: Omit<Account, "id" | "store_id" | "created_at" | "updated_at">,
        initialBalance: number = 0,
    ): Promise<AccountId> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const accountWithZeroBalance = {
                ...account,
                current_balance: 0 as Account["current_balance"],
            };

            if (!initialBalance || initialBalance === 0) {
                return this.createAccount(storeId, accountWithZeroBalance);
            }

            let accountId: AccountId | undefined;
            await this.db.withTransactionAsync(async () => {
                const result = await this.db.runAsync(
                    `INSERT INTO accounts (store_id, customer_id, account_number, account_type, credit_limit, current_balance, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        storeId,
                        accountWithZeroBalance.customer_id,
                        accountWithZeroBalance.account_number,
                        accountWithZeroBalance.account_type,
                        accountWithZeroBalance.credit_limit,
                        0,
                        accountWithZeroBalance.status,
                    ],
                );
                accountId = result.lastInsertRowId as AccountId;

                await this.db.runAsync(
                    `INSERT INTO transactions (store_id, account_id, type, amount, description, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        storeId,
                        accountId,
                        0,
                        initialBalance,
                        "Opening Balance",
                        "INIT",
                        Math.floor(Date.now() / 1000),
                    ],
                );
            });

            return accountId as AccountId;
        } catch (error) {
            void logger.error(
                "customers",
                "Error creating account with opening balance",
                error,
            );
            throw error;
        }
    }

    async getAccountById(id: AccountId, storeId?: StoreId): Promise<Account | null> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            let query = "SELECT * FROM accounts WHERE id = ?";
            const params: (string | number)[] = [id];
            if (storeId !== undefined) {
                query += " AND store_id = ?";
                params.push(storeId);
            }
            const account = await this.db.getFirstAsync<Account>(query, params);
            return account || null;
        } catch (error) {
            void logger.error("customers", "Error fetching account", error);
            throw error;
        }
    }

    async getAccountsByCustomerId(customerId: CustomerId, storeId?: StoreId): Promise<Account[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            let query = "SELECT * FROM accounts WHERE customer_id = ?";
            const params: (string | number)[] = [customerId];
            if (storeId !== undefined) {
                query += " AND store_id = ?";
                params.push(storeId);
            }
            query += " ORDER BY created_at DESC";
            
            const accounts = await this.db.getAllAsync<Account>(query, params);
            return accounts;
        } catch (error) {
            void logger.error(
                "customers",
                "Error fetching accounts by customer",
                error,
            );
            throw error;
        }
    }

    async getAllAccounts(
        storeId: StoreId,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Account[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const accounts = await this.db.getAllAsync<Account>(
                "SELECT * FROM accounts WHERE store_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                [storeId, limit, offset],
            );
            return accounts;
        } catch (error) {
            void logger.error("customers", "Error fetching accounts", error);
            throw error;
        }
    }

    async updateAccountBalance(
        accountId: AccountId,
        amount: number,
    ): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            await this.db.runAsync(
                "UPDATE accounts SET current_balance = current_balance + ?, updated_at = strftime('%s', 'now') WHERE id = ?",
                [amount, accountId],
            );
        } catch (error) {
            void logger.error(
                "transactions",
                "Error updating account balance",
                error,
            );
            throw error;
        }
    }

    async updateAccountStatus(
        accountId: AccountId,
        status: AccountStatus,
    ): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            await this.db.runAsync(
                "UPDATE accounts SET status = ?, updated_at = strftime('%s', 'now') WHERE id = ?",
                [status, accountId],
            );
            void logger.info("customers", "Account status updated", { accountId, status });
        } catch (error) {
            void logger.error("customers", "Error updating account status", error);
            throw error;
        }
    }

    async updateAccount(
        accountId: AccountId,
        account: Partial<Omit<Account, "id" | "created_at" | "updated_at">>,
    ): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const fields: string[] = [];
            const values: (string | number)[] = [];

            if (account.account_number !== undefined) {
                fields.push("account_number = ?");
                values.push(account.account_number);
            }
            if (account.account_type !== undefined) {
                fields.push("account_type = ?");
                values.push(account.account_type);
            }
            if (account.credit_limit !== undefined) {
                fields.push("credit_limit = ?");
                values.push(account.credit_limit);
            }
            if (account.current_balance !== undefined) {
                fields.push("current_balance = ?");
                values.push(account.current_balance);
            }
            if (account.status !== undefined) {
                fields.push("status = ?");
                values.push(account.status);
            }

            if (fields.length === 0) return;

            values.push(accountId);
            await this.db.runAsync(
                `UPDATE accounts SET ${fields.join(", ")}, updated_at = strftime('%s', 'now') WHERE id = ?`,
                values,
            );
            void logger.info("customers", "Account updated", { accountId });
        } catch (error) {
            void logger.error("customers", "Error updating account", error);
            throw error;
        }
    }

    async deleteAccount(id: AccountId): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            await this.db.runAsync("DELETE FROM accounts WHERE id = ?", [id]);
            void logger.info("customers", "Account deleted", { accountId: id });
        } catch (error) {
            void logger.error("customers", "Error deleting account", error);
            throw error;
        }
    }

    async getAccountCount(storeId: StoreId): Promise<number> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const result = await this.db.getFirstAsync<{ count: number }>(
                "SELECT COUNT(*) as count FROM accounts WHERE store_id = ?",
                [storeId]
            );
            return result?.count || 0;
        } catch (error) {
            void logger.error("customers", "Error getting account count", error);
            throw error;
        }
    }

    async getActiveAccounts(storeId: StoreId): Promise<Account[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const accounts = await this.db.getAllAsync<Account>(
                "SELECT * FROM accounts WHERE status = ? AND store_id = ? ORDER BY created_at DESC",
                [AccountStatus.ACTIVE, storeId],
            );
            return accounts;
        } catch (error) {
            void logger.error("customers", "Error fetching active accounts", error);
            throw error;
        }
    }
}
