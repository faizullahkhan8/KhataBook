import { SQLiteDatabase } from "../db/types";
import { Customer, CustomerSummary } from "../models/Customer";
import { CustomerId } from "../models/types";
import { logger } from "./LogService";

export class CustomerService {
    private db: SQLiteDatabase;

    constructor(db: SQLiteDatabase) {
        this.db = db;
    }

    async createCustomer(
        customer: Omit<
            Customer,
            | "id"
            | "created_at"
            | "updated_at"
            | "total_receivable"
            | "total_payable"
            | "last_transaction_at"
        >,
    ): Promise<CustomerId> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const result = await this.db.runAsync(
                `INSERT INTO customers (name, phone, cnic, email, address, image_uri, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    customer.name,
                    customer.phone || "",
                    customer.cnic || null,
                    customer.email || null,
                    customer.address || null,
                    customer.image_uri || null,
                    customer.notes || null,
                ],
            );
            const customerId = result.lastInsertRowId as CustomerId;
            void logger.info("customers", "Customer created", { customerId, name: customer.name });
            return customerId;
        } catch (error) {
            void logger.error("customers", "Error creating customer", error);
            throw error;
        }
    }

    async getCustomerById(id: CustomerId): Promise<Customer | null> {
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
            void logger.error("customers", "Error fetching customer", error);
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
                "SELECT * FROM customers ORDER BY name ASC LIMIT ? OFFSET ?",
                [limit, offset],
            );
            return customers;
        } catch (error) {
            void logger.error("customers", "Error fetching customers", error);
            throw error;
        }
    }

    /**
     * Fetch lightweight summaries for high-performance list rendering.
     */
    async getCustomerSummaries(
        limit: number = 50,
        offset: number = 0,
    ): Promise<CustomerSummary[]> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const summaries = await this.db.getAllAsync<CustomerSummary>(
                "SELECT id, name, phone, image_uri, total_receivable, total_payable, last_transaction_at FROM customers ORDER BY name ASC LIMIT ? OFFSET ?",
                [limit, offset],
            );
            return summaries;
        } catch (error) {
            void logger.error(
                "customers",
                "Error fetching customer summaries",
                error,
            );
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
            const searchTerm = `%${query}%`;
            const customers = await this.db.getAllAsync<Customer>(
                "SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? OR cnic LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?",
                [searchTerm, searchTerm, searchTerm, limit, offset],
            );
            return customers;
        } catch (error) {
            void logger.error("customers", "Error searching customers", error);
            throw error;
        }
    }

    async updateCustomer(
        id: CustomerId,
        customer: Partial<Customer>,
    ): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            const fields: string[] = [];
            const values: (string | number)[] = [];

            if (customer.name !== undefined) {
                fields.push("name = ?");
                values.push(customer.name);
            }
            if (customer.phone !== undefined) {
                fields.push("phone = ?");
                values.push(customer.phone);
            }
            if (customer.cnic !== undefined) {
                fields.push("cnic = ?");
                values.push(customer.cnic);
            }
            if (customer.email !== undefined) {
                fields.push("email = ?");
                values.push(customer.email);
            }
            if (customer.address !== undefined) {
                fields.push("address = ?");
                values.push(customer.address);
            }
            if (customer.image_uri !== undefined) {
                fields.push("image_uri = ?");
                values.push(customer.image_uri);
            }
            if (customer.notes !== undefined) {
                fields.push("notes = ?");
                values.push(customer.notes);
            }

            if (fields.length === 0) return;

            fields.push("updated_at = strftime('%s', 'now')");
            values.push(id);

            await this.db.runAsync(
                `UPDATE customers SET ${fields.join(", ")} WHERE id = ?`,
                values,
            );
            void logger.info("customers", "Customer updated", { customerId: id });
        } catch (error) {
            void logger.error("customers", "Error updating customer", error);
            throw error;
        }
    }

    async deleteCustomer(id: CustomerId): Promise<void> {
        if (!this.db) {
            throw new Error("Database is not initialized");
        }
        try {
            await this.db.runAsync("DELETE FROM customers WHERE id = ?", [id]);
            void logger.info("customers", "Customer deleted", { customerId: id });
        } catch (error) {
            void logger.error("customers", "Error deleting customer", error);
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
            void logger.error("customers", "Error getting customer count", error);
            throw error;
        }
    }
}
