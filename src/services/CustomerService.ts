import * as SQLite from "expo-sqlite";
import { Customer } from "../models/Customer";

export class CustomerService {
    private db: SQLite.SQLiteDatabase;

    constructor(db: SQLite.SQLiteDatabase) {
        this.db = db;
    }

    async createCustomer(
        customer: Omit<Customer, "id" | "created_at" | "updated_at">,
    ): Promise<number> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const result = await this.db.runAsync(
                `INSERT INTO customers (name, phone, email, address, image_uri, notes) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    customer.name,
                    customer.phone,
                    customer.email || null,
                    customer.address || null,
                    customer.image_uri || null,
                    customer.notes || null,
                ],
            );
            return result.lastInsertRowId;
        } catch (error) {
            console.error("Error creating customer:", error);
            throw error;
        }
    }

    async getCustomerById(id: number): Promise<Customer | null> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const customer = await this.db.getFirstAsync<Customer>(
                "SELECT * FROM customers WHERE id = ?",
                [id],
            );
            return customer || null;
        } catch (error) {
            console.error("Error fetching customer:", error);
            throw error;
        }
    }

    async getAllCustomers(
        limit: number = 50,
        offset: number = 0,
    ): Promise<Customer[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const customers = await this.db.getAllAsync<Customer>(
                "SELECT * FROM customers ORDER BY created_at DESC LIMIT ? OFFSET ?",
                [limit, offset],
            );
            return customers;
        } catch (error) {
            console.error("Error fetching customers:", error);
            throw error;
        }
    }

    async searchCustomers(
        query: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Customer[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const customers = await this.db.getAllAsync<Customer>(
                `SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                [`%${query}%`, `%${query}%`, `%${query}%`, limit, offset],
            );
            return customers;
        } catch (error) {
            console.error("Error searching customers:", error);
            throw error;
        }
    }

    async updateCustomer(
        id: number,
        customer: Partial<Customer>,
    ): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const updates: string[] = [];
            const values: any[] = [];

            if (customer.name !== undefined) {
                updates.push("name = ?");
                values.push(customer.name);
            }
            if (customer.phone !== undefined) {
                updates.push("phone = ?");
                values.push(customer.phone);
            }
            if (customer.email !== undefined) {
                updates.push("email = ?");
                values.push(customer.email);
            }
            if (customer.address !== undefined) {
                updates.push("address = ?");
                values.push(customer.address);
            }
            if (customer.image_uri !== undefined) {
                updates.push("image_uri = ?");
                values.push(customer.image_uri);
            }
            if (customer.notes !== undefined) {
                updates.push("notes = ?");
                values.push(customer.notes);
            }

            updates.push("updated_at = strftime('%s', 'now')");
            values.push(id);

            await this.db.runAsync(
                `UPDATE customers SET ${updates.join(", ")} WHERE id = ?`,
                values,
            );
        } catch (error) {
            console.error("Error updating customer:", error);
            throw error;
        }
    }

    async deleteCustomer(id: number): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            await this.db.runAsync("DELETE FROM customers WHERE id = ?", [id]);
        } catch (error) {
            console.error("Error deleting customer:", error);
            throw error;
        }
    }

    async getCustomerCount(): Promise<number> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const result = await this.db.getFirstAsync<{ count: number }>(
                "SELECT COUNT(*) as count FROM customers",
            );
            return result?.count || 0;
        } catch (error) {
            console.error("Error getting customer count:", error);
            throw error;
        }
    }
}
