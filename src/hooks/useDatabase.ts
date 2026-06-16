import { useCallback, useEffect, useRef, useState } from "react";
import { getDatabase, initializeDatabase } from "../db/database";
import { SQLiteDatabase } from "../db/types";
import { logger } from "../services/LogService";

export const useDatabase = () => {
    const [db, setDb] = useState<SQLiteDatabase | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const dbRef = useRef<SQLiteDatabase | null>(null);
    const initializationRef = useRef<Promise<void> | null>(null);
    const mountedRef = useRef(true);

    const initDatabase = useCallback(async () => {
        if (initializationRef.current) return initializationRef.current;
        if (dbRef.current) return;

        initializationRef.current = (async () => {
            let database: SQLiteDatabase | null = null;
            try {
                void logger.info("database", "Initializing database");
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
                void logger.info("database", "Database initialized successfully");
            } catch (err) {
                void logger.error("database", "Database initialization error", err);
                if (database) {
                    try {
                        await database.closeAsync();
                    } catch (closeError) {
                        void logger.error(
                            "database",
                            "Failed to close database after initialization error",
                            closeError,
                        );
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
                    void logger.error(
                        "database",
                        "Failed to close database",
                        closeError,
                    );
                });
            }
        };
    }, [initDatabase]);

    return { db, isInitialized, error, initDatabase };
};
