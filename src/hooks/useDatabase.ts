import { useState, useEffect, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { getDatabase, initializeDatabase } from '../db/database';

export const useDatabase = () => {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initDatabase = useCallback(async () => {
    try {
      const database = await getDatabase();
      await initializeDatabase(database);
      setDb(database);
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setIsInitialized(false);
    }
  }, []);

  useEffect(() => {
    initDatabase();
  }, [initDatabase]);

  return { db, isInitialized, error, initDatabase };
};
