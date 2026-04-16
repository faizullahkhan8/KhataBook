import * as SQLite from "expo-sqlite";
import { Transaction, TransactionType } from "../models/Transaction";

export class TransactionService {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    async createTransaction(
        transaction: Omit<Transaction, "id" | "created_at">,
    ): Promise<number> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const result = await this.db.runAsync(
                `INSERT INTO transactions (account_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)`,
                [
                    transaction.account_id,
                    transaction.type,
                    transaction.amount,
                    transaction.description || null,
                    transaction.reference || null,
                ],
            );

            // Update account balance
            const amountChange =
                transaction.type === "CREDIT"
                    ? transaction.amount
                    : -transaction.amount;
            await this.db.runAsync(
                "UPDATE accounts SET current_balance = current_balance + ?, updated_at = strftime('%s', 'now') WHERE id = ?",
                [amountChange, transaction.account_id],
            );

            return result.lastInsertRowId;
        } catch (error) {
            console.error("Error creating transaction:", error);
            throw error;
        }
    }

    async getTransactionById(id: number): Promise<Transaction | null> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const transaction = await this.db.getFirstAsync<Transaction>(
                "SELECT * FROM transactions WHERE id = ?",
                [id],
            );
            return transaction || null;
        } catch (error) {
            console.error("Error fetching transaction:", error);
            throw error;
        }
    }

    async getTransactionsByAccountId(
        accountId: number,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const transactions = await this.db.getAllAsync<Transaction>(
                "SELECT * FROM transactions WHERE account_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                [accountId, limit, offset],
            );
            return transactions;
        } catch (error) {
            console.error("Error fetching transactions by account:", error);
            throw error;
        }
    }

    async getAllTransactions(
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const transactions = await this.db.getAllAsync<Transaction>(
                "SELECT * FROM transactions ORDER BY created_at DESC LIMIT ? OFFSET ?",
                [limit, offset],
            );
            return transactions;
        } catch (error) {
            console.error("Error fetching transactions:", error);
            throw error;
        }
    }

    async getTransactionsByType(
        type: TransactionType,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const transactions = await this.db.getAllAsync<Transaction>(
                "SELECT * FROM transactions WHERE type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                [type, limit, offset],
            );
            return transactions;
        } catch (error) {
            console.error("Error fetching transactions by type:", error);
            throw error;
        }
    }

    async deleteTransaction(id: number): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const transaction = await this.getTransactionById(id);
            if (transaction) {
                // Revert account balance
                const amountChange =
                    transaction.type === "CREDIT"
                        ? -transaction.amount
                        : transaction.amount;
                await this.db.runAsync(
                    "UPDATE accounts SET current_balance = current_balance + ?, updated_at = strftime('%s', 'now') WHERE id = ?",
                    [amountChange, transaction.account_id],
                );
            }

            await this.db.runAsync("DELETE FROM transactions WHERE id = ?", [
                id,
            ]);
        } catch (error) {
            console.error("Error deleting transaction:", error);
            throw error;
        }
    }

    async deleteTransactionsByAccountId(accountId: number): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            await this.db.runAsync(
                "DELETE FROM transactions WHERE account_id = ?",
                [accountId],
            );
        } catch (error) {
            console.error("Error deleting transactions by account:", error);
            throw error;
        }
    }

    async getTransactionCount(): Promise<number> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const result = await this.db.getFirstAsync<{ count: number }>(
                "SELECT COUNT(*) as count FROM transactions",
            );
            return result?.count || 0;
        } catch (error) {
            console.error("Error getting transaction count:", error);
            throw error;
        }
    }

    async batchCreateTransactions(
        transactions: Omit<Transaction, "id" | "created_at">[],
    ): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            await this.db.withTransactionAsync(async () => {
                for (const transaction of transactions) {
                    await this.createTransaction(transaction);
                }
            });
        } catch (error) {
            console.error("Error creating batch transactions:", error);
            throw error;
        }
    }
}
