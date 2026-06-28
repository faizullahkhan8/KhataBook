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
                `INSERT INTO transactions (account_id, type, amount, description, reference, image_uri, voice_uri) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    transaction.account_id,
                    transaction.type,
                    transaction.amount,
                    transaction.description || null,
                    transaction.reference || null,
                    transaction.image_uri || null,
                    transaction.voice_uri || null,
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
                `INSERT INTO transactions (account_id, type, amount, description, reference, image_uri, voice_uri, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    transaction.account_id,
                    transaction.type,
                    transaction.amount,
                    transaction.description || null,
                    transaction.reference || null,
                    transaction.image_uri || null,
                    transaction.voice_uri || null,
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
                "SELECT * FROM transactions WHERE account_id = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?",
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
                "SELECT * FROM transactions WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?",
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
            // Manually revert the balance (mirrors what trig_trans_delete_balance does on hard DELETE)
            await this.db.withTransactionAsync(async () => {
                const tx = await this.db.getFirstAsync<{ account_id: number; type: number; amount: number }>(
                    "SELECT account_id, type, amount FROM transactions WHERE id = ? AND is_deleted = 0",
                    [id],
                );
                if (!tx) return; // already deleted or not found
                // Revert: undo DEBIT additions (type=0) and CREDIT subtractions (type=1)
                const delta = tx.type === 0 ? -tx.amount : tx.amount;
                await this.db.runAsync(
                    "UPDATE accounts SET current_balance = current_balance + ?, updated_at = strftime('%s', 'now') WHERE id = ?",
                    [delta, tx.account_id],
                );
                await this.db.runAsync(
                    "UPDATE transactions SET is_deleted = 1, deleted_at = strftime('%s', 'now') WHERE id = ?",
                    [id],
                );
            });
            void logger.info("transactions", "Transaction soft-deleted (moved to trash)", { transactionId: id });
        } catch (error) {
            void logger.error("transactions", "Error soft-deleting transaction", error);
            throw error;
        }
    }

    async updateTransaction(
        id: TransactionId,
        updates: Partial<Omit<Transaction, "id" | "created_at">>,
    ): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const fields: string[] = [];
            const values: (string | number | null)[] = [];

            if (updates.account_id !== undefined) {
                fields.push("account_id = ?");
                values.push(updates.account_id);
            }
            if (updates.type !== undefined) {
                fields.push("type = ?");
                values.push(updates.type);
            }
            if (updates.amount !== undefined) {
                fields.push("amount = ?");
                values.push(updates.amount);
            }
            if (updates.description !== undefined) {
                fields.push("description = ?");
                values.push(updates.description || null);
            }
            if (updates.reference !== undefined) {
                fields.push("reference = ?");
                values.push(updates.reference || null);
            }
            if (updates.image_uri !== undefined) {
                fields.push("image_uri = ?");
                values.push(updates.image_uri || null);
            }
            if (updates.voice_uri !== undefined) {
                fields.push("voice_uri = ?");
                values.push(updates.voice_uri || null);
            }

            if (fields.length === 0) return;

            values.push(id);
            await this.db.runAsync(
                `UPDATE transactions SET ${fields.join(", ")} WHERE id = ?`,
                values,
            );
            void logger.info("transactions", "Transaction updated", { transactionId: id });
        } catch (error) {
            void logger.error("transactions", "Error updating transaction", error);
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
                "SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 0",
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
                    `INSERT INTO transactions (account_id, type, amount, description, reference, image_uri, voice_uri) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                );
                try {
                    for (const transaction of transactions) {
                        await statement.executeAsync([
                            transaction.account_id,
                            transaction.type,
                            transaction.amount,
                            transaction.description || null,
                            transaction.reference || null,
                            transaction.image_uri || null,
                            transaction.voice_uri || null,
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
