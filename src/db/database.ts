import * as SQLite from "expo-sqlite";

const DB_NAME = "credit_management.db";

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        
        // Performance Pragmas
        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA foreign_keys = ON;
            PRAGMA cache_size = -2000;
            PRAGMA mmap_size = 268435456;
        `);
        
        return db;
    } catch (error) {
        console.error("Error opening database:", error);
        throw error;
    }
};

export const initializeDatabase = async (
    db: SQLite.SQLiteDatabase,
): Promise<void> => {
    try {
        // 1. Create tables with updated schema
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL DEFAULT '',
                cnic TEXT,
                email TEXT,
                address TEXT,
                image_uri TEXT,
                notes TEXT,
                total_receivable INTEGER NOT NULL DEFAULT 0,
                total_payable INTEGER NOT NULL DEFAULT 0,
                last_transaction_at INTEGER,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            );
            
            CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
            CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
            CREATE INDEX IF NOT EXISTS idx_customers_last_trans ON customers(last_transaction_at);

            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                account_number TEXT UNIQUE NOT NULL,
                account_type INTEGER NOT NULL DEFAULT 0, -- 0: CREDIT, 1: DEBIT
                credit_limit INTEGER NOT NULL DEFAULT 0,
                current_balance INTEGER NOT NULL DEFAULT 0,
                status INTEGER NOT NULL DEFAULT 0, -- 0: ACTIVE, 1: INACTIVE...
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
            );
            
            CREATE INDEX IF NOT EXISTS idx_accounts_cust_status ON accounts(customer_id, status);
            CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);

            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                type INTEGER NOT NULL, -- 0: DEBIT, 1: CREDIT
                amount INTEGER NOT NULL,
                description TEXT,
                reference TEXT,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            
            CREATE INDEX IF NOT EXISTS idx_transactions_acc_date ON transactions(account_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                payment_method TEXT NOT NULL,
                reference TEXT,
                notes TEXT,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            
            CREATE INDEX IF NOT EXISTS idx_payments_acc_date ON payments(account_id, created_at DESC);

            CREATE TABLE IF NOT EXISTS customer_order (
                customer_id INTEGER PRIMARY KEY,
                sort_order INTEGER NOT NULL,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
            );
        `);

        const customerColumns = await db.getAllAsync<{ name: string }>(
            "PRAGMA table_info(customers)",
        );
        if (!customerColumns.some((column) => column.name === "cnic")) {
            await db.execAsync("ALTER TABLE customers ADD COLUMN cnic TEXT;");
        }
        await db.execAsync(
            "CREATE INDEX IF NOT EXISTS idx_customers_cnic ON customers(cnic);",
        );

        // 2. Data Migration (Handle existing string enums and float amounts)
        // Check if we need to migrate (simple check: if 'ACTIVE' still exists in accounts)
        const sampleAccount = await db.getFirstAsync<{ status: any }>("SELECT status FROM accounts LIMIT 1");
        if (sampleAccount && typeof sampleAccount.status === 'string') {
            console.log("Migrating database data to new format...");
            await db.withTransactionAsync(async () => {
                // Convert Account Status
                await db.runAsync("UPDATE accounts SET status = CASE WHEN status = 'ACTIVE' THEN 0 WHEN status = 'INACTIVE' THEN 1 WHEN status = 'SUSPENDED' THEN 2 WHEN status = 'CLOSED' THEN 3 ELSE 0 END");
                // Convert Account Type
                await db.runAsync("UPDATE accounts SET account_type = CASE WHEN account_type = 'CREDIT' THEN 0 WHEN account_type = 'DEBIT' THEN 1 ELSE 0 END");
                // Convert Transaction Type
                await db.runAsync("UPDATE transactions SET type = CASE WHEN type = 'DEBIT' THEN 0 WHEN type = 'CREDIT' THEN 1 ELSE 1 END");
                
                // Convert REAL amounts to INTEGER (multiply by 100 to preserve 2 decimal places)
                // Note: We use ROUND to avoid floating point precision issues during multiplication
                await db.runAsync("UPDATE accounts SET credit_limit = ROUND(credit_limit * 100), current_balance = ROUND(current_balance * 100)");
                await db.runAsync("UPDATE transactions SET amount = ROUND(amount * 100)");
                await db.runAsync("UPDATE payments SET amount = ROUND(amount * 100)");

                // Initial calculation for denormalized fields
                await db.runAsync(`
                    UPDATE customers SET 
                        total_receivable = (SELECT COALESCE(SUM(current_balance), 0) FROM accounts WHERE customer_id = customers.id AND current_balance > 0),
                        total_payable = (SELECT COALESCE(ABS(SUM(current_balance)), 0) FROM accounts WHERE customer_id = customers.id AND current_balance < 0),
                        last_transaction_at = (SELECT MAX(created_at) FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE a.customer_id = customers.id)
                `);
            });
        }

        // 3. Create Triggers for automatic denormalization
        await db.execAsync(`
            -- Update account balance on transaction insert
            CREATE TRIGGER IF NOT EXISTS trig_trans_insert_balance
            AFTER INSERT ON transactions
            BEGIN
                UPDATE accounts 
                SET current_balance = current_balance + (CASE WHEN NEW.type = 1 THEN NEW.amount ELSE -NEW.amount END),
                    updated_at = strftime('%s', 'now')
                WHERE id = NEW.account_id;
            END;

            -- Revert account balance on transaction delete
            CREATE TRIGGER IF NOT EXISTS trig_trans_delete_balance
            AFTER DELETE ON transactions
            BEGIN
                UPDATE accounts 
                SET current_balance = current_balance - (CASE WHEN OLD.type = 1 THEN OLD.amount ELSE -OLD.amount END),
                    updated_at = strftime('%s', 'now')
                WHERE id = OLD.account_id;
            END;

            -- Update customer summary on account balance change
            CREATE TRIGGER IF NOT EXISTS trig_account_balance_update
            AFTER UPDATE OF current_balance ON accounts
            BEGIN
                UPDATE customers
                SET total_receivable = (SELECT COALESCE(SUM(current_balance), 0) FROM accounts WHERE customer_id = NEW.customer_id AND current_balance > 0),
                    total_payable = (SELECT COALESCE(ABS(SUM(current_balance)), 0) FROM accounts WHERE customer_id = NEW.customer_id AND current_balance < 0),
                    updated_at = strftime('%s', 'now')
                WHERE id = NEW.customer_id;
            END;

            -- Update last_transaction_at on transaction insert
            CREATE TRIGGER IF NOT EXISTS trig_trans_insert_last_date
            AFTER INSERT ON transactions
            BEGIN
                UPDATE customers
                SET last_transaction_at = NEW.created_at
                WHERE id = (SELECT customer_id FROM accounts WHERE id = NEW.account_id);
            END;
        `);

        console.log("Database initialized and migrated successfully");
    } catch (error) {
        console.error("Error initializing database:", error);
        throw error;
    }
};
