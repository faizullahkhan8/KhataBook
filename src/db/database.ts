import * as SQLite from "expo-sqlite";

const DB_NAME = "credit_management.db";

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
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
        // Create customers table
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        image_uri TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    `);

        // Create accounts table
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        account_number TEXT UNIQUE NOT NULL,
        account_type TEXT NOT NULL DEFAULT 'CREDIT',
        credit_limit REAL NOT NULL DEFAULT 0,
        current_balance REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_accounts_customer ON accounts(customer_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);
      CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
    `);

        // Create transactions table
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('DEBIT', 'CREDIT')),
        amount REAL NOT NULL,
        description TEXT,
        reference TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);
    `);

        // Create payments table
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        reference TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
      CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(created_at);
    `);

        // Create customer_order table for drag-and-drop ordering
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS customer_order (
        customer_id INTEGER PRIMARY KEY,
        sort_order INTEGER NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);

        console.log("Database initialized successfully");
    } catch (error) {
        console.error("Error initializing database:", error);
        throw error;
    }
};
