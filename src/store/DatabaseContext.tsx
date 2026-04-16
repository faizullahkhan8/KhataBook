import React, { createContext, useContext, ReactNode } from 'react';
import * as SQLite from 'expo-sqlite';
import { useDatabase } from '../hooks/useDatabase';

interface DatabaseContextType {
  db: SQLite.SQLiteDatabase | null;
  isInitialized: boolean;
  error: Error | null;
  initDatabase: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { db, isInitialized, error, initDatabase } = useDatabase();

  return (
    <DatabaseContext.Provider value={{ db, isInitialized, error, initDatabase }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
};
