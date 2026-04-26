import * as SQLite from "expo-sqlite";
import { Account, AccountStatus } from "../models/Account";
import { AccountId, CustomerId } from "../models/types";

export class AccountService {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    async createAccount(
        account: Omit<Account, "id" | "created_at" | "updated_at">,
    ): Promise<AccountId> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const result = await this.db.runAsync(
                `INSERT INTO accounts (customer_id, account_number, account_type, credit_limit, current_balance, status) VALUES (?, ?, ?, ?, ?, ?)`,
                [
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
            console.error("Error creating account:", error);
            throw error;
        }
    }

    async getAccountById(id: AccountId): Promise<Account | null> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const account = await this.db.getFirstAsync<Account>(
                "SELECT * FROM accounts WHERE id = ?",
                [id],
            );
            return account || null;
        } catch (error) {
            console.error("Error fetching account:", error);
            throw error;
        }
    }

    async getAccountsByCustomerId(customerId: CustomerId): Promise<Account[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const accounts = await this.db.getAllAsync<Account>(
                "SELECT * FROM accounts WHERE customer_id = ? ORDER BY created_at DESC",
                [customerId],
            );
            return accounts;
        } catch (error) {
            console.error("Error fetching accounts by customer:", error);
            throw error;
        }
    }

    async getAllAccounts(
        limit: number = 50,
        offset: number = 0,
    ): Promise<Account[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const accounts = await this.db.getAllAsync<Account>(
                "SELECT * FROM accounts ORDER BY created_at DESC LIMIT ? OFFSET ?",
                [limit, offset],
            );
            return accounts;
        } catch (error) {
            console.error("Error fetching accounts:", error);
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
            // Note: Customer summary updates are handled by triggers on current_balance update
            await this.db.runAsync(
                "UPDATE accounts SET current_balance = current_balance + ?, updated_at = strftime('%s', 'now') WHERE id = ?",
                [amount, accountId],
            );
        } catch (error) {
            console.error("Error updating account balance:", error);
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
        } catch (error) {
            console.error("Error updating account status:", error);
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
        } catch (error) {
            console.error("Error updating account:", error);
            throw error;
        }
    }

    async deleteAccount(id: AccountId): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            await this.db.runAsync("DELETE FROM accounts WHERE id = ?", [id]);
        } catch (error) {
            console.error("Error deleting account:", error);
            throw error;
        }
    }

    async getAccountCount(): Promise<number> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const result = await this.db.getFirstAsync<{ count: number }>(
                "SELECT COUNT(*) as count FROM accounts",
            );
            return result?.count || 0;
        } catch (error) {
            console.error("Error getting account count:", error);
            throw error;
        }
    }

    async getActiveAccounts(): Promise<Account[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const accounts = await this.db.getAllAsync<Account>(
                "SELECT * FROM accounts WHERE status = ? ORDER BY created_at DESC",
                [AccountStatus.ACTIVE],
            );
            return accounts;
        } catch (error) {
            console.error("Error fetching active accounts:", error);
            throw error;
        }
    }
}
