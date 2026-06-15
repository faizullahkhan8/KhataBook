import { SQLiteDatabase } from "./types";

export declare const LEGACY_DB_NAME: string;
export declare const bootstrapDatabase: () => Promise<SQLiteDatabase>;
