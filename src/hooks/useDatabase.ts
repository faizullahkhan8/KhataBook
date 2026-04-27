import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { getDatabase, initializeDatabase } from "../db/database";

const DB_NAME = "credit_management.db";

export const useDatabase = () => {
    const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const initDatabase = useCallback(async (retryCount = 0) => {
        try {
            console.log("Initializing database...");
            const database = await getDatabase();
            await initializeDatabase(database);
            setDb(database);
            setIsInitialized(true);
            setError(null);
            console.log("Database initialized successfully");
        } catch (err) {
            console.error("Database initialization error:", err);

            // If it's a corruption error, try to delete and recreate
            if (retryCount === 0) {
                console.log("Attempting to reset database...");
                try {
                    await SQLite.deleteDatabaseAsync(DB_NAME);
                    console.log("Database deleted, retrying...");
                    await initDatabase(retryCount + 1);
                    return;
                } catch (deleteErr) {
                    console.error("Failed to delete database:", deleteErr);
                }
            }

            setError(err as Error);
            setIsInitialized(false);
        }
    }, []);

    useEffect(() => {
        initDatabase();
    }, [initDatabase]);

    return { db, isInitialized, error, initDatabase };
};
