import { SQLiteDatabase } from "../db/types";
import { Transaction, TransactionType } from "../models/Transaction";
import { AccountId, TransactionId } from "../models/types";
import { logger } from "./LogService";

export class TransactionService {
    private db: SQLiteDatabase;

    constructor(db: SQLiteDatabase) {
        this.db = db;
    }

    async createTransaction(
        transaction: Omit<Transaction, "id" | "created_at">,
    ): Promise<TransactionId> {
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

            const transactionId = result.lastInsertRowId as TransactionId;
            void logger.info("transactions", "Transaction created", {
                transactionId,
                type: transaction.type,
                amount: transaction.amount,
            });
            return transactionId;
        } catch (error) {
            void logger.error("transactions", "Error creating transaction", error);
            throw error;
        }
    }

    /**
     * Create a transaction with explicit created_at timestamp
     * Used for opening balance transactions or data migration
     */
    async createTransactionWithTimestamp(
        transaction: Omit<Transaction, "id">,
    ): Promise<TransactionId> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const result = await this.db.runAsync(
                `INSERT INTO transactions (account_id, type, amount, description, reference, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    transaction.account_id,
                    transaction.type,
                    transaction.amount,
                    transaction.description || null,
                    transaction.reference || null,
                    transaction.created_at || Math.floor(Date.now() / 1000),
                ],
            );

            const transactionId = result.lastInsertRowId as TransactionId;
            void logger.info("transactions", "Transaction created with timestamp", {
                transactionId,
                type: transaction.type,
                amount: transaction.amount,
            });
            return transactionId;
        } catch (error) {
            void logger.error(
                "transactions",
                "Error creating transaction with timestamp",
                error,
            );
            throw error;
        }
    }

    async getTransactionById(id: TransactionId): Promise<Transaction | null> {
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
            void logger.error("transactions", "Error fetching transaction", error);
            throw error;
        }
    }

    async getTransactionsByAccountId(
        accountId: AccountId,
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
            void logger.error(
                "transactions",
                "Error fetching transactions by account",
                error,
            );
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
            void logger.error("transactions", "Error fetching transactions", error);
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
            void logger.error(
                "transactions",
                "Error fetching transactions by type",
                error,
            );
            throw error;
        }
    }

    async deleteTransaction(id: TransactionId): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            await this.db.runAsync("DELETE FROM transactions WHERE id = ?", [
                id,
            ]);
            void logger.info("transactions", "Transaction deleted", { transactionId: id });
        } catch (error) {
            void logger.error("transactions", "Error deleting transaction", error);
            throw error;
        }
    }

    async deleteTransactionsByAccountId(accountId: AccountId): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            await this.db.runAsync(
                "DELETE FROM transactions WHERE account_id = ?",
                [accountId],
            );
        } catch (error) {
            void logger.error(
                "transactions",
                "Error deleting transactions by account",
                error,
            );
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
            void logger.error(
                "transactions",
                "Error getting transaction count",
                error,
            );
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
                const statement = await this.db.prepareAsync(
                    `INSERT INTO transactions (account_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)`,
                );
                try {
                    for (const transaction of transactions) {
                        await statement.executeAsync([
                            transaction.account_id,
                            transaction.type,
                            transaction.amount,
                            transaction.description || null,
                            transaction.reference || null,
                        ]);
                    }
                } finally {
                    await statement.finalizeAsync();
                }
            });
            void logger.info("transactions", "Batch transactions created", { count: transactions.length });
        } catch (error) {
            void logger.error(
                "transactions",
                "Error creating batch transactions",
                error,
            );
            throw error;
        }
    }
}
