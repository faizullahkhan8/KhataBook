import { SQLiteDatabase } from "../db/types";
import { CustomerId, TransactionId } from "../models/types";
import { logger } from "./LogService";

export interface TrashedCustomer {
    id: CustomerId;
    name: string;
    phone: string;
    image_uri?: string;
    deleted_at: number;
}

export interface TrashedTransaction {
    id: TransactionId;
    account_id: number;
    type: number;
    amount: number;
    description?: string;
    created_at: number;
    deleted_at: number;
    customer_name: string;
    account_number: string;
}

export interface TrashCount {
    customers: number;
    transactions: number;
}

export class TrashService {
    private db: SQLiteDatabase;

    constructor(db: SQLiteDatabase) {
        this.db = db;
    }

    // ── Fetching ──────────────────────────────────────────────

    async getDeletedCustomers(): Promise<TrashedCustomer[]> {
        try {
            return await this.db.getAllAsync<TrashedCustomer>(
                `SELECT id, name, phone, image_uri, deleted_at
                 FROM customers
                 WHERE is_deleted = 1
                 ORDER BY deleted_at DESC`,
            );
        } catch (error) {
            void logger.error("trash", "Error fetching deleted customers", error);
            throw error;
        }
    }

    async getDeletedTransactions(): Promise<TrashedTransaction[]> {
        try {
            return await this.db.getAllAsync<TrashedTransaction>(
                `SELECT t.id, t.account_id, t.type, t.amount, t.description,
                        t.created_at, t.deleted_at,
                        c.name AS customer_name,
                        a.account_number
                 FROM transactions t
                 JOIN accounts a ON a.id = t.account_id
                 JOIN customers c ON c.id = a.customer_id
                 WHERE t.is_deleted = 1
                 ORDER BY t.deleted_at DESC`,
            );
        } catch (error) {
            void logger.error("trash", "Error fetching deleted transactions", error);
            throw error;
        }
    }

    async getTrashCount(): Promise<TrashCount> {
        try {
            const cResult = await this.db.getFirstAsync<{ count: number }>(
                "SELECT COUNT(*) as count FROM customers WHERE is_deleted = 1",
            );
            const tResult = await this.db.getFirstAsync<{ count: number }>(
                "SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 1",
            );
            return {
                customers: cResult?.count ?? 0,
                transactions: tResult?.count ?? 0,
            };
        } catch (error) {
            void logger.error("trash", "Error getting trash count", error);
            throw error;
        }
    }

    // ── Restore ───────────────────────────────────────────────

    async restoreCustomers(ids: CustomerId[]): Promise<void> {
        if (ids.length === 0) return;
        try {
            const placeholders = ids.map(() => "?").join(", ");
            await this.db.runAsync(
                `UPDATE customers SET is_deleted = 0, deleted_at = NULL WHERE id IN (${placeholders})`,
                ids,
            );
            void logger.info("trash", "Customers restored", { count: ids.length });
        } catch (error) {
            void logger.error("trash", "Error restoring customers", error);
            throw error;
        }
    }

    async restoreTransactions(ids: TransactionId[]): Promise<void> {
        if (ids.length === 0) return;
        try {
            await this.db.withTransactionAsync(async () => {
                for (const id of ids) {
                    const tx = await this.db.getFirstAsync<{
                        account_id: number;
                        type: number;
                        amount: number;
                    }>(
                        "SELECT account_id, type, amount FROM transactions WHERE id = ? AND is_deleted = 1",
                        [id],
                    );
                    if (!tx) continue;
                    // Re-apply the transaction effect: DEBIT (type=0) adds, CREDIT (type=1) subtracts
                    const delta = tx.type === 0 ? tx.amount : -tx.amount;
                    await this.db.runAsync(
                        "UPDATE accounts SET current_balance = current_balance + ?, updated_at = strftime('%s', 'now') WHERE id = ?",
                        [delta, tx.account_id],
                    );
                    await this.db.runAsync(
                        "UPDATE transactions SET is_deleted = 0, deleted_at = NULL WHERE id = ?",
                        [id],
                    );
                }
            });
            void logger.info("trash", "Transactions restored", { count: ids.length });
        } catch (error) {
            void logger.error("trash", "Error restoring transactions", error);
            throw error;
        }
    }

    // ── Permanent Delete ──────────────────────────────────────

    async permanentDeleteCustomers(ids: CustomerId[]): Promise<void> {
        if (ids.length === 0) return;
        try {
            const placeholders = ids.map(() => "?").join(", ");
            await this.db.runAsync(
                `DELETE FROM customers WHERE id IN (${placeholders}) AND is_deleted = 1`,
                ids,
            );
            void logger.info("trash", "Customers permanently deleted", { count: ids.length });
        } catch (error) {
            void logger.error("trash", "Error permanently deleting customers", error);
            throw error;
        }
    }

    async permanentDeleteTransactions(ids: TransactionId[]): Promise<void> {
        if (ids.length === 0) return;
        try {
            const placeholders = ids.map(() => "?").join(", ");
            // The trig_trans_delete_balance trigger won't fire because the balance was already
            // reverted when the transaction was soft-deleted. Hard DELETE is safe here.
            await this.db.runAsync(
                `DELETE FROM transactions WHERE id IN (${placeholders}) AND is_deleted = 1`,
                ids,
            );
            void logger.info("trash", "Transactions permanently deleted", { count: ids.length });
        } catch (error) {
            void logger.error("trash", "Error permanently deleting transactions", error);
            throw error;
        }
    }

    async emptyTrash(): Promise<void> {
        try {
            await this.db.withTransactionAsync(async () => {
                await this.db.runAsync(
                    "DELETE FROM customers WHERE is_deleted = 1",
                );
                await this.db.runAsync(
                    "DELETE FROM transactions WHERE is_deleted = 1",
                );
            });
            void logger.info("trash", "Trash emptied");
        } catch (error) {
            void logger.error("trash", "Error emptying trash", error);
            throw error;
        }
    }
}
