import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import * as ExpoSQLite from "expo-sqlite";
import { openNativeDatabase } from "./adapter";
import { assertSQLCipherAvailable } from "./opSQLite.native";
import {
    DatabaseSecurityError,
    SQLiteDatabase,
} from "./types";

export const LEGACY_DB_NAME = "credit_management.db";
export const ENCRYPTED_DB_NAME = "credit_management.encrypted.db";
const MIGRATION_DB_NAME = "credit_management.encrypted.migration.db";
const DATABASE_KEY_STORAGE_KEY = "khatabook.database-key.v1";
const APP_TABLES = [
    "customers",
    "accounts",
    "transactions",
    "payments",
    "customer_order",
    "app_metadata",
    "message_templates",
];
interface DatabaseSnapshot {
    counts: Record<string, number>;
    schema: { type: string; name: string; tbl_name: string }[];
}

const databaseDirectory = String(ExpoSQLite.defaultDatabaseDirectory)
    .replace(/^file:\/\//, "")
    .replace(/\/$/, "");
const databasePath = (name: string) => `${databaseDirectory}/${name}`;
const databaseUri = (name: string) => `file://${databasePath(name)}`;
const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

const exists = async (name: string) =>
    (await FileSystem.getInfoAsync(databaseUri(name))).exists;

const deleteDatabaseFiles = async (name: string) => {
    await Promise.all(
        ["", "-wal", "-shm", "-journal"].map((suffix) =>
            FileSystem.deleteAsync(databaseUri(`${name}${suffix}`), {
                idempotent: true,
            }),
        ),
    );
};

const createDatabaseKey = async () => {
    const bytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0"),
    ).join("");
};

const storeDatabaseKey = (key: string) =>
    SecureStore.setItemAsync(DATABASE_KEY_STORAGE_KEY, key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

const getLegacySnapshot = async (): Promise<DatabaseSnapshot> => {
    const db = await ExpoSQLite.openDatabaseAsync(LEGACY_DB_NAME);
    try {
        await db.execAsync("PRAGMA wal_checkpoint(TRUNCATE);");
        const tables = await db.getAllAsync<{ name: string }>(
            "SELECT name FROM sqlite_master WHERE type = 'table'",
        );
        const existing = new Set(tables.map((table) => table.name));
        const counts: Record<string, number> = {};
        for (const table of APP_TABLES) {
            if (!existing.has(table)) continue;
            const row = await db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) AS count FROM "${table}"`,
            );
            counts[table] = row?.count ?? 0;
        }
        const schema = await db.getAllAsync<{
            type: string;
            name: string;
            tbl_name: string;
        }>(
            `SELECT type, name, tbl_name
             FROM sqlite_master
             WHERE name NOT LIKE 'sqlite_%'
             ORDER BY type, name, tbl_name`,
        );
        return { counts, schema };
    } finally {
        await db.closeAsync();
    }
};

const verifyEncryptedDatabase = async (
    db: SQLiteDatabase,
    expectedSnapshot?: DatabaseSnapshot,
) => {
    const cipher = await db.getFirstAsync<Record<string, string>>(
        "PRAGMA cipher_version",
    );
    if (!cipher || !Object.values(cipher)[0]) {
        throw new Error("SQLCipher is not active");
    }

    const integrity = await db.getFirstAsync<Record<string, string>>(
        "PRAGMA integrity_check",
    );
    if (Object.values(integrity ?? {})[0] !== "ok") {
        throw new Error("Encrypted database integrity check failed");
    }

    const cipherIntegrity = await db.getAllAsync<Record<string, string>>(
        "PRAGMA cipher_integrity_check",
    );
    if (cipherIntegrity.length > 0) {
        throw new Error("SQLCipher page authentication check failed");
    }

    if (expectedSnapshot) {
        for (const [table, expected] of Object.entries(
            expectedSnapshot.counts,
        )) {
            const row = await db.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) AS count FROM "${table}"`,
            );
            if ((row?.count ?? -1) !== expected) {
                throw new Error(`Row-count verification failed for ${table}`);
            }
        }
        const schema = await db.getAllAsync<{
            type: string;
            name: string;
            tbl_name: string;
        }>(
            `SELECT type, name, tbl_name
             FROM sqlite_master
             WHERE name NOT LIKE 'sqlite_%'
             ORDER BY type, name, tbl_name`,
        );
        if (JSON.stringify(schema) !== JSON.stringify(expectedSnapshot.schema)) {
            throw new Error("Schema verification failed");
        }
    }
};

const openAndVerifyEncryptedDatabase = async (key: string) => {
    const db = openNativeDatabase(ENCRYPTED_DB_NAME, key);
    try {
        await verifyEncryptedDatabase(db);
        return db;
    } catch (error) {
        await db.closeAsync().catch(() => undefined);
        throw error;
    }
};

const migratePlaintextDatabase = async (
    key: string,
    expectedSnapshot: DatabaseSnapshot,
) => {
    const { open } = assertSQLCipherAvailable();
    await deleteDatabaseFiles(MIGRATION_DB_NAME);
    const migrationDb = open({
        name: MIGRATION_DB_NAME,
        encryptionKey: key,
        location: ExpoSQLite.defaultDatabaseDirectory,
    });
    try {
        await migrationDb.execute(
            `ATTACH DATABASE ${sqlString(databasePath(LEGACY_DB_NAME))} AS plaintext KEY ''`,
        );
        await migrationDb.execute("SELECT sqlcipher_export('main', 'plaintext')");
        await migrationDb.execute("DETACH DATABASE plaintext");
    } finally {
        await migrationDb.closeAsync();
    }

    const migrated = openNativeDatabase(MIGRATION_DB_NAME, key);
    try {
        await verifyEncryptedDatabase(migrated, expectedSnapshot);
    } finally {
        await migrated.closeAsync();
    }

    await FileSystem.moveAsync({
        from: databaseUri(MIGRATION_DB_NAME),
        to: databaseUri(ENCRYPTED_DB_NAME),
    });
    const promoted = await openAndVerifyEncryptedDatabase(key);
    await deleteDatabaseFiles(LEGACY_DB_NAME);
    return promoted;
};

export const bootstrapDatabase = async (): Promise<SQLiteDatabase> => {
    assertSQLCipherAvailable();

    const [encryptedExists, legacyExists, storedKey] = await Promise.all([
        exists(ENCRYPTED_DB_NAME),
        exists(LEGACY_DB_NAME),
        SecureStore.getItemAsync(DATABASE_KEY_STORAGE_KEY),
    ]);

    if (encryptedExists) {
        if (!storedKey) {
            throw new DatabaseSecurityError(
                "missing_key",
                "The encrypted database key is missing. Existing data cannot be opened.",
            );
        }
        try {
            const db = await openAndVerifyEncryptedDatabase(storedKey);
            if (legacyExists) await deleteDatabaseFiles(LEGACY_DB_NAME);
            await deleteDatabaseFiles(MIGRATION_DB_NAME);
            return db;
        } catch (error) {
            throw new DatabaseSecurityError(
                "invalid_key",
                "The encrypted database key is invalid or the database is damaged.",
                { cause: error },
            );
        }
    }

    const key = storedKey ?? (await createDatabaseKey());
    if (!storedKey) await storeDatabaseKey(key);

    if (legacyExists) {
        const snapshot = await getLegacySnapshot();
        if (Object.keys(snapshot.counts).length > 0) {
            try {
                return await migratePlaintextDatabase(key, snapshot);
            } catch (error) {
                await deleteDatabaseFiles(MIGRATION_DB_NAME);
                throw new DatabaseSecurityError(
                    "migration_failed",
                    "The existing database could not be encrypted safely.",
                    { cause: error },
                );
            }
        }
        await deleteDatabaseFiles(LEGACY_DB_NAME);
    }

    const db = openNativeDatabase(ENCRYPTED_DB_NAME, key);
    try {
        await verifyEncryptedDatabase(db);
        return db;
    } catch (error) {
        await db.closeAsync().catch(() => undefined);
        throw new DatabaseSecurityError(
            "initialization_failed",
            "The encrypted database could not be created.",
            { cause: error },
        );
    }
};
