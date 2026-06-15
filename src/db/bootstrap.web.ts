import { openWebDatabase } from "./adapter";
import { SQLiteDatabase } from "./types";

export const LEGACY_DB_NAME = "credit_management.db";

export const bootstrapDatabase = (): Promise<SQLiteDatabase> =>
    openWebDatabase(LEGACY_DB_NAME);
