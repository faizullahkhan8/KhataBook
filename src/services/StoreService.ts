import { SQLiteDatabase } from "../db/types";
import { Store } from "../models/Store";
import { StoreId } from "../models/types";
import { logger } from "./LogService";

export class StoreService {
    private db: SQLiteDatabase;

    constructor(db: SQLiteDatabase) {
        this.db = db;
    }

    async createStore(
        store: Omit<Store, "id" | "created_at" | "updated_at">,
    ): Promise<StoreId> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const isDefault = store.is_default ? 1 : 0;
            if (isDefault) {
                // Remove default from other stores
                await this.db.runAsync(
                    "UPDATE stores SET is_default = 0 WHERE is_default = 1"
                );
            }

            const result = await this.db.runAsync(
                `INSERT INTO stores (name, contact, address, is_default) VALUES (?, ?, ?, ?)`,
                [
                    store.name,
                    store.contact || null,
                    store.address || null,
                    isDefault,
                ],
            );
            const storeId = result.lastInsertRowId as StoreId;
            void logger.info("stores", "Store created", { storeId, name: store.name });
            return storeId;
        } catch (error) {
            void logger.error("stores", "Error creating store", error);
            throw error;
        }
    }

    async getStoreById(id: StoreId): Promise<Store | null> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const store = await this.db.getFirstAsync<Store>(
                "SELECT * FROM stores WHERE id = ?",
                [id],
            );
            return store || null;
        } catch (error) {
            void logger.error("stores", "Error fetching store", error);
            throw error;
        }
    }

    async getAllStores(): Promise<Store[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const stores = await this.db.getAllAsync<Store>(
                "SELECT * FROM stores ORDER BY created_at ASC",
            );
            return stores;
        } catch (error) {
            void logger.error("stores", "Error fetching stores", error);
            throw error;
        }
    }

    async updateStore(
        id: StoreId,
        store: Partial<Omit<Store, "id" | "created_at">>,
    ): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const fields: string[] = [];
            const values: (string | number | boolean)[] = [];

            if (store.name !== undefined) {
                fields.push("name = ?");
                values.push(store.name);
            }
            if (store.contact !== undefined) {
                fields.push("contact = ?");
                values.push(store.contact || "");
            }
            if (store.address !== undefined) {
                fields.push("address = ?");
                values.push(store.address || "");
            }
            if (store.is_default !== undefined) {
                if (store.is_default) {
                    await this.db.runAsync(
                        "UPDATE stores SET is_default = 0 WHERE is_default = 1"
                    );
                }
                fields.push("is_default = ?");
                values.push(store.is_default ? 1 : 0);
            }

            if (fields.length === 0) return;

            fields.push("updated_at = strftime('%s', 'now')");
            values.push(id);

            await this.db.runAsync(
                `UPDATE stores SET ${fields.join(", ")} WHERE id = ?`,
                values,
            );
            void logger.info("stores", "Store updated", { storeId: id });
        } catch (error) {
            void logger.error("stores", "Error updating store", error);
            throw error;
        }
    }
}
