export type SQLiteBindValue =
    | string
    | number
    | boolean
    | null
    | ArrayBuffer
    | ArrayBufferView;

export interface SQLiteRunResult {
    lastInsertRowId: number;
    changes: number;
}

export interface SQLiteStatement {
    executeAsync(params?: SQLiteBindValue[]): Promise<SQLiteRunResult>;
    finalizeAsync(): Promise<void>;
}

export interface SQLiteDatabase {
    execAsync(sql: string): Promise<void>;
    runAsync(
        sql: string,
        params?: SQLiteBindValue[],
    ): Promise<SQLiteRunResult>;
    getFirstAsync<T>(
        sql: string,
        params?: SQLiteBindValue[],
    ): Promise<T | null>;
    getAllAsync<T>(sql: string, params?: SQLiteBindValue[]): Promise<T[]>;
    prepareAsync(sql: string): Promise<SQLiteStatement>;
    withTransactionAsync(callback: () => Promise<void>): Promise<void>;
    closeAsync(): Promise<void>;
}

export type DatabaseSecurityErrorCode =
    | "native_module_missing"
    | "missing_key"
    | "invalid_key"
    | "migration_failed"
    | "initialization_failed";

export class DatabaseSecurityError extends Error {
    constructor(
        public readonly code: DatabaseSecurityErrorCode,
        message: string,
        options?: { cause?: unknown },
    ) {
        super(message, options);
        this.name = "DatabaseSecurityError";
    }
}
