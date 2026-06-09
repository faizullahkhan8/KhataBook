import * as SQLite from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDatabase, initializeDatabase } from "../db/database";

export const useDatabase = () => {
    const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);
    const initializationRef = useRef<Promise<void> | null>(null);
    const mountedRef = useRef(true);

    const initDatabase = useCallback(async () => {
        if (initializationRef.current) return initializationRef.current;
        if (dbRef.current) return;

        initializationRef.current = (async () => {
            let database: SQLite.SQLiteDatabase | null = null;
            try {
                console.log("Initializing database...");
                database = await getDatabase();
                await initializeDatabase(database);
                if (!mountedRef.current) {
                    await database.closeAsync();
                    return;
                }
                dbRef.current = database;
                setDb(database);
                setIsInitialized(true);
                setError(null);
                console.log("Database initialized successfully");
            } catch (err) {
                console.error("Database initialization error:", err);
                if (database) {
                    try {
                        await database.closeAsync();
                    } catch (closeError) {
                        console.error("Failed to close database after initialization error:", closeError);
                    }
                }
                if (mountedRef.current) {
                    setError(err as Error);
                    setIsInitialized(false);
                }
            } finally {
                initializationRef.current = null;
            }
        })();

        return initializationRef.current;
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        initDatabase();
        return () => {
            mountedRef.current = false;
            const database = dbRef.current;
            dbRef.current = null;
            if (database) {
                database.closeAsync().catch((closeError) => {
                    console.error("Failed to close database:", closeError);
                });
            }
        };
    }, [initDatabase]);

    return { db, isInitialized, error, initDatabase };
};
