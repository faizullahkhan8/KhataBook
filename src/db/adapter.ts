import { SQLiteDatabase } from "./types";

export declare const openNativeDatabase: (
    name: string,
    encryptionKey: string,
) => SQLiteDatabase;

export declare const openWebDatabase: (
    name: string,
) => Promise<SQLiteDatabase>;
