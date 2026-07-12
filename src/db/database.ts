import { bootstrapDatabase } from "./bootstrap";
import { SQLiteDatabase } from "./types";
import { logger } from "../services/LogService";

const DEFAULT_MESSAGE_TEMPLATES_SEED_KEY = "default_message_templates_seeded";

const DEFAULT_MESSAGE_TEMPLATES = [
    {
        name: "Payment Reminder",
        body: "Dear {{name}}, this is a reminder that your current balance is {{balance}} for account {{accountNumber}}. Please make your payment at your earliest convenience. Thank you.",
    },
    {
        name: "Payment Received",
        body: "Dear {{name}}, we have received your payment. Your updated balance is {{balance}} for account {{accountNumber}}. Thank you.",
    },
    {
        name: "Balance Update",
        body: "Dear {{name}}, your current account balance is {{balance}} for account {{accountNumber}}.",
    },
    {
        name: "Payment Due Soon",
        body: "Dear {{name}}, your payment for account {{accountNumber}} is due soon. Current balance: {{balance}}. Please arrange payment to avoid delay.",
    },
    {
        name: "Thank You",
        body: "Dear {{name}}, thank you for your business. For any questions, please contact us.",
    },
];

const sqlString = (value: string): string => `'${value.replace(/'/g, "''")}'`;

export const getDatabase = async (): Promise<SQLiteDatabase> => {
    let db: SQLiteDatabase | null = null;
    try {
        db = await bootstrapDatabase();

        // Apply pragmas individually so an unsupported optimization cannot
        // invalidate the remaining database setup.
        await db.execAsync("PRAGMA journal_mode = WAL;");
        await db.execAsync("PRAGMA synchronous = NORMAL;");
        await db.execAsync("PRAGMA foreign_keys = ON;");
        await db.execAsync("PRAGMA cache_size = -2000;");

        return db;
    } catch (error) {
        void logger.error("database", "Error opening database", error);
        if (db) {
            try {
                await db.closeAsync();
            } catch (closeError) {
                void logger.error(
                    "database",
                    "Failed to close database after open error",
                    closeError,
                );
            }
        }
        throw error;
    }
};

export const initializeDatabase = async (
    db: SQLiteDatabase,
): Promise<void> => {
    try {
        // 1. Create tables with updated schema
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS stores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact TEXT,
                address TEXT,
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            );

            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                store_id INTEGER NOT NULL DEFAULT 1,
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
            
            CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);
            CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
            CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
            CREATE INDEX IF NOT EXISTS idx_customers_last_trans ON customers(last_transaction_at);

            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                store_id INTEGER NOT NULL DEFAULT 1,
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
            
            CREATE INDEX IF NOT EXISTS idx_accounts_store ON accounts(store_id);
            CREATE INDEX IF NOT EXISTS idx_accounts_cust_status ON accounts(customer_id, status);
            CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);

            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                store_id INTEGER NOT NULL DEFAULT 1,
                account_id INTEGER NOT NULL,
                type INTEGER NOT NULL, -- 0: DEBIT, 1: CREDIT
                amount INTEGER NOT NULL,
                description TEXT,
                reference TEXT,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            
            CREATE INDEX IF NOT EXISTS idx_transactions_store ON transactions(store_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_acc_date ON transactions(account_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                store_id INTEGER NOT NULL DEFAULT 1,
                account_id INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                payment_method TEXT NOT NULL,
                reference TEXT,
                notes TEXT,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            
            CREATE INDEX IF NOT EXISTS idx_payments_store ON payments(store_id);
            CREATE INDEX IF NOT EXISTS idx_payments_acc_date ON payments(account_id, created_at DESC);

            CREATE TABLE IF NOT EXISTS customer_order (
                customer_id INTEGER PRIMARY KEY,
                store_id INTEGER NOT NULL DEFAULT 1,
                sort_order INTEGER NOT NULL,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS app_metadata (
                "key" TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS message_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            );

            CREATE TABLE IF NOT EXISTS security_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                pin_hash TEXT NOT NULL,
                pin_salt TEXT NOT NULL,
                pin_kdf TEXT NOT NULL,
                pin_length INTEGER NOT NULL,
                recovery_question TEXT NOT NULL,
                answer_hash TEXT NOT NULL,
                answer_salt TEXT NOT NULL,
                answer_kdf TEXT NOT NULL,
                kdf_params TEXT NOT NULL,
                failures INTEGER NOT NULL DEFAULT 0,
                cooldown_level INTEGER NOT NULL DEFAULT 0,
                locked_until INTEGER NOT NULL DEFAULT 0,
                biometric_enabled INTEGER NOT NULL DEFAULT 0,
                auto_lock_delay INTEGER NOT NULL DEFAULT 0,
                require_delete_auth INTEGER NOT NULL DEFAULT 0
            );
        `);

        const securitySettingsColumns = await db.getAllAsync<{ name: string }>(
            "PRAGMA table_info(security_settings)",
        );
        if (
            !securitySettingsColumns.some(
                (column) => column.name === "require_delete_auth",
            )
        ) {
            await db.execAsync(
                "ALTER TABLE security_settings ADD COLUMN require_delete_auth INTEGER NOT NULL DEFAULT 0;",
            );
        }

        const customerColumns = await db.getAllAsync<{ name: string }>(
            "PRAGMA table_info(customers)",
        );
        if (!customerColumns.some((column) => column.name === "cnic")) {
            await db.execAsync("ALTER TABLE customers ADD COLUMN cnic TEXT;");
        }
        if (!customerColumns.some((column) => column.name === "deleted_at")) {
            await db.execAsync("ALTER TABLE customers ADD COLUMN deleted_at INTEGER;");
        }
        if (!customerColumns.some((column) => column.name === "is_deleted")) {
            await db.execAsync("ALTER TABLE customers ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;");
        }
        if (!customerColumns.some((column) => column.name === "store_id")) {
            await db.execAsync(`
                ALTER TABLE customers ADD COLUMN store_id INTEGER NOT NULL DEFAULT 1;
                ALTER TABLE accounts ADD COLUMN store_id INTEGER NOT NULL DEFAULT 1;
                ALTER TABLE transactions ADD COLUMN store_id INTEGER NOT NULL DEFAULT 1;
                ALTER TABLE payments ADD COLUMN store_id INTEGER NOT NULL DEFAULT 1;
                ALTER TABLE customer_order ADD COLUMN store_id INTEGER NOT NULL DEFAULT 1;
                
                CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);
                CREATE INDEX IF NOT EXISTS idx_accounts_store ON accounts(store_id);
                CREATE INDEX IF NOT EXISTS idx_transactions_store ON transactions(store_id);
                CREATE INDEX IF NOT EXISTS idx_payments_store ON payments(store_id);
            `);
        }
        await db.execAsync(
            "CREATE INDEX IF NOT EXISTS idx_customers_cnic ON customers(cnic);",
        );
        await db.execAsync(
            "CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(is_deleted);",
        );

        const transactionColumns = await db.getAllAsync<{ name: string }>(
            "PRAGMA table_info(transactions)",
        );
        if (!transactionColumns.some((c) => c.name === "image_uri")) {
            await db.execAsync("ALTER TABLE transactions ADD COLUMN image_uri TEXT;");
        }
        if (!transactionColumns.some((c) => c.name === "voice_uri")) {
            await db.execAsync("ALTER TABLE transactions ADD COLUMN voice_uri TEXT;");
        }
        if (!transactionColumns.some((c) => c.name === "deleted_at")) {
            await db.execAsync("ALTER TABLE transactions ADD COLUMN deleted_at INTEGER;");
        }
        if (!transactionColumns.some((c) => c.name === "is_deleted")) {
            await db.execAsync("ALTER TABLE transactions ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;");
        }
        await db.execAsync(
            "CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON transactions(is_deleted);",
        );

        await db.execAsync(`
            ${DEFAULT_MESSAGE_TEMPLATES.map(
                (template) => `
                    INSERT INTO message_templates (name, body)
                    SELECT ${sqlString(template.name)}, ${sqlString(template.body)}
                    WHERE NOT EXISTS (
                        SELECT 1 FROM app_metadata
                        WHERE "key" = ${sqlString(DEFAULT_MESSAGE_TEMPLATES_SEED_KEY)}
                    )
                    AND NOT EXISTS (
                        SELECT 1 FROM message_templates
                        WHERE name = ${sqlString(template.name)}
                    );
                `,
            ).join("\n")}

            INSERT OR IGNORE INTO app_metadata ("key", value)
            VALUES (${sqlString(DEFAULT_MESSAGE_TEMPLATES_SEED_KEY)}, '1');

            INSERT OR IGNORE INTO stores (id, name, is_default)
            VALUES (1, 'My Store', 1);
        `);

        // 2. Data Migration (Handle existing string enums and float amounts)
        // Check if we need to migrate (simple check: if 'ACTIVE' still exists in accounts)
        const sampleAccount = await db.getFirstAsync<{ status: any }>(
            "SELECT status FROM accounts LIMIT 1",
        );
        if (sampleAccount && typeof sampleAccount.status === "string") {
            void logger.info("database", "Migrating database data to new format");
            await db.withTransactionAsync(async () => {
                // Convert Account Status
                await db.runAsync(
                    "UPDATE accounts SET status = CASE WHEN status = 'ACTIVE' THEN 0 WHEN status = 'INACTIVE' THEN 1 WHEN status = 'SUSPENDED' THEN 2 WHEN status = 'CLOSED' THEN 3 ELSE 0 END",
                );
                // Convert Account Type
                await db.runAsync(
                    "UPDATE accounts SET account_type = CASE WHEN account_type = 'CREDIT' THEN 0 WHEN account_type = 'DEBIT' THEN 1 ELSE 0 END",
                );
                // Convert Transaction Type
                await db.runAsync(
                    "UPDATE transactions SET type = CASE WHEN type = 'DEBIT' THEN 0 WHEN type = 'CREDIT' THEN 1 ELSE 1 END",
                );

                // Convert REAL amounts to INTEGER (multiply by 100 to preserve 2 decimal places)
                // Note: We use ROUND to avoid floating point precision issues during multiplication
                await db.runAsync(
                    "UPDATE accounts SET credit_limit = ROUND(credit_limit * 100), current_balance = ROUND(current_balance * 100)",
                );
                await db.runAsync(
                    "UPDATE transactions SET amount = ROUND(amount * 100)",
                );
                await db.runAsync(
                    "UPDATE payments SET amount = ROUND(amount * 100)",
                );

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
            -- DEBIT (type=0) increases balance (customer owes more)
            -- CREDIT (type=1) decreases balance (customer pays back)
            CREATE TRIGGER IF NOT EXISTS trig_trans_insert_balance
            AFTER INSERT ON transactions
            BEGIN
                UPDATE accounts 
                SET current_balance = current_balance + (CASE WHEN NEW.type = 0 THEN NEW.amount ELSE -NEW.amount END),
                    updated_at = strftime('%s', 'now')
                WHERE id = NEW.account_id;
            END;

            -- Revert account balance on transaction delete
            -- Mirror the insert logic: undo DEBIT additions and CREDIT subtractions
            CREATE TRIGGER IF NOT EXISTS trig_trans_delete_balance
            AFTER DELETE ON transactions
            BEGIN
                UPDATE accounts 
                SET current_balance = current_balance - (CASE WHEN OLD.type = 0 THEN OLD.amount ELSE -OLD.amount END),
                    updated_at = strftime('%s', 'now')
                WHERE id = OLD.account_id;
            END;

            -- Update account balance on transaction update
            CREATE TRIGGER IF NOT EXISTS trig_trans_update_balance
            AFTER UPDATE ON transactions
            BEGIN
                -- Revert old amount from old account
                UPDATE accounts 
                SET current_balance = current_balance - (CASE WHEN OLD.type = 0 THEN OLD.amount ELSE -OLD.amount END)
                WHERE id = OLD.account_id;
                
                -- Apply new amount to new account
                UPDATE accounts 
                SET current_balance = current_balance + (CASE WHEN NEW.type = 0 THEN NEW.amount ELSE -NEW.amount END),
                    updated_at = strftime('%s', 'now')
                WHERE id = NEW.account_id;
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

        // Self-heal any corrupted data caused by missing UPDATE triggers
        await db.execAsync(`
            UPDATE accounts
            SET current_balance = COALESCE((
                SELECT SUM(CASE WHEN type = 0 THEN amount ELSE -amount END)
                FROM transactions
                WHERE account_id = accounts.id AND is_deleted = 0
            ), 0);

            UPDATE customers
            SET total_receivable = (SELECT COALESCE(SUM(current_balance), 0) FROM accounts WHERE customer_id = customers.id AND current_balance > 0),
                total_payable = (SELECT COALESCE(ABS(SUM(current_balance)), 0) FROM accounts WHERE customer_id = customers.id AND current_balance < 0);
        `);

        void logger.info("database", "Database initialized and migrated successfully");
    } catch (error) {
        void logger.error("database", "Error initializing database", error);
        throw error;
    }
};
