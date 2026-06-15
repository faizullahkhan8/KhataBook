import * as ExpoSQLite from "expo-sqlite";
import { SQLiteDatabase } from "./types";

export const openWebDatabase = async (name: string): Promise<SQLiteDatabase> =>
    (await ExpoSQLite.openDatabaseAsync(name)) as unknown as SQLiteDatabase;
