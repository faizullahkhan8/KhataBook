import type { DB, Scalar, Transaction } from "@op-engineering/op-sqlite";
import * as ExpoSQLite from "expo-sqlite";
import {
    SQLiteBindValue,
    SQLiteDatabase,
    SQLiteRunResult,
    SQLiteStatement,
} from "./types";
import { loadOPSQLite } from "./opSQLite.native";

const toRunResult = (result: {
    insertId?: number;
    rowsAffected?: number;
}): SQLiteRunResult => ({
    lastInsertRowId: result.insertId ?? 0,
    changes: result.rowsAffected ?? 0,
});

const splitSqlScript = (script: string): string[] => {
    const statements: string[] = [];
    let current = "";
    let inTrigger = false;

    for (const line of script.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("--")) continue;

        if (/^CREATE\s+TRIGGER\b/i.test(trimmed)) inTrigger = true;
        current += `${line}\n`;

        if (inTrigger) {
            if (/^END;\s*$/i.test(trimmed)) {
                statements.push(current.trim());
                current = "";
                inTrigger = false;
            }
        } else if (trimmed.endsWith(";")) {
            statements.push(current.trim());
            current = "";
        }
    }

    if (current.trim()) statements.push(current.trim());
    return statements;
};

class NativeStatement implements SQLiteStatement {
    constructor(private readonly statement: ReturnType<DB["prepareStatement"]>) {}

    async executeAsync(params: SQLiteBindValue[] = []): Promise<SQLiteRunResult> {
        await this.statement.bind(params);
        return toRunResult(await this.statement.execute());
    }

    async finalizeAsync(): Promise<void> {
        // OP-SQLite statements are finalized with their owning connection.
    }
}

class NativeDatabase implements SQLiteDatabase {
    private activeTransaction: Transaction | null = null;

    constructor(private readonly db: DB) {}

    private execute(sql: string, params?: SQLiteBindValue[]) {
        const target = this.activeTransaction ?? this.db;
        return target.execute(sql, params as Scalar[] | undefined);
    }

    async execAsync(sql: string): Promise<void> {
        for (const statement of splitSqlScript(sql)) {
            await this.execute(statement);
        }
    }

    async runAsync(
        sql: string,
        params: SQLiteBindValue[] = [],
    ): Promise<SQLiteRunResult> {
        return toRunResult(await this.execute(sql, params));
    }

    async getFirstAsync<T>(
        sql: string,
        params: SQLiteBindValue[] = [],
    ): Promise<T | null> {
        const result = await this.execute(sql, params);
        return (result.rows[0] as T | undefined) ?? null;
    }

    async getAllAsync<T>(
        sql: string,
        params: SQLiteBindValue[] = [],
    ): Promise<T[]> {
        const result = await this.execute(sql, params);
        return result.rows as T[];
    }

    async prepareAsync(sql: string): Promise<SQLiteStatement> {
        return new NativeStatement(this.db.prepareStatement(sql));
    }

    private async runTransaction(
        callback: (db: SQLiteDatabase) => Promise<void>,
    ): Promise<void> {
        await this.db.transaction(async (transaction) => {
            this.activeTransaction = transaction;
            try {
                await callback(this);
            } finally {
                this.activeTransaction = null;
            }
        });
    }

    async withTransactionAsync(callback: () => Promise<void>): Promise<void> {
        await this.runTransaction(callback);
    }

    closeAsync(): Promise<void> {
        return this.db.closeAsync();
    }
}

export const openNativeDatabase = (
    name: string,
    encryptionKey: string,
): SQLiteDatabase => {
    const { open } = loadOPSQLite();
    return new NativeDatabase(
        open({
            name,
            encryptionKey,
            location: ExpoSQLite.defaultDatabaseDirectory,
        }),
    );
};
