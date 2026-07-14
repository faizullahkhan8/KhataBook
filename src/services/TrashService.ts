import { SQLiteDatabase } from "expo-sqlite";
import { CustomerId, StoreId, TransactionId } from "../models/types";
import { deleteFromStorage } from "../utils/fileUtils";
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

    async getDeletedCustomers(storeId: StoreId): Promise<TrashedCustomer[]> {
        try {
            return await this.db.getAllAsync<TrashedCustomer>(
                `SELECT id, name, phone, image_uri, deleted_at 
                 FROM customers 
                 WHERE is_deleted = 1 AND store_id = ? 
                 ORDER BY deleted_at DESC`,
                [storeId],
            );
        } catch (error) {
            void logger.error(
                "trash",
                "Error fetching deleted customers",
                error,
            );
            throw error;
        }
    }

    async getDeletedTransactions(
        storeId: StoreId,
    ): Promise<TrashedTransaction[]> {
        try {
            return await this.db.getAllAsync<TrashedTransaction>(
                `SELECT t.id, t.account_id, t.type, t.amount, t.description,
                        t.created_at, t.deleted_at,
                        c.name AS customer_name,
                        a.account_number
                 FROM transactions t
                 JOIN accounts a ON a.id = t.account_id
                 JOIN customers c ON c.id = a.customer_id
                 WHERE t.is_deleted = 1 AND t.store_id = ?
                 ORDER BY t.deleted_at DESC`,
                [storeId],
            );
        } catch (error) {
            void logger.error(
                "trash",
                "Error fetching deleted transactions",
                error,
            );
            throw error;
        }
    }

    async getTrashCount(storeId: StoreId): Promise<TrashCount> {
        try {
            const cResult = await this.db.getFirstAsync<{ count: number }>(
                "SELECT COUNT(*) as count FROM customers WHERE is_deleted = 1 AND store_id = ?",
                [storeId],
            );
            const tResult = await this.db.getFirstAsync<{ count: number }>(
                "SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 1 AND store_id = ?",
                [storeId],
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

    async restoreCustomers(ids: CustomerId[]): Promise<void> {
        if (ids.length === 0) return;
        try {
            const placeholders = ids.map(() => "?").join(", ");
            await this.db.runAsync(
                `UPDATE customers SET is_deleted = 0, deleted_at = NULL WHERE id IN (${placeholders})`,
                ids,
            );
            void logger.info("trash", "Customers restored", {
                count: ids.length,
            });
        } catch (error) {
            void logger.error("trash", "Error restoring customers", error);
            throw error;
        }
    }

    async restoreTransactions(ids: TransactionId[]): Promise<void> {
        if (ids.length === 0) return;
        try {
            await this.db.withTransactionAsync(async () => {
                const selectStmt = await this.db.prepareAsync(
                    "SELECT account_id, type, amount FROM transactions WHERE id = ? AND is_deleted = 1",
                );
                const updateAccountStmt = await this.db.prepareAsync(
                    "UPDATE accounts SET current_balance = current_balance + ?, updated_at = strftime('%s', 'now') WHERE id = ?",
                );
                const updateTxStmt = await this.db.prepareAsync(
                    "UPDATE transactions SET is_deleted = 0, deleted_at = NULL WHERE id = ?",
                );

                try {
                    for (const id of ids) {
                        const tx = await selectStmt.executeAsync<{
                            account_id: number;
                            type: number;
                            amount: number;
                        }>([id]);
                        const row = await tx.getFirstAsync();
                        if (!row) continue;

                        const delta = row.type === 0 ? row.amount : -row.amount;
                        await updateAccountStmt.executeAsync([
                            delta,
                            row.account_id,
                        ]);
                        await updateTxStmt.executeAsync([id]);
                    }
                } finally {
                    await Promise.all([
                        selectStmt.finalizeAsync(),
                        updateAccountStmt.finalizeAsync(),
                        updateTxStmt.finalizeAsync(),
                    ]);
                }
            });
            void logger.info("trash", "Transactions restored", {
                count: ids.length,
            });
        } catch (error) {
            void logger.error("trash", "Error restoring transactions", error);
            throw error;
        }
    }

    async permanentDeleteCustomers(ids: CustomerId[]): Promise<void> {
        if (ids.length === 0) return;
        try {
            const placeholders = ids.map(() => "?").join(", ");
            const rows = await this.db.getAllAsync<{
                image_uri: string | null;
            }>(
                `SELECT image_uri FROM customers WHERE id IN (${placeholders}) AND is_deleted = 1`,
                ids,
            );
            await this.db.runAsync(
                `DELETE FROM customers WHERE id IN (${placeholders}) AND is_deleted = 1`,
                ids,
            );
            for (const row of rows) {
                if (row.image_uri) await deleteFromStorage(row.image_uri);
            }
            void logger.info("trash", "Customers permanently deleted", {
                count: ids.length,
            });
        } catch (error) {
            void logger.error(
                "trash",
                "Error permanently deleting customers",
                error,
            );
            throw error;
        }
    }

    async permanentDeleteTransactions(ids: TransactionId[]): Promise<void> {
        if (ids.length === 0) return;
        try {
            const placeholders = ids.map(() => "?").join(", ");
            const rows = await this.db.getAllAsync<{
                image_uri: string | null;
                voice_uri: string | null;
            }>(
                `SELECT image_uri, voice_uri FROM transactions WHERE id IN (${placeholders}) AND is_deleted = 1`,
                ids,
            );
            await this.db.runAsync(
                `DELETE FROM transactions WHERE id IN (${placeholders}) AND is_deleted = 1`,
                ids,
            );
            for (const row of rows) {
                if (row.image_uri) await deleteFromStorage(row.image_uri);
                if (row.voice_uri) await deleteFromStorage(row.voice_uri);
            }
            void logger.info("trash", "Transactions permanently deleted", {
                count: ids.length,
            });
        } catch (error) {
            void logger.error(
                "trash",
                "Error permanently deleting transactions",
                error,
            );
            throw error;
        }
    }

    async emptyTrash(storeId: StoreId): Promise<void> {
        try {
            const cRows = await this.db.getAllAsync<{
                image_uri: string | null;
            }>(
                "SELECT image_uri FROM customers WHERE is_deleted = 1 AND store_id = ?",
                [storeId],
            );
            const tRows = await this.db.getAllAsync<{
                image_uri: string | null;
                voice_uri: string | null;
            }>(
                "SELECT image_uri, voice_uri FROM transactions WHERE is_deleted = 1 AND store_id = ?",
                [storeId],
            );
            await this.db.withTransactionAsync(async () => {
                await this.db.runAsync(
                    "DELETE FROM customers WHERE is_deleted = 1 AND store_id = ?",
                    [storeId],
                );
                await this.db.runAsync(
                    "DELETE FROM transactions WHERE is_deleted = 1 AND store_id = ?",
                    [storeId],
                );
            });
            for (const row of cRows) {
                if (row.image_uri) await deleteFromStorage(row.image_uri);
            }
            for (const row of tRows) {
                if (row.image_uri) await deleteFromStorage(row.image_uri);
                if (row.voice_uri) await deleteFromStorage(row.voice_uri);
            }
            void logger.info("trash", "Trash emptied");
        } catch (error) {
            void logger.error("trash", "Error emptying trash", error);
            throw error;
        }
    }
}
